# System Recovery & Deployment Guide

This document outlines the exact procedure for rebuilding the Pegasus-CA server from scratch on a new Ubuntu 24.04 LXC, and restoring the encrypted vault backup.

## Prerequisites
* A fresh Ubuntu 24.04 server/LXC.
* A user account named `glabs` with sudo privileges.
* The encrypted vault backup file (e.g., `gnosys-pki-vault_YYYY-MM-DD.tar.gz.enc`).

---

## Phase 1: Server Initialization

Connect to the new server as the `glabs` user and set up the core system.

### 1. Set Timezone & Locale
Ensure timestamps and cronjobs align with the primary operating region:

```bash
sudo timedatectl set-timezone America/New_York
sudo locale-gen en_US.UTF-8
sudo update-locale LANG=en_US.UTF-8
```

### 2. Install System Dependencies
Install NGINX, jq, and core utilities:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git jq nginx openssl build-essential
```

### 3. Install Node.js & PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-install -y nodejs
sudo npm install -g pm2
```

### 4. Install MongoDB

```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

---

## Phase 2: Application Provisioning

### 1. Setup the Workspace
The application must reside in the `glabs` home directory.

```bash
cd /home/glabs
git clone https://github.com/YOUR_GITHUB_USERNAME/gnosys-ca.git
cd gnosys-ca
```

### 2. Install Node Modules

```bash
cd /home/glabs/gnosys-ca/server
npm install
cd /home/glabs/gnosys-ca/client
npm install
```

---

## Phase 3: Vault Restoration (Disaster Recovery)

Transfer your encrypted backup file to `/home/glabs/gnosys-ca/server/`.

### 1. Decrypt and Extract
You will be prompted for the master vault password.

```bash
cd /home/glabs/gnosys-ca/server
openssl enc -d -aes-256-cbc -in gnosys-pki-vault_DATE.tar.gz.enc -out restored-vault.tar.gz -pbkdf2
tar -xzf restored-vault.tar.gz
```

### 2. Restore Database and Keys

```bash
# Restore the MongoDB users
mongorestore --drop --uri="mongodb://127.0.0.1:27017/gnosys-pki" mongo_dump/gnosys-pki

# Ensure the restored CA keys have strict permissions
chmod 600 my-ca/root/ca.key
```

---

## Phase 4: Production Deployment

### 1. Build & Deploy the Frontend

```bash
sudo mkdir -p /var/www/gnosys-ca
sudo chown -R www-data:www-data /var/www/gnosys-ca
cd /home/glabs/gnosys-ca/client
npm run deploy
```

### 2. Start the Backend API

```bash
cd /home/glabs/gnosys-ca/server
pm2 start index.js --name "gnosys-ca-api"
pm2 save
pm2 startup
# Run the sudo command that PM2 outputs
```

### 3. Configure NGINX
```bash
sudo nano /etc/nginx/sites-available/gnosys-ca
```

*Copy your standard NGINX configuration here (refer to the Documentation tab in the UI if needed).*

```bash
sudo ln -s /etc/nginx/sites-available/gnosys-ca /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

The Gnosys PKI is now fully restored and operational.