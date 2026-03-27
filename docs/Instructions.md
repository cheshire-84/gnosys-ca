# Automation Script Instructions (V4 Enterprise)

You can drop this bash script onto any Linux machine in your homelab. It uses a **Service Token** generated from your Admin Panel to authenticate with Pegasus-CA, request a certificate, download the files, and secure them with the proper permissions.

### The Automation Script

On any of your client machines, create a new file called `gnosys-certbot.sh`:

```bash
nano gnosys-certbot.sh
```

Paste in the following code. **Make sure to generate a Service Token from the "Machine Automation" section of your Pegasus-CA Admin Panel, and paste it where indicated.**

```bash
#!/bin/bash

# ==========================================
# Gnosys Labs - Auto Cert Provisioning Agent
# [ V4 SECURE TOKEN EDITION ]
# ==========================================

CA_URL="[https://ca.gnosys.labs](https://ca.gnosys.labs)"
DEST_DIR="/etc/ssl/gnosys"

# PASTE YOUR GENERATED SERVICE TOKEN HERE
TOKEN="<PASTE_YOUR_GENERATED_SERVICE_TOKEN_HERE>"

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

# --- EXPIRATION CHECK ---
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

if [ -z "$TOKEN" ] || [[ "$TOKEN" == "<PASTE"* ]]; then
    echo "Error: You must insert a valid Service Token into the script."
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
    echo "Error: Certificate issuance failed. Is the token valid?"
    echo "API Response: $ISSUE_RES"
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

# --- AUTO RESTART NGINX ---
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

---

## Real-World Deployment Example: GPass Node

This is the exact sequence to execute on a brand new server (e.g., your **GPass server `10.1.1.83`**) to securely bootstrap it onto the PKI network.

### Step 1: System Prep & Dependencies
SSH into your new server:
```bash
ssh glabs@10.1.1.83
```

Update the package lists and install `jq` and `nginx`:
```bash
sudo apt update
sudo apt install -y jq curl nginx
```

### Step 2: Establish Core Trust
Before the server requests a certificate, it needs to trust the Root Authority that issues it. We fetch this directly from your CA API.

```bash
# Download the Root CA directly from Pegasus-CA
curl -k -o Gnosys_Root_CA.crt [https://ca.gnosys.labs/api/download-root](https://ca.gnosys.labs/api/download-root)

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
Paste the script from above. **Remember to paste your Service Token into the `TOKEN=` variable**. 

Make it executable and fire it off for your new domain and IP:
```bash
chmod +x gnosys-certbot.sh
./gnosys-certbot.sh gpass.gnosys.labs 10.1.1.83
```
*If successful, it will print out a SUCCESS message confirming the `.crt` and `.key` are sitting safely in `/etc/ssl/gnosys/`.*

### Step 4: Wire it into NGINX

Create a new NGINX config for the service:
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

### Step 5: Auto Renewal Cronjob

Now we just tell the server to run this script automatically every Monday at 3:00 AM to check for upcoming expirations. 

1. Open the crontab for the `root` user (since it needs permission to restart NGINX):
   ```bash
   sudo crontab -e
   ```
2. Add this line to the very bottom of the file (assuming your script is in `/home/glabs/`):
   ```bash
   0 3 * * 1 /home/glabs/gnosys-certbot.sh gpass.gnosys.labs 10.1.1.83 >> /var/log/gnosys-certbot.log 2>&1
   ```
3. Save and exit. The server will now seamlessly maintain its own cryptographic trust forever.
