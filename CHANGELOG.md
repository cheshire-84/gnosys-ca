# Changelog

All notable changes to the Gnosys Labs PKI project will be documented in this file.

## [1.0.0] - Production Release

### Added
* **MongoDB Integration:** Replaced filesystem-only state with a persistent MongoDB database for user management.
* **JWT Security:** Implemented robust JSON Web Token middleware to protect all API endpoints.
* **Modular Architecture:** Refactored the Express backend into professional MVC-style routing (`config`, `models`, `middleware`, `routes`).
* **React Componentization:** Split the monolithic UI into clean, maintainable components (`AuthPanel`, `SettingsPanel`, `DocumentationPanel`).
* **Automation Agent:** Created `gnosys-certbot.sh` for automated client certificate provisioning and smart auto-renewal logic.
* **Vault Backups:** Added `gnosys-vault-backup.sh` to securely dump, compress, and AES-256 encrypt the Root CA keys and database.
* **Metadata Extraction:** Upgraded the `/api/history` route to use OpenSSL to extract exact start and end dates for issued certificates.

### Changed
* Transitioned from serving dynamic frontend files out of `/home` to a secure, static NGINX web directory (`/var/www/gnosys-ca`).
* Updated React build scripts to include an automated `deploy` command.

### Fixed
* **Command Injection Risk:** Added strict Regex validation to the Common Name input to prevent bash execution exploits.
* **Trailing Slash Routing:** Corrected NGINX reverse proxy configuration to properly map `/api` to the Node.js backend.
* **Download Authentication:** Patched a 401 Unauthorized bug for file downloads by allowing the API to check for JWTs in URL query parameters.