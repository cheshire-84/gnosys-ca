# Changelog

All notable changes to the Gnosys Labs PKI project will be documented in this file.

## [4.0.0] - Enterprise Architecture Update (Current)

### Added
* **Service Tokens (API Keys):** Added non-expiring, headless machine tokens for automated `gnosys-certbot.sh` agents.
* **Database State Migration:** Issued certificates are now mapped to MongoDB for instant UI loading, eliminating high CPU I/O loops.
* **Watchdog & Webhooks:** Added a daily cron service that audits the database and fires Discord Webhooks 30 days prior to asset expiration.
* **React Componentization:** Completely refactored the frontend monolithic `App.jsx` into dedicated pages and modular components.
* **Service Layer Abstraction:** Decoupled Express routing from OpenSSL bash execution by introducing strict Service files.
* **Express Hardening:** Integrated `helmet` for HTTP header security and `express-rate-limit` to prevent brute-force authorization attacks.

### Changed
* Modified NGINX access logs to automatically redact and scrub JWT tokens from URL query parameters.
* Updated Vault Backup script to target correct paths and include the new V4 MongoDB dumps.
* Reduced React polling interval from 5 seconds to 60 seconds, substituting with manual UI triggers to reduce database load.

### Fixed
* **Concurrency Bug:** Implemented `crypto.randomUUID()` for `.ext` file generation to prevent race conditions during simultaneous certificate issuances.