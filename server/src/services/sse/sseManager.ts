import { Response } from 'express';

interface SSEClient {
  id: string;
  requestId: string;
  res: Response;
}

/**
 * Server-Sent Events (SSE) Manager
 * Manages live one-way updates to requester dashboards (Section 8 & 15)
 */
class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Register a new requester SSE client
   */
  addClient(clientId: string, requestId: string, res: Response): void {
    // Write standard SSE headers
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
   * Broadcast an event to all connected clients viewing a specific request
   */
  broadcastToRequest(requestId: string, data: { type: string; payload: any }): void {
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

  getActiveClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
