# Gnosys Labs PKI (Pegasus-CA)

An internal, self-hosted Public Key Infrastructure (PKI) designed for secure homelab and private network management. Pegasus-CA provides a complete, automated ecosystem for generating, distributing, and managing X.509 certificates across your infrastructure.

Built on a modernized MERN stack (MongoDB, Express, React, Node.js), this platform offers a stoic, dark-mode administrative dashboard, robust access controls, and zero-touch client automation.

## 🚀 Core Features

* **Master Authority Management:** Generate and distribute a local Root CA to establish core trust across all client devices and servers.
* **Dynamic Certificate Issuance:** Request 2048-bit RSA keys and certificates with dynamic Subject Alternative Names (SANs), including optional IP address bindings.
* **Zero-Touch Automation:** Includes `gnosys-certbot.sh`, a cron-ready client agent that automatically authenticates, fetches, and renews certificates before they expire.
* **Encrypted Disaster Recovery:** Automated vault scripts securely dump the database and master keys, encrypting the archive with AES-256 for safe off-site storage.
* **Access Control:** Secured via MongoDB and JWT (JSON Web Tokens). Includes a dedicated settings panel for provisioning and revoking administrator access.
* **System Telemetry:** Real-time monitoring of CA server CPU load, memory utilization, disk fill, and uptime.
* **Live Metadata Parsing:** Automatically extracts and displays precise issuance and expiration timestamps for all active assets.

## 🛠️ Tech Stack
* **Frontend:** React 19, Vite, TailwindCSS
* **Backend:** Node.js, Express.js, Mongoose, OpenSSL
* **Database:** MongoDB
* **Infrastructure:** Ubuntu 24.04 LXC, NGINX, PM2

## 📧 Author
**Cheshire**
Contact: cheshire.84@icloud.com