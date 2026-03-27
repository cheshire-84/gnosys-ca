const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// --- DEFINE THE LOGIN LIMITER ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: { error: "Maximum authorization attempts exceeded. Terminal locked for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/status', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ setupRequired: count === 0 });
  } catch (err) {
    res.status(500).json({ error: "Database Link Severed" });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.status(403).json({ error: "System already initialized" });

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Credentials required" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.json({ message: "Master Authority Established" });
  } catch (err) {
    res.status(500).json({ error: "Initialization Failed" });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid Authorization Code" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ error: "Invalid Authorization Code" });

    const token = jwt.sign({ _id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Authentication Processing Error" });
  }
});

router.get('/users', verifyToken, async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

router.post('/users', verifyToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Credentials required" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    
    res.json({ message: `Admin ${username} added.` });
  } catch (err) {
    res.status(500).json({ error: "User creation failed (Duplicate name?)" });
  }
});

router.delete('/users/:id', verifyToken, async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count <= 1) return res.status(400).json({ error: "Cannot delete the final Master Admin." });
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Admin privileges revoked." });
  } catch (err) {
    res.status(500).json({ error: "Revocation failed" });
  }
});

// --- SERVICE TOKEN (API KEY) MANAGEMENT ROUTES ---
router.get('/api-keys', verifyToken, async (req, res) => {
  try {
    // Return keys for the UI, but DO NOT send the actual 'key' secret string back
    const keys = await ApiKey.find({}, '-key'); 
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
});

router.post('/api-keys', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Agent name required" });

    // Generate a secure, 64-character hex token string
    const rawKey = 'pk_ca_' + crypto.randomBytes(32).toString('hex');
    
    const newKey = new ApiKey({ name, key: rawKey });
    await newKey.save();

    // Return the raw key ONCE so the UI can display it for the user to copy
    res.json({ message: "Key created", key: rawKey, name: newKey.name, _id: newKey._id });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate API key" });
  }
});

router.delete('/api-keys/:id', verifyToken, async (req, res) => {
  try {
    await ApiKey.findByIdAndDelete(req.params.id);
    res.json({ message: "API Key Revoked" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

module.exports = router;