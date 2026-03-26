export default function DocumentationPanel() {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12 pb-20">
      
      {/* 01. NEW SERVER PREP */}
      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">01. Server Initialization (Ubuntu/Debian)</h2>
        <div className="bg-stoic-gray border border-stoic-border p-6">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Core Dependencies & Timezone</h4>
          <pre className="bg-black p-4 font-mono text-[11px] text-gray-500 border border-stoic-border leading-relaxed overflow-x-auto">
{`# 1. Set Timezone to EST (New York)
sudo timedatectl set-timezone America/New_York

# 2. Install Required Packages
sudo apt update
sudo apt install -y jq curl nginx`}
          </pre>
        </div>
      </section>

      {/* 02. ROOT AUTHORITY */}
      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">02. Trust Establishment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-stoic-gray border border-stoic-border p-6">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Client OS: Windows</h4>
            <div className="text-xs space-y-3 text-gray-400 font-mono">
              <p className="text-white border-b border-gray-800 pb-1 inline-block">Workflow:</p>
              <ul className="list-none space-y-1">
                <li>&gt; Navigate to https://ca.gnosys.labs</li>
                <li>&gt; Click "Download Root CA"</li>
                <li>&gt; Store: Local Machine</li>
                <li>&gt; Target: Trusted Root Certification Authorities</li>
              </ul>
            </div>
          </div>
          <div className="bg-stoic-gray border border-stoic-border p-6">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Server OS: Ubuntu LXC/VM</h4>
            <pre className="bg-black p-4 font-mono text-[11px] text-gray-500 border border-stoic-border leading-relaxed overflow-x-auto">
{`# 1. Fetch Root CA from API
curl -k -o Gnosys_Root_CA.crt https://ca.gnosys.labs/api/download-root

# 2. Update system trust store
sudo cp Gnosys_Root_CA.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates`}
            </pre>
          </div>
        </div>
      </section>

      {/* 03. AUTOMATION SCRIPT */}
      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">03. Automated Provisioning Agent</h2>
        <div className="bg-stoic-gray border border-stoic-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">gnosys-certbot.sh</h4>
            <span className="text-[9px] text-green-900 font-mono uppercase tracking-widest border border-green-900 px-2 py-1">CRON-Ready</span>
          </div>
          <p className="text-xs text-gray-500 font-mono mb-4">Usage: <code className="text-white">./gnosys-certbot.sh &lt;domain.name&gt; [optional_ip]</code></p>
          <pre className="bg-black p-4 font-mono text-[10px] text-gray-400 border border-stoic-border leading-relaxed overflow-x-auto">
{`#!/bin/bash

# ==========================================
# Gnosys Labs - Auto Cert Provisioning Agent
# ==========================================

CA_URL="https://ca.gnosys.labs"
USERNAME="svc_autocert"
PASSWORD="<ENTER_YOUR_PASSPHRASE_HERE>"
DEST_DIR="/etc/ssl/gnosys"

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

# EXPIRATION CHECK (30 Days = 2592000 seconds)
if [ -f "$CERT_FILE" ]; then
    if openssl x509 -checkend 2592000 -noout -in "$CERT_FILE"; then
        echo "Certificate for $DOMAIN is valid for at least 30 more days. No renewal needed."
        exit 0
    fi
fi

echo "-> Authenticating with Pegasus-CA..."
LOGIN_RES=$(curl -s -k -X POST "$CA_URL/api/auth/login" \\
    -H "Content-Type: application/json" \\
    -d "{\\"username\\":\\"$USERNAME\\",\\"password\\":\\"$PASSWORD\\"}")

TOKEN=$(echo "$LOGIN_RES" | jq -r .token)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "Error: Authentication failed."
    exit 1
fi

echo "-> Requesting signature for $DOMAIN..."
if [ -z "$IP" ]; then
    PAYLOAD="{\\"commonName\\":\\"$DOMAIN\\"}"
else
    PAYLOAD="{\\"commonName\\":\\"$DOMAIN\\", \\"sanIp\\":\\"$IP\\"}"
fi

ISSUE_RES=$(curl -s -k -X POST "$CA_URL/api/issue" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer $TOKEN" \\
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

if systemctl is-active --quiet nginx; then
    echo "-> Restarting NGINX to apply new certificates..."
    sudo systemctl restart nginx
fi`}
          </pre>
        </div>
      </section>

      {/* 04. NGINX TEMPLATE */}
      <section>
        <h2 className="text-xl font-light text-white uppercase tracking-[0.3em] mb-8 border-l-4 border-white pl-6">04. Nginx SSL Template</h2>
        <div className="bg-stoic-gray border border-stoic-border p-1">
          <div className="bg-black/50 p-2 border-b border-stoic-border flex justify-between">
            <span className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">/etc/nginx/sites-available/app-config</span>
            <span className="text-[9px] text-green-900 font-mono uppercase tracking-widest">Production Ready</span>
          </div>
          <pre className="p-8 font-mono text-[11px] text-gray-400 overflow-x-auto leading-relaxed">
{`# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.gnosys.labs;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.gnosys.labs;

    # SSL Configuration (Issued via Pegasus-CA)
    ssl_certificate     /etc/ssl/gnosys/app.gnosys.labs.crt;
    ssl_certificate_key /etc/ssl/gnosys/app.gnosys.labs.key;

    # Stoic SSL hardening
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Example: Internal API Proxy
    # location /api {
    #     proxy_pass http://127.0.0.1:5000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host $host;
    # }
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}