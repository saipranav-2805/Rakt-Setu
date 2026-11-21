import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { RequestModel } from '../models/Request.js';
import { User } from '../models/User.js';
import { appendAuditEvent } from '../services/audit/hashChain.js';

/**
 * Admin Moderation Queue (Section 15)
 * Returns flagged and high-risk requests
 */
export async function getFlaggedRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  const requests = await RequestModel.find({
    $or: [{ riskScore: { $gte: 50 } }, { state: 'VERIFYING' }]
  })
    .populate('requesterId', 'name phone trustScore')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    requests
  });
}

/**
 * Ban abusive user (Section 15)
 */
export async function banUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { reason } = req.body;
  const admin = req.user!;

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  user.status = 'banned';
  await user.save();

  // Cancel any active requests by this user
  await RequestModel.updateMany(
    { requesterId: user._id, state: { $in: ['DRAFT', 'VERIFYING', 'OPEN', 'MATCHING'] } },
    { $set: { state: 'REJECTED' } }
  );

  await appendAuditEvent({
    actor: admin._id.toString(),
    type: 'USER_BANNED',
    payload: { bannedUserId: user._id, reason: reason || 'Platform violation' }
  });

  res.status(200).json({
    success: true,
    message: `User ${user.phone} has been banned.`
  });
}
