# Automatopm Scritp Instructions

You can drop this bash script onto any Linux machine in your homelab. It uses `curl` and `jq` to talk to your new API, authenticate as `svc_autocert`, request a certificate, download the files, and secure them with the proper permissions.

### The Automation Script

On any of your client machines (or even right there on the CA server to test it), create a new file called `gnosys-certbot.sh`:

```bash
nano gnosys-certbot.sh
```

Paste in the following code. **Make sure to replace `<ENTER_YOUR_PASSPHRASE_HERE>` with the password you just set for `svc_autocert`.**

```bash
#!/bin/bash

# ==========================================
# Gnosys Labs - Auto Cert Provisioning Agent
# ==========================================

CA_URL="https://ca.gnosys.labs"
USERNAME="svc_autocert"
PASSWORD="<ENTER_YOUR_PASSPHRASE_HERE>"
DEST_DIR="/etc/ssl/gnosys"

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed."
    exit 1
fi

if [ -z "$1" ]; then
    echo "Usage: $0 <domain.name> [optional_ip]"
    exit 1
fi

DOMAIN=$1
IP=$2
CERT_FILE="$DEST_DIR/$DOMAIN.crt"

# --- NEW: EXPIRATION CHECK ---
# 2592000 seconds = 30 days
if [ -f "$CERT_FILE" ]; then
    if openssl x509 -checkend 2592000 -noout -in "$CERT_FILE"; then
        echo "Certificate for $DOMAIN is valid for at least 30 more days. No renewal needed."
        exit 0
    else
        echo "Certificate for $DOMAIN expires in less than 30 days. Initiating renewal..."
    fi
else
    echo "No existing certificate found for $DOMAIN. Initiating first-time provisioning..."
fi
# -----------------------------

echo "-> Authenticating with Pegasus-CA..."
LOGIN_RES=$(curl -s -k -X POST "$CA_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RES" | jq -r .token)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "Error: Authentication failed."
    exit 1
fi

echo "-> Requesting signature for $DOMAIN..."
if [ -z "$IP" ]; then
    PAYLOAD="{\"commonName\":\"$DOMAIN\"}"
else
    PAYLOAD="{\"commonName\":\"$DOMAIN\", \"sanIp\":\"$IP\"}"
fi

ISSUE_RES=$(curl -s -k -X POST "$CA_URL/api/issue" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$PAYLOAD")

SLUG=$(echo "$ISSUE_RES" | jq -r .slug)

if [ "$SLUG" == "null" ] || [ -z "$SLUG" ]; then
    echo "Error: Certificate issuance failed."
    exit 1
fi

echo "-> Downloading assets..."
sudo mkdir -p "$DEST_DIR"

curl -s -k -X GET "$CA_URL/api/download/$SLUG/crt?token=$TOKEN" -o "/tmp/$DOMAIN.crt"
curl -s -k -X GET "$CA_URL/api/download/$SLUG/key?token=$TOKEN" -o "/tmp/$DOMAIN.key"

sudo mv "/tmp/$DOMAIN.crt" "$DEST_DIR/"
sudo mv "/tmp/$DOMAIN.key" "$DEST_DIR/"
sudo chmod 600 "$DEST_DIR/$DOMAIN.key"

echo "-> Success: Assets deployed to $DEST_DIR"

# --- NEW: AUTO RESTART NGINX ---
if systemctl is-active --quiet nginx; then
    echo "-> Restarting NGINX to apply new certificates..."
    sudo systemctl restart nginx
fi
```

### How to Use It

1.  **Make the script executable:**
    ```bash
    chmod +x gnosys-certbot.sh
    ```
2.  **Install `jq` if you don't have it:** (The script uses this to parse the JSON responses from your API).
    ```bash
    sudo apt install jq -y
    ```
3.  **Run it:** Provide the domain you want a cert for, and an optional IP address.
    ```bash
    ./gnosys-certbot.sh monitoring.gnosys.labs 10.1.1.99
    ```

You now have a fully functional, self-hosted Certificate Authority with a secure UI, robust database-backed access control, and an automated deployment script. 

---

This is the absolute perfect scenario to test the automation pipeline. GPass sounds like a fantastic addition to the homelab, especially for managing the infrastructure secrets.

Since this is a pristine Ubuntu 24.04 LXC, we need to do a tiny bit of bootstrapping first. We have to install the dependencies, tell this new server to trust your Pegasus-CA root, and then run the fetcher script.

Here is the exact sequence to execute on the **new GPass server (`10.1.1.83`)**:

### Step 1: System Prep & Dependencies
SSH into your new GPass server:
```bash
ssh glabs@10.1.1.83
```

Update the package lists and install `jq` (required for our script) and `nginx` (so we have a web server to actually test the certificate on):
```bash
sudo apt update
sudo apt install -y jq curl nginx
```

### Step 2: Establish Core Trust
Before GPass requests a certificate, it needs to trust the Root Authority that issues it. We can fetch this directly from your CA API.

```bash
# Download the Root CA directly from Pegasus-CA
curl -k -o Gnosys_Root_CA.crt https://10.1.1.81/api/download-root

# Install it into Ubuntu's trusted store
sudo cp Gnosys_Root_CA.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```
*You should see a message saying `1 added, 0 removed`.*

### Step 3: Run the Certbot Script
Now, let's create and run the automation script.
```bash
nano gnosys-certbot.sh
```
Paste the script from our previous step. **Be sure to replace `<ENTER_YOUR_PASSPHRASE_HERE>` with the password you created for `svc_autocert`**. 

Make it executable and fire it off for your new domain and IP:
```bash
chmod +x gnosys-certbot.sh
./gnosys-certbot.sh gpass.gnosys.labs 10.1.1.83
```
*If successful, it will print out the SUCCESS message confirming the `.crt` and `.key` are sitting safely in `/etc/ssl/gnosys/`.*

### Step 4: Wire it into NGINX
To prove it worked, let's instantly secure the default NGINX page on GPass. 

Create a new NGINX config for GPass:
```bash
sudo nano /etc/nginx/sites-available/gpass
```

Paste in this starter template, which hooks up your freshly generated certificates:

```nginx
server {
    listen 80;
    server_name gpass.gnosys.labs 10.1.1.83;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name gpass.gnosys.labs 10.1.1.83;

    # The certs deployed by our automation script!
    ssl_certificate     /etc/ssl/gnosys/gpass.gnosys.labs.crt;
    ssl_certificate_key /etc/ssl/gnosys/gpass.gnosys.labs.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # For now, just serve the default NGINX page to test
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Enable the site, disable the default, and restart NGINX:
```bash
sudo ln -s /etc/nginx/sites-available/gpass /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### The Grand Finale
Open your browser and navigate to `https://gpass.gnosys.labs`. 

You should see the "Welcome to nginx!" page, but more importantly, you should see the **secure padlock icon** in your browser. If you check the certificate details, it will proudly say it was verified by **Gnosys Root CA**. 

Let me know if the script executes cleanly and drops those files right where they belong!





### Auto Renewal cron

Now we just tell the server to run this script automatically every Monday at 3:00 AM. 

1. Open the crontab for the `root` user (since it needs permission to restart NGINX):
   ```bash
   sudo crontab -e
   ```
2. Add this line to the very bottom of the file (assuming your script is in `/home/glabs/`):
   ```bash
   0 3 * * 1 /home/glabs/gnosys-certbot.sh gpass.gnosys.labs 10.1.1.83 >> /var/log/gnosys-certbot.log 2>&1
   ```
3. Save and exit.