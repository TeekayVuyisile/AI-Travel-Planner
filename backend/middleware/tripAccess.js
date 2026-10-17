import TripMember, { ROLE_RANK } from '../models/TripMember.js';

// Requires `auth` to have run first. Non-members get 404 so trip ids aren't leaked.
const requireTripRole = (minRole = 'viewer') => async (req, res, next) => {
  try {
    const tripId = Number(req.params.tripId);
    if (!Number.isInteger(tripId)) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const role = await TripMember.findRole(tripId, req.user.id);
    if (!role) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      return res.status(403).json({ error: `This action requires the ${minRole} role` });
    }

    req.tripRole = role;
    next();
  } catch (error) {
    next(error);
  }
};

export default requireTripRole;
