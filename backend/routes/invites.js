import express from 'express';
import { param, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import auth from '../middleware/auth.js';
import Invite from '../models/Invite.js';
import TripMember from '../models/TripMember.js';

// The signed-in user's invite inbox, mounted at /api/invites
const router = express.Router();

router.use(auth);

// Loads an invite addressed to the signed-in user's email
const loadOwnInvite = async (req, res, next) => {
  try {
    if (!validationResult(req).isEmpty()) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    const invite = await Invite.findById(req.params.inviteId);
    if (!invite || invite.email.toLowerCase() !== req.user.email.toLowerCase() || invite.status !== 'pending') {
      return res.status(404).json({ error: 'Invite not found' });
    }
    req.invite = invite;
    next();
  } catch (error) {
    next(error);
  }
};

router.get('/', async (req, res) => {
  try {
    res.json(await Invite.findPendingForEmail(req.user.email));
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Failed to fetch your invites' });
  }
});

router.post('/:inviteId/accept', [param('inviteId').isInt()], loadOwnInvite, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await TripMember.add(req.invite.trip_id, req.user.id, req.invite.role, client);
    await Invite.setStatus(req.invite.id, 'accepted', client);
    await client.query('COMMIT');
    res.json({ message: 'You joined the trip', trip_id: req.invite.trip_id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept the invite' });
  } finally {
    client.release();
  }
});

router.post('/:inviteId/decline', [param('inviteId').isInt()], loadOwnInvite, async (req, res) => {
  try {
    await Invite.setStatus(req.invite.id, 'declined');
    res.json({ message: 'Invite declined' });
  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(500).json({ error: 'Failed to decline the invite' });
  }
});

export default router;
