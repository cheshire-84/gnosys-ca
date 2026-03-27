const cron = require('node-cron');
const Certificate = require('../models/Certificate');

exports.startWatchdog = () => {
  console.log("-> Initializing Expiration Watchdog...");

  // Runs every day at 08:00 AM server time (0 8 * * *)
  cron.schedule('0 8 * * *', async () => {
    console.log("[Watchdog] Executing daily certificate audit...");
    
    try {
      const certs = await Certificate.find();
      const now = new Date();
      const expiringCerts = [];

      for (const cert of certs) {
        // Parse the OpenSSL date string (e.g., "Mar 26 12:00:00 2026 GMT")
        const expDate = new Date(cert.expiresAt);
        const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          expiringCerts.push({ name: cert.commonName, days: daysUntilExpiry });
        } else if (daysUntilExpiry <= 0) {
          expiringCerts.push({ name: cert.commonName, days: "EXPIRED" });
        }
      }

      if (expiringCerts.length > 0) {
        await triggerWebhook(expiringCerts);
      } else {
        console.log("[Watchdog] Audit complete. All assets healthy.");
      }

    } catch (err) {
      console.error("[Watchdog] Audit failed:", err);
    }
  });
};

const triggerWebhook = async (expiringCerts) => {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK_ID_HERE')) {
    console.log("[Watchdog] Webhook URL not configured. Skipping alert.");
    return;
  }

  const embedFields = expiringCerts.map(c => ({
    name: c.name,
    value: c.days === "EXPIRED" ? "🚨 EXPIRED" : `⚠️ Expires in ${c.days} days`,
    inline: false
  }));

  const payload = {
    username: "Pegasus CA Watchdog",
    embeds: [{
      title: "Master Authority Alert: Impending Asset Expirations",
      color: 16711680, // Red
      description: "The following certificates require automated or manual renewal.",
      fields: embedFields,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("[Watchdog] Alert successfully transmitted to remote channel.");
  } catch (err) {
    console.error("[Watchdog] Webhook transmission failed:", err);
  }
};

exports.testWebhook = async () => {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK_ID_HERE')) {
    throw new Error("Webhook URL is missing or not configured in .env");
  }

  const payload = {
    username: "Pegasus CA Watchdog",
    embeds: [{
      title: "Master Authority Alert: Webhook Test Successful",
      color: 65280, // Terminal Green
      description: "The communication link between Pegasus CA and this channel is fully operational.",
      timestamp: new Date().toISOString()
    }]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("The remote API rejected the webhook payload.");
  return true;
};