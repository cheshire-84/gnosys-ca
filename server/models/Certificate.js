const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  commonName: { type: String, required: true },
  sanIp: { type: String },
  issuedAt: { type: String, required: true },
  expiresAt: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Certificate', certificateSchema);