const express = require('express');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middleware/auth');
const watchdogService = require('../services/watchdog.service');

// Import our new Service Layers
const pkiService = require('../services/openssl.service');
const telemetryService = require('../services/telemetry.service');

const router = express.Router();
const { CA_DIR, ISSUED_DIR } = pkiService.getCaPaths();

router.get('/download-root', (req, res) => {
  const rootCert = path.join(CA_DIR, 'root/ca.crt');
  res.download(rootCert, 'Gnosys_Root_CA.crt');
});

router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await telemetryService.getSystemStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Telemetry failure" });
  }
});

router.get('/history', verifyToken, async (req, res) => {
  try {
    const history = await pkiService.getHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to read certificate registry" });
  }
});

router.post('/issue', verifyToken, async (req, res) => {
  const { commonName, sanIp } = req.body;
  
  if (!commonName) return res.status(400).send("Common Name required");

  // Strict regex prevents command injection
  const domainRegex = /^[a-zA-Z0-9.-]+$/;
  if (!domainRegex.test(commonName)) return res.status(400).json({ error: "Invalid Common Name format." });
  if (sanIp && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(sanIp)) return res.status(400).json({ error: "Invalid IP format." });

  try {
    const slug = await pkiService.issueCertificate(commonName, sanIp);
    res.json({ message: "Certificate Issued", slug });
  } catch (err) {
    res.status(500).json({ error: "Certificate generation failed." });
  }
});

router.get('/download/:slug/:ext', verifyToken, (req, res) => {
  const { slug, ext } = req.params;
  if (ext !== 'crt' && ext !== 'key') return res.status(400).send("Invalid extension");
  
  const file = path.join(ISSUED_DIR, `${slug}.${ext}`);
  if (fs.existsSync(file)) res.download(file);
  else res.status(404).send("File not found");
});

router.delete('/revoke/:slug', verifyToken, (req, res) => {
  const { slug } = req.params;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return res.status(400).send("Invalid slug");

  try {
    pkiService.revokeCertificate(slug);
    res.json({ message: "Record Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke asset" });
  }
});

router.post('/test-webhook', verifyToken, async (req, res) => {
  try {
    await watchdogService.testWebhook();
    res.json({ message: "Webhook transmitted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;