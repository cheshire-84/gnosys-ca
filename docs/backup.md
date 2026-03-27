Here is the fully updated backup documentation. I have corrected all the directory paths to match your current `/home/glabs/gnosys-ca` setup, pointed the archiving tool specifically to your `/server` directory where the keys and `.env` live, and updated the database dump to target your V4 Mongo setup.

You can copy and paste this to replace your entire `disaster-recovery.md` or `backup.md` file!

```markdown
If the `pegasus-ca` LXC fails right now, you would lose the Root CA Private Key, the MongoDB admin accounts, and the JWT secret. Every server on the network would suddenly have orphaned, untrusted certificates once they expired. 

We are going to build **The Vault Backup**. This script will dump the MongoDB database, grab the Root CA directory, grab your `.env` secrets, package them into a single archive, and—crucially—**encrypt the entire archive using AES-256** so you can safely store it anywhere (a NAS, a cloud drive, or a USB stick) without worrying about someone stealing your master keys.

### Step 1: Create the Backup Script

SSH into your **CA server (`10.1.1.81`)**. 

We will create this script right in the `/home/glabs/gnosys-ca` directory where it can easily access the files.

```bash
sudo nano /home/glabs/gnosys-ca/gnosys-vault-backup.sh
```

Paste in the following script. **Make sure to change `<ENTER_A_STRONG_BACKUP_PASSWORD>` to a very secure password** and save it in GPass or your password manager. You will need this password if you ever have to restore the CA from scratch.

```bash
#!/bin/bash

# ==========================================
# Gnosys Labs PKI - Vault Backup Protocol
# Architecture: V4 Enterprise
# ==========================================

BACKUP_DIR="/home/glabs/gnosys-ca/backups"
APP_DIR="/home/glabs/gnosys-ca/server"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
ARCHIVE_NAME="gnosys-pki-vault_$DATE.tar.gz"
ENCRYPTED_NAME="$ARCHIVE_NAME.enc"

# The master password to unlock this backup archive
ENCRYPT_PASS="<ENTER_A_STRONG_BACKUP_PASSWORD>"

# Ensure backup directories exist
mkdir -p "$BACKUP_DIR/tmp"

echo "[1/4] Dumping MongoDB access control & registry records..."
mongodump --uri="mongodb://127.0.0.1:27017/gnosys-ca" --out="$BACKUP_DIR/tmp/mongo_dump" > /dev/null 2>&1

echo "[2/4] Archiving Vault data (Master Keys, Issued Certs, ENV secrets, and DB)..."
# Zip up the my-ca folder, the .env file, and the database dump
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" \
    -C "$APP_DIR" my-ca .env \
    -C "$BACKUP_DIR/tmp" mongo_dump > /dev/null 2>&1

echo "[3/4] Encrypting archive with AES-256-CBC..."
# Use OpenSSL to encrypt the tarball so it is safe to store off-site
openssl enc -aes-256-cbc -salt -in "$BACKUP_DIR/$ARCHIVE_NAME" -out "$BACKUP_DIR/$ENCRYPTED_NAME" -pass pass:"$ENCRYPT_PASS" -pbkdf2

echo "[4/4] Purging unencrypted temporary data and enforcing retention..."
# Securely remove the unencrypted tarball and temp folder
rm "$BACKUP_DIR/$ARCHIVE_NAME"
rm -rf "$BACKUP_DIR/tmp"

# Keep only the last 7 backups to prevent disk bloat
find "$BACKUP_DIR" -type f -name "*.enc" -mtime +7 -exec rm {} \;

echo "=========================================="
echo " VAULT SECURED: $BACKUP_DIR/$ENCRYPTED_NAME"
echo "=========================================="
```

### Step 2: Lock it Down and Test It

Make the script executable, and ensure only the `glabs` user can read it (since your encryption password is in plaintext inside the script).

```bash
sudo chmod 700 /home/glabs/gnosys-ca/gnosys-vault-backup.sh
```

Run it manually to verify the pipeline:
```bash
sudo /home/glabs/gnosys-ca/gnosys-vault-backup.sh
```

You should see the four-step process complete. If you check `/home/glabs/gnosys-ca/backups`, you will see your freshly minted `.tar.gz.enc` file sitting safely inside. 

### Step 3: Automate the Vault (Cron)

Let's tell the server to run this automatically every single night at 2:00 AM. 

1. Open the crontab:
   ```bash
   sudo crontab -e
   ```
2. Add this line to the bottom:
   ```bash
   0 2 * * * /home/glabs/gnosys-ca/gnosys-vault-backup.sh >> /var/log/gnosys-backup.log 2>&1
   ```
3. Save and exit. 

### The "Break Glass in Case of Emergency" Command

If the absolute worst happens and your server burns down, you would spin up a new Ubuntu LXC, install Node/Mongo, copy your latest `.enc` file over, and run these commands to restore your infrastructure:

**1. Decrypt and Extract:**
```bash
openssl enc -d -aes-256-cbc -in gnosys-pki-vault_DATE.tar.gz.enc -out restored-vault.tar.gz -pbkdf2
tar -xzf restored-vault.tar.gz
```

**2. Restore Files and DB:**
Move the extracted `my-ca` folder and `.env` file back into `/home/glabs/gnosys-ca/server/`. Then, restore the MongoDB data:
```bash
mongorestore --uri="mongodb://127.0.0.1:27017/" mongo_dump/
```

Once you confirm the backup script generates that encrypted file successfully, this internal PKI infrastructure is officially **100% complete**. It is secure, automated, beautifully documented, and disaster-proof!
```