const jwt = require('jsonwebtoken');
const ApiKey = require('../models/ApiKey');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = req.query.token || (authHeader && authHeader.split(' ')[1]);

  if (!token) return res.status(403).json({ error: "A token is required for authentication" });

  try {
    // 1. Try resolving as a standard user JWT session
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // 2. If JWT fails, check if it's a persistent Machine Service Token (API Key)
    try {
      const apiKeyRecord = await ApiKey.findOne({ key: token });
      if (apiKeyRecord) {
        req.user = { username: apiKeyRecord.name, role: 'service_agent' };
        
        // Update "last used" timestamp asynchronously so it doesn't block the request
        apiKeyRecord.lastUsed = new Date();
        apiKeyRecord.save().catch(e => console.error("Failed to update key usage", e));
        
        return next();
      }
    } catch (dbErr) {
      console.error("DB Error checking API Key:", dbErr);
    }
  }
  
  return res.status(401).json({ error: "Invalid Token or API Key" });
};

module.exports = verifyToken;