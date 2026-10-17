import express from 'express';
import { body, param, validationResult } from 'express-validator';
import requireTripRole from '../middleware/tripAccess.js';
import TripMember from '../models/TripMember.js';
import Invite from '../models/Invite.js';
import ItineraryItem from '../models/ItineraryItem.js';
import db from '../config/database.js';

// Group membership, invites and activity votes. Mounted by routes/trips.js after `auth`.
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get('/:tripId/invites', requireTripRole('viewer'), async (req, res) => {
  try {
    res.json(await Invite.findPendingForTrip(req.params.tripId));
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// Invite someone by email. They see it in their inbox now, or after signing up with that address.
router.post(
  '/:tripId/invites',
  requireTripRole('editor'),
  [
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail({ gmail_remove_dots: false }),
    body('role').optional().isIn(['editor', 'viewer'])
  ],
  validate,
  async (req, res) => {
    try {
      const tripId = Number(req.params.tripId);
      const { email } = req.body;
      // Only the organiser can hand out edit rights
      const role = req.tripRole === 'owner' ? req.body.role || 'editor' : 'viewer';

      const { rows: [existingMember] } = await db.query(
        'SELECT 1 FROM trip_members m JOIN users u ON u.id = m.user_id WHERE m.trip_id = $1 AND lower(u.email) = lower($2)',
        [tripId, email]
      );
      if (existingMember) {
        return res.status(400).json({ error: 'That person is already in the group' });
      }
      if (await Invite.findPending(tripId, email)) {
        return res.status(400).json({ error: 'That person already has an invite waiting' });
      }

      const invite = await Invite.create({ trip_id: tripId, email, role, invited_by: req.user.id });
      res.status(201).json(invite);
    } catch (error) {
      console.error('Create invite error:', error);
      res.status(500).json({ error: 'Failed to send the invite' });
    }
  }
);

router.delete('/:tripId/invites/:inviteId', requireTripRole('editor'), [param('inviteId').isInt()], validate, async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.inviteId);
    if (!invite || invite.trip_id !== Number(req.params.tripId)) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    await Invite.delete(invite.id);
    res.json({ message: 'Invite cancelled' });
  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({ error: 'Failed to cancel the invite' });
  }
});

// The organiser changes someone's role
router.patch(
  '/:tripId/members/:userId',
  requireTripRole('owner'),
  [param('userId').isInt().toInt(), body('role').isIn(['editor', 'viewer'])],
  validate,
  async (req, res) => {
    try {
      if (req.params.userId === req.user.id) {
        return res.status(400).json({ error: "The organiser's role cannot be changed" });
      }
      const member = await TripMember.updateRole(req.params.tripId, req.params.userId, req.body.role);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json(member);
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({ error: 'Failed to change the role' });
    }
  }
);

// The organiser removes someone, or a member leaves. The organiser cannot leave their own trip.
router.delete('/:tripId/members/:userId', requireTripRole('viewer'), [param('userId').isInt().toInt()], validate, async (req, res) => {
  try {
    const isSelf = req.params.userId === req.user.id;
    if (!isSelf && req.tripRole !== 'owner') {
      return res.status(403).json({ error: 'Only the organiser can remove people' });
    }
    const removed = await TripMember.remove(req.params.tripId, req.params.userId);
    if (!removed) {
      return res.status(400).json({ error: isSelf ? 'The organiser cannot leave the trip' : 'Member not found' });
    }
    res.json({ message: isSelf ? 'You left the trip' : 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove the member' });
  }
});

// Thumbs up (1), thumbs down (-1) or clear (0). Every member can vote.
router.put(
  '/:tripId/items/:itemId/vote',
  requireTripRole('viewer'),
  [param('itemId').isInt().toInt(), body('vote').isIn([-1, 0, 1]).toInt()],
  validate,
  async (req, res) => {
    try {
      const item = await ItineraryItem.findById(req.params.itemId);
      if (!item || item.trip_id !== Number(req.params.tripId)) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      if (req.body.vote === 0) {
        await db.query('DELETE FROM activity_votes WHERE item_id = $1 AND user_id = $2', [item.id, req.user.id]);
      } else {
        await db.query(
          `INSERT INTO activity_votes (item_id, user_id, vote) VALUES ($1, $2, $3)
           ON CONFLICT (item_id, user_id) DO UPDATE SET vote = EXCLUDED.vote`,
          [item.id, req.user.id, req.body.vote]
        );
      }
      const { rows: [tally] } = await db.query(
        'SELECT COALESCE(SUM(vote), 0)::int AS score FROM activity_votes WHERE item_id = $1',
        [item.id]
      );
      res.json({ item_id: item.id, score: tally.score, my_vote: req.body.vote });
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ error: 'Failed to save your vote' });
    }
  }
);

export default router;
