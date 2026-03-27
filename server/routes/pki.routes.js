const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const osUtils = require('os-utils');
const disk = require('diskusage');
const util = require('util');
const crypto = require('crypto'); // <-- Added crypto for thread-safe file generation
const execPromise = util.promisify(exec);
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Adjust path to point back to the root directory
const CA_DIR = path.join(__dirname, '../my-ca');
const ISSUED_DIR = path.join(CA_DIR, 'issued');

if (!fs.existsSync(ISSUED_DIR)) fs.mkdirSync(ISSUED_DIR, { recursive: true });

router.get('/download-root', (req, res) => {
  const rootCert = path.join(CA_DIR, 'root/ca.crt');
  res.download(rootCert, 'Gnosys_Root_CA.crt');
});

router.get('/stats', verifyToken, async (req, res) => {
  osUtils.cpuUsage((cpuPercent) => {
    try {
      const pathToCheck = os.platform() === 'win32' ? 'c:' : '/';
      const diskInfo = disk.checkSync(pathToCheck);
      
      res.json({
        cpu: (cpuPercent * 100).toFixed(1),
        mem: (100 - (os.freemem() / os.totalmem() * 100)).toFixed(1),
        disk: (100 - (diskInfo.available / diskInfo.total * 100)).toFixed(1),
        uptime: Math.floor(os.uptime() / 3600),
        load: os.loadavg()[0].toFixed(2)
      });
    } catch (err) {
      res.status(500).json({ error: "Telemetry failure" });
    }
  });
});

router.get('/history', verifyToken, async (req, res) => {
  try {
    const files = fs.readdirSync(ISSUED_DIR);
    const crtFiles = files.filter(f => f.endsWith('.crt'));
    const certData = [];

    for (const file of crtFiles) {
      const slug = file.replace('.crt', '');
      const crtPath = path.join(ISSUED_DIR, file);
      
      try {
        const { stdout } = await execPromise(`openssl x509 -in ${crtPath} -noout -dates`);
        const lines = stdout.split('\n');
        const issued = lines.find(l => l.startsWith('notBefore='))?.split('=')[1] || 'Unknown';
        const expires = lines.find(l => l.startsWith('notAfter='))?.split('=')[1] || 'Unknown';

        certData.push({ slug, commonName: slug.replace(/_/g, '.'), issued, expires });
      } catch (err) {
        certData.push({ slug, commonName: slug.replace(/_/g, '.'), issued: 'Error', expires: 'Error' });
      }
    }
    res.json(certData);
  } catch (err) {
    res.status(500).json({ error: "Directory read error" });
  }
});

router.post('/issue', verifyToken, (req, res) => {
  const { commonName, sanIp } = req.body;
  if (!commonName) return res.status(400).send("Common Name required");

  // Strict regex prevents command injection via the inputs
  const domainRegex = /^[a-zA-Z0-9.-]+$/;
  if (!domainRegex.test(commonName)) return res.status(400).json({ error: "Invalid Common Name format." });
  if (sanIp && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(sanIp)) return res.status(400).json({ error: "Invalid IP format." });

  const slug = commonName.replace(/\./g, '_');
  const uniqueId = crypto.randomUUID(); // <-- Unique ID prevents concurrency overwrites
  
  const keyPath = path.join(ISSUED_DIR, `${slug}.key`);
  const csrPath = path.join(ISSUED_DIR, `${slug}.csr`);
  const crtPath = path.join(ISSUED_DIR, `${slug}.crt`);
  const extPath = path.join(ISSUED_DIR, `${slug}-${uniqueId}.ext`); // <-- Thread-safe filename

  let sanString = `subjectAltName=DNS:${commonName},DNS:*.${commonName}`;
  if (sanIp) sanString += `,IP:${sanIp}`;

  fs.writeFileSync(extPath, sanString);

  // Removed the chained `rm ${extPath}` from the Bash execution to prevent shell manipulation risks
  const cmd = `openssl genrsa -out ${keyPath} 2048 && \
               openssl req -new -key ${keyPath} -subj "/C=US/O=Gnosys Labs/CN=${commonName}" -out ${csrPath} && \
               openssl x509 -req -in ${csrPath} \
               -CA ${CA_DIR}/root/ca.crt -CAkey ${CA_DIR}/root/ca.key \
               -CAcreateserial -out ${crtPath} -days 365 -sha256 \
               -extfile ${extPath}`;

  exec(cmd, { shell: '/bin/bash' }, (err) => {
    // Safely clean up the unique extension file via Node, not Bash
    if (fs.existsSync(extPath)) {
      fs.unlinkSync(extPath);
    }
    
    if (err) {
      return res.status(500).json({ error: "Certificate generation failed." });
    }
    res.json({ message: "Certificate Issued", slug });
  });
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

  const files = [`${slug}.crt`, `${slug}.key`, `${slug}.csr`].map(f => path.join(ISSUED_DIR, f));
  files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
  res.json({ message: "Record Deleted" });
});

module.exports = router;