const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const execPromise = util.promisify(exec);

// Path resolution (navigating up from /services to root of /server)
const CA_DIR = path.join(__dirname, '../my-ca');
const ISSUED_DIR = path.join(CA_DIR, 'issued');

if (!fs.existsSync(ISSUED_DIR)) fs.mkdirSync(ISSUED_DIR, { recursive: true });

exports.getCaPaths = () => ({ CA_DIR, ISSUED_DIR });

exports.getHistory = async () => {
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
  return certData;
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
    await execPromise(cmd, { shell: '/bin/bash' });
  } finally {
    if (fs.existsSync(extPath)) fs.unlinkSync(extPath);
  }

  return slug;
};

exports.revokeCertificate = (slug) => {
  const files = [`${slug}.crt`, `${slug}.key`, `${slug}.csr`].map(f => path.join(ISSUED_DIR, f));
  files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
};