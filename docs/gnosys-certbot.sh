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