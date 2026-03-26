const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  let token;
  const authHeader = req.headers['authorization'];
  
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) return res.status(401).json({ error: "Access Denied: Terminal Locked" });

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or Expired Token" });
  }
};

module.exports = verifyToken;