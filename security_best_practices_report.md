# Linux Server Security Checklist

Only keep items here that must be verified or fixed on the production Linux server, reverse proxy, DNS, database, or deployment pipeline. App-code items are intentionally excluded.

## Reverse Proxy and TLS
- [ ] Serve production only through HTTPS on `3dprintings.xyz`, `www.3dprintings.xyz`, and `seller.3dprintings.xyz`.
- [ ] Redirect all HTTP traffic to HTTPS.
- [ ] Use valid auto-renewing TLS certificates and monitor renewal failures.
- [ ] Enable modern TLS protocols and ciphers only.
- [ ] Enable HSTS only after confirming every required subdomain supports HTTPS.
- [ ] Use HSTS preload only if every current and future subdomain can safely be forced to HTTPS.
- [ ] Proxy Node only from localhost or a private network, not directly from the public internet.
- [ ] Strip untrusted incoming `X-Forwarded-*` headers at the edge and set trusted proxy headers yourself.
- [ ] Set `TRUST_PROXY` to the exact proxy hop count or trusted proxy setting that matches the real deployment.
- [ ] Confirm production does not expose Node, PostgreSQL, Redis, PocketBase, admin panels, Docker sockets, or debug ports publicly.

## Nginx or Web Server Limits
- [ ] Set request body limits appropriate for this app, including upload endpoints.
- [ ] Set connection and request rate limits for `/api/`, auth routes, upload routes, and webhook routes.
- [ ] Set reasonable proxy timeouts so slow clients cannot hold backend workers forever.
- [ ] Disable directory listing for frontend assets and upload directories.
- [ ] Serve uploaded files as static files only, never through a script-capable location.
- [ ] Ensure the upload directory is not executable.
- [ ] Confirm frontend routes fall back to `index.html` without exposing filesystem paths.

## Production Security Headers
- [ ] Add security headers at the reverse proxy for the frontend site.
- [ ] Set `Content-Security-Policy` and test it in report-only mode before enforcing.
- [ ] CSP `script-src` should allow only required sources such as `'self'` and Google Sign-In.
- [ ] CSP `style-src` should allow only required sources such as `'self'`, Google Fonts, and any required inline style exception.
- [ ] CSP `font-src` should allow Google Fonts if the site continues using it.
- [ ] CSP `connect-src` should allow only the site API origins and required service endpoints.
- [ ] CSP `frame-src` should allow Google Sign-In only if required.
- [ ] Set `frame-ancestors 'none'` unless the site must be embedded somewhere.
- [ ] Set `X-Content-Type-Options: nosniff`.
- [ ] Set a restrictive `Referrer-Policy`, such as `strict-origin-when-cross-origin`.
- [ ] Set a restrictive `Permissions-Policy` for unused browser features.
- [ ] Confirm production responses do not expose `X-Powered-By` or detailed server version headers.

## Firewall and Network Access
- [ ] Allow public inbound traffic only on required ports, normally `80` and `443`.
- [ ] Restrict SSH to trusted IPs if possible.
- [ ] Use key-based SSH authentication and disable password SSH login.
- [ ] Disable direct root SSH login.
- [ ] Keep PostgreSQL bound to localhost or a private interface only.
- [ ] Restrict outbound access if your hosting environment supports egress firewall rules.
- [ ] Block access to cloud metadata IPs from app processes if the host provider supports it.

## Process User and Filesystem Permissions
- [ ] Run the Node app as an unprivileged Linux user, not `root`.
- [ ] Keep source files owned by a deployment user or root so the Node process cannot modify app code.
- [ ] Give the Node process write access only to required runtime directories, such as uploads and logs.
- [ ] Set production `.env` permissions to owner-read/write only, for example `chmod 600`.
- [ ] Keep secrets out of the web root and uploaded-file directories.
- [ ] Ensure upload directories cannot contain executable scripts that the web server will run.
- [ ] Use systemd or a process manager with automatic restart on failure.
- [ ] Configure systemd hardening where practical, such as `NoNewPrivileges`, a restricted working directory, and limited writable paths.

## Environment Variables and Secrets
- [ ] Set `NODE_ENV=production`.
- [ ] Set a strong `JWT_SECRET` with at least 32 random characters.
- [ ] Set production `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and EasyPost webhook/API secrets.
- [ ] Set production database credentials with least privilege.
- [ ] Set `FRONTEND_URL=https://3dprintings.xyz`.
- [ ] Set `SELLER_FRONTEND_URL=https://seller.3dprintings.xyz`.
- [ ] Set `SITE_ORIGIN=https://3dprintings.xyz`.
- [ ] Set `IMAGE_BASE_URL` to the canonical production upload URL.
- [ ] Set `AUTH_COOKIE_DOMAIN` intentionally, for example `.3dprintings.xyz` only if shared subdomain login is required.
- [ ] Keep `CORS_ALLOWED_ORIGINS` empty unless extra trusted origins are truly required.
- [ ] Keep `DEBUG_ADDRESS_VERIFY` disabled in production unless temporarily debugging, because verbose address logs can contain personal data.
- [ ] Rotate any secret that was ever committed, logged, pasted into chat, or exposed in a terminal recording.

## Database Security
- [ ] PostgreSQL is not reachable from the public internet.
- [ ] The app database user has only the permissions required by the app.
- [ ] Database admin credentials are not used by the app process.
- [ ] Database backups are encrypted or stored in a protected location.
- [ ] Backup restore has been tested, not only backup creation.
- [ ] PostgreSQL logs do not record full sensitive query payloads unnecessarily.
- [ ] Production migrations are reviewed and backed up before deployment.

## Webhooks and Third-Party Services
- [ ] Stripe webhook endpoint in the Stripe dashboard points to the exact production URL.
- [ ] Stripe webhook signing secret on the server matches the production Stripe endpoint.
- [ ] EasyPost webhook endpoint points to the exact production URL.
- [ ] EasyPost webhook secret on the server matches the production EasyPost webhook settings.
- [ ] Stripe CLI webhook forwarding is not running in production.
- [ ] Google OAuth allowed origins and client IDs match only trusted production domains.
- [ ] Email sending credentials are production credentials and are not reused from development.

## DDoS and Abuse Protection
- [ ] Put the site behind a CDN or WAF if possible.
- [ ] Configure edge rate limits for login, signup, password reset, checkout, upload, and webhook paths.
- [ ] Configure IP reputation, bot filtering, or challenge rules for obvious abusive traffic.
- [ ] Configure fail2ban or equivalent SSH brute-force protection.
- [ ] Monitor high request rates, high 4xx/5xx rates, upload spikes, and webhook failures.
- [ ] If running multiple Node instances, use a shared rate-limit store instead of per-process memory limits.

## Deployment and Build Hygiene
- [ ] Deploy with a clean production build, not the Vite dev server.
- [ ] Do not publicly serve source maps unless they are intentionally protected.
- [ ] Use the lockfile during installs, for example `npm ci`.
- [ ] Run `npm audit --omit=dev` during deployment and block unresolved production vulnerabilities.
- [ ] Keep Node.js on a supported LTS version.
- [ ] Keep Linux packages updated with security patches.
- [ ] Restart services after security updates that affect Node, OpenSSL, PostgreSQL, or Nginx.
- [ ] Store deployment secrets in protected server environment files or a secrets manager, not in git.
- [ ] CI/CD secrets are unavailable to untrusted pull requests or untrusted build scripts.

## DNS and Email Domain Security
- [ ] Remove unused DNS records and dangling subdomains.
- [ ] Add CAA records if you want to restrict which certificate authorities can issue certificates.
- [ ] Configure SPF for the domain used to send email.
- [ ] Configure DKIM for the mail provider.
- [ ] Configure DMARC with monitoring, then enforcement after confirming legitimate mail passes.
- [ ] Confirm no old staging, test, or admin subdomains are still public.

## Logging, Monitoring, and Incident Response
- [ ] Centralize production logs or make sure they survive process restarts.
- [ ] Restrict log file access to admins only.
- [ ] Do not log passwords, full tokens, session cookies, full reset links, card data, or full customer addresses.
- [ ] Configure alerts for app crashes, repeated 500s, auth abuse, payment webhook failures, and disk usage.
- [ ] Monitor certificate expiration, domain expiration, and backup failures.
- [ ] Document how to rotate JWT, Stripe, EasyPost, database, OAuth, and email secrets.
- [ ] Document how to restore the database from backup.
- [ ] Document who has production SSH, database, Stripe, DNS, and hosting access.

## Final Server Verification
- [ ] Test the deployed site with production HTTPS, cookies, CORS, CSRF, uploads, checkout, Google login, Stripe Connect, and webhooks.
- [ ] Confirm security headers from the live domain with `curl -I` or an external header scanner.
- [ ] Confirm only expected ports are public with an external port scan that you own or are authorized to run.
- [ ] Confirm production logs do not contain sensitive payloads after testing checkout, address verification, login, and password reset.
- [ ] Confirm a full backup restore works before relying on the backup system.
