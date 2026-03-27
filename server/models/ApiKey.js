const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date }
});

module.exports = mongoose.model('ApiKey', apiKeySchema);