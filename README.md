# Gnosys Labs PKI (Pegasus-CA)

An internal, self-hosted Public Key Infrastructure (PKI) designed for secure homelab and private network management. Pegasus-CA provides a complete, automated ecosystem for generating, distributing, and managing X.509 certificates across your infrastructure.

Built on a modernized MERN stack (MongoDB, Express, React, Node.js), this **V4 Enterprise** platform offers a stoic, dark-mode administrative dashboard, robust machine-access controls, and zero-touch client automation.

## 🚀 Core Features

* **Master Authority Management:** Generate and distribute a local Root CA to establish core trust across all client devices and servers.
* **Dynamic Certificate Issuance:** Request 2048-bit RSA keys and certificates with dynamic Subject Alternative Names (SANs), including optional IP address bindings.
* **Proactive Observability (Watchdog):** A centralized Node.js cron service continuously audits the database registry and fires Discord Webhooks to alert administrators 30 days prior to any asset expiration.
* **Zero-Touch Automation:** Includes `gnosys-certbot.sh`, a headless client agent that uses dedicated **Service Tokens (API Keys)** to securely authenticate, fetch, and renew certificates before they expire.
* **Access Control & Security:** Secured via JWT (JSON Web Tokens) and MongoDB. The API is hardened against brute-force attacks via `express-rate-limit`, secured with `helmet` HTTP headers, and NGINX logs are actively scrubbed of session secrets.
* **Encrypted Disaster Recovery:** Automated vault scripts securely dump the MongoDB registry and master cryptographic keys, encrypting the archive with AES-256-CBC for safe off-site storage.
* **High-Performance Registry:** Issued assets are mapped to a MongoDB database, allowing the UI to instantly load historical records without taxing the server's CPU with continuous OpenSSL filesystem parsing.
* **System Telemetry:** Real-time monitoring of CA server CPU load, memory utilization, disk fill, and uptime.

## 🛠️ Tech Stack
* **Frontend:** React 19, Vite, TailwindCSS, Lucide Icons
* **Backend:** Node.js, Express.js, Mongoose, OpenSSL
* **Security Layer:** Helmet, Express-Rate-Limit, Node-Cron
* **Database:** MongoDB
* **Infrastructure:** Ubuntu 24.04 LXC, NGINX, PM2

## 📧 Author
**Cheshire**
Contact: cheshire.84@icloud.com