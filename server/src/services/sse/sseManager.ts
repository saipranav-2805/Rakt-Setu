import { Response } from 'express';
import { Redis } from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

interface SSEClient {
  id: string;
  requestId: string;
  res: Response;
}

/**
 * Server-Sent Events (SSE) Manager with Distributed Redis Pub/Sub
 * Ensures both API and background Worker containers can broadcast live events
 */
class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor() {
    try {
      this.pubClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        lazyConnect: true
      });
      this.subClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        lazyConnect: true
      });

      this.pubClient.connect().catch((err) => {
        console.warn('[SSEManager] Redis pub connect warning:', err.message);
      });

      this.subClient.connect().then(() => {
        this.subClient?.subscribe('raktsetu:sse:broadcast');
        this.subClient?.on('message', (channel, message) => {
          if (channel === 'raktsetu:sse:broadcast') {
            try {
              const { requestId, data } = JSON.parse(message);
              this.sendToLocalClients(requestId, data);
            } catch (err) {
              console.error('[SSEManager] Error parsing distributed SSE message:', err);
            }
          }
        });
      }).catch((err) => {
        console.warn('[SSEManager] Redis sub connect warning:', err.message);
      });
    } catch (err: any) {
      console.warn('[SSEManager] Redis init warning:', err.message);
    }
  }

  /**
   * Register a new requester SSE client
   */
  addClient(clientId: string, requestId: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable proxy buffering (Nginx)
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date() })}\n\n`);

    this.clients.set(clientId, { id: clientId, requestId, res });

    // Handle connection closure
    res.on('close', () => {
      this.removeClient(clientId);
    });
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Push directly to in-memory HTTP responses in this process
   */
  sendToLocalClients(requestId: string, data: { type: string; payload: any }): void {
    const message = `data: ${JSON.stringify(data)}\n\n`;

    for (const client of this.clients.values()) {
      if (client.requestId === requestId) {
        try {
          client.res.write(message);
        } catch (err) {
          console.error(`Failed to push SSE message to client ${client.id}:`, err);
        }
      }
    }
  }

  /**
   * Broadcast an event to all connected clients across all containers (via Redis)
   */
  broadcastToRequest(requestId: string, data: { type: string; payload: any }): void {
    // 1. Deliver to local clients in this Node.js process
    this.sendToLocalClients(requestId, data);

    // 2. Publish to Redis so all other container processes (API/Worker) also deliver to their local clients
    if (this.pubClient && (this.pubClient.status === 'ready' || this.pubClient.status === 'connect')) {
      this.pubClient.publish('raktsetu:sse:broadcast', JSON.stringify({ requestId, data })).catch((err) => {
        console.warn('[SSEManager] Failed to publish event to Redis:', err.message);
      });
    }
  }

  getActiveClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
