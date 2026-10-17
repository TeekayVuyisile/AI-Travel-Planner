import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Input validation
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
];

const signToken = (user) => jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

// Register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name } = req.body;

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({ email, password, first_name, last_name });

    const token = signToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: User.toPublic(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: User.toPublic(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Demo accounts for the portfolio demo: list them, and log in as one without a password
router.get('/demo-users', async (req, res) => {
  try {
    res.json(await User.findDemoUsers());
  } catch (error) {
    console.error('Demo users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/demo', async (req, res) => {
  try {
    const demoUsers = await User.findDemoUsers();
    if (demoUsers.length === 0) {
      return res.status(503).json({ error: 'Demo mode is not set up. Run npm run seed in the backend.' });
    }

    const user = req.body.userId
      ? demoUsers.find(u => u.id === Number(req.body.userId))
      : demoUsers[0];
    if (!user) {
      return res.status(404).json({ error: 'Demo user not found' });
    }

    res.json({ message: 'Login successful', token: signToken(user), user });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;