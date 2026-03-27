const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const execPromise = util.promisify(exec);
const Certificate = require('../models/Certificate');

const CA_DIR = path.join(__dirname, '../my-ca');
const ISSUED_DIR = path.join(CA_DIR, 'issued');

if (!fs.existsSync(ISSUED_DIR)) fs.mkdirSync(ISSUED_DIR, { recursive: true });

exports.getCaPaths = () => ({ CA_DIR, ISSUED_DIR });

// --- AUTO-SYNC: Imports existing filesystem certs into MongoDB on startup ---
exports.syncRegistry = async () => {
  console.log("-> Syncing filesystem registry with MongoDB...");
  const files = fs.readdirSync(ISSUED_DIR).filter(f => f.endsWith('.crt'));
  
  for (const file of files) {
    const slug = file.replace('.crt', '');
    const exists = await Certificate.findOne({ slug });
    
    if (!exists) {
      const crtPath = path.join(ISSUED_DIR, file);
      try {
        const { stdout } = await execPromise(`openssl x509 -in ${crtPath} -noout -dates`);
        const lines = stdout.split('\n');
        const issuedAt = lines.find(l => l.startsWith('notBefore='))?.split('=')[1] || 'Unknown';
        const expiresAt = lines.find(l => l.startsWith('notAfter='))?.split('=')[1] || 'Unknown';

        await Certificate.create({
          slug,
          commonName: slug.replace(/_/g, '.'),
          issuedAt,
          expiresAt
        });
        console.log(`Synced missing record: ${slug}`);
      } catch (err) {
        console.error(`Failed to sync ${slug}`, err);
      }
    }
  }
};

// --- OPTIMIZED HISTORY: Reads instantly from DB instead of running Bash commands ---
exports.getHistory = async () => {
  const certs = await Certificate.find().sort({ createdAt: -1 });
  // Map MongoDB documents back to the format the React UI expects
  return certs.map(c => ({
    slug: c.slug,
    commonName: c.commonName,
    issued: c.issuedAt,
    expires: c.expiresAt
  }));
};

exports.issueCertificate = async (commonName, sanIp) => {
  const slug = commonName.replace(/\./g, '_');
  const uniqueId = crypto.randomUUID();
  
  const keyPath = path.join(ISSUED_DIR, `${slug}.key`);
  const csrPath = path.join(ISSUED_DIR, `${slug}.csr`);
  const crtPath = path.join(ISSUED_DIR, `${slug}.crt`);
  const extPath = path.join(ISSUED_DIR, `${slug}-${uniqueId}.ext`);

  let sanString = `subjectAltName=DNS:${commonName},DNS:*.${commonName}`;
  if (sanIp) sanString += `,IP:${sanIp}`;

  fs.writeFileSync(extPath, sanString);

  const cmd = `openssl genrsa -out ${keyPath} 2048 && \
               openssl req -new -key ${keyPath} -subj "/C=US/O=Gnosys Labs/CN=${commonName}" -out ${csrPath} && \
               openssl x509 -req -in ${csrPath} \
               -CA ${CA_DIR}/root/ca.crt -CAkey ${CA_DIR}/root/ca.key \
               -CAcreateserial -out ${crtPath} -days 365 -sha256 \
               -extfile ${extPath}`;

  try {
    // 1. Generate the files via OpenSSL
    await execPromise(cmd, { shell: '/bin/bash' });
    
    // 2. Parse the exact dates from the newly created certificate
    const { stdout } = await execPromise(`openssl x509 -in ${crtPath} -noout -dates`);
    const lines = stdout.split('\n');
    const issuedAt = lines.find(l => l.startsWith('notBefore='))?.split('=')[1] || 'Unknown';
    const expiresAt = lines.find(l => l.startsWith('notAfter='))?.split('=')[1] || 'Unknown';

    // 3. Save to MongoDB
    await Certificate.findOneAndUpdate(
      { slug }, 
      { slug, commonName, sanIp, issuedAt, expiresAt, createdAt: new Date() },
      { upsert: true, new: true }
    );

  } finally {
    if (fs.existsSync(extPath)) fs.unlinkSync(extPath);
  }

  return slug;
};

exports.revokeCertificate = async (slug) => {
  // 1. Delete Files
  const files = [`${slug}.crt`, `${slug}.key`, `${slug}.csr`].map(f => path.join(ISSUED_DIR, f));
  files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
  
  // 2. Delete from DB
  await Certificate.findOneAndDelete({ slug });
};