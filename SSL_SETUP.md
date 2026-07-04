# SSL/HTTPS Setup with Let's Encrypt + Certbot

This guide covers setting up automated SSL certificates with Let's Encrypt and Certbot for Sparerow Engine.

## Overview

The setup includes:
- **Automatic certificate generation** via Let's Encrypt
- **Automatic renewal** (runs continuously in background)
- **Zero-downtime renewal** (nginx reloads without stopping)
- **HTTP → HTTPS redirect** for security

## Architecture

```
Browser (HTTPS)
    ↓
Nginx Reverse Proxy (Port 443)
    ├─ SSL certificate from Let's Encrypt
    ├─ Automatic renewal via Certbot
    ├─ HTTP (Port 80) redirects to HTTPS
    ├─ ACME challenge validation at /.well-known/acme-challenge/
    └─ Routes to internal services
```

## Prerequisites

1. **Domain name** pointing to your VPS IP address
2. **Open ports** 80 and 443 on firewall
3. **Docker & Docker Compose** installed
4. **Email address** for Let's Encrypt notifications

## Quick Start (Production VPS)

### 1. Configure Environment

```bash
cp docker-compose.env.production .env

# Edit .env with your domain and email
vim .env
```

Update these variables:
```env
LETSENCRYPT_DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=your-email@example.com
```

### 2. Deploy with SSL

```bash
# Build and start all services
docker compose --profile production up --build -d

# Check if certificate is being generated
docker compose logs certbot
```

Expected output:
```
✓ Certificate successfully generated for yourdomain.com
Starting automatic renewal service...
```

### 3. Verify HTTPS is Working

```bash
# Test HTTPS
curl -I https://yourdomain.com/

# Should return 200 OK with SSL certificate info
```

### 4. Force HTTPS Redirect

Once HTTPS is verified:

```bash
# Verify HTTP redirects to HTTPS
curl -I http://yourdomain.com/

# Should return 301 Moved Permanently to https://yourdomain.com
```

## How Automatic Renewal Works

### Renewal Process

The Certbot container runs continuously and:
1. Checks for certificate expiration every 24 hours
2. Renews certificates 30 days before expiration
3. Reloads nginx without stopping (zero downtime)
4. Sends email notifications on renewal

### Renewal Logs

```bash
# View renewal attempts
docker compose logs certbot

# Expected (no output = working correctly):
# - Checks run silently
# - Only logs on renewal or error
```

### Certificate Expiration Timeline

```
Day 1: Certificate issued (valid for 90 days)
Day 60: First renewal check (Let's Encrypt allows 30 days early)
Day 90: Certificate expires
Day 88-89: Final auto-renewal if needed
```

## Troubleshooting

### Certificate Not Generating

```bash
# Check certbot logs
docker compose logs certbot

# Common issues:
# 1. Domain DNS not pointing to server
#    → Wait 5-10 minutes for DNS propagation
#    → Verify: nslookup yourdomain.com
#
# 2. Port 80 blocked by firewall
#    → Check: telnet yourdomain.com 80
#    → Allow port 80 and 443 in firewall
#
# 3. Let's Encrypt rate limit
#    → Wait 1 hour between attempts
#    → Use different domain or staging URL
```

### Manual Certificate Renewal

```bash
# Force immediate renewal (for testing)
docker compose exec certbot certbot renew --force-renewal

# Or restart certbot container
docker compose restart certbot
```

### Check Certificate Details

```bash
# List current certificates
docker compose exec certbot certbot certificates

# Test certificate validity
curl -vI https://yourdomain.com/ 2>&1 | grep -A 5 "certificate"
```

### SSL Certificate Error in Browser

```
# Error: "SSL certificate problem"

# Solutions:
# 1. Wait for certificate generation to complete
#    → Watch logs: docker compose logs certbot
#
# 2. Clear browser cache
#    → Hard refresh: Ctrl+Shift+R (Chrome/Firefox)
#
# 3. Verify nginx is using correct certificate
#    → Check: docker compose exec reverse_proxy \
#      nginx -T | grep ssl_certificate
```

### Nginx Configuration Issues

```bash
# Validate nginx configuration
docker compose exec reverse_proxy nginx -t

# If error, check the domain replacement
docker compose exec reverse_proxy cat /etc/nginx/conf.d/default.conf | grep -A 2 "ssl_certificate"
```

## Manual Certificate Management

### List All Certificates

```bash
docker compose exec certbot certbot certificates
```

Output shows:
- Certificate path
- Domain names
- Expiration date
- Renewal date

### Renew Specific Certificate

```bash
docker compose exec certbot certbot renew --cert-name yourdomain.com
```

### Add Additional Domain

```bash
# For multi-domain setup (separate certificate)
docker compose exec certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --domain anotherdomain.com \
  --email your-email@example.com \
  --agree-tos
```

### Revoke Certificate

```bash
# Revoke current certificate (if compromised)
docker compose exec certbot certbot revoke \
  --cert-path /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

## Advanced Configuration

### Custom Renewal Hook

Edit `.env` to add custom commands after renewal:

```bash
# Option 1: Notify external service
# Option 2: Run backup before renewal
# Option 3: Update firewall rules
```

The renewal hook in `certbot-entrypoint.sh` can be modified to:

```bash
--deploy-hook="/bin/sh -c 'custom-command-here'"
```

### Staging Environment (Testing)

For testing without hitting Let's Encrypt rate limits:

```bash
# Use staging URL (fake certificates, same limits testing)
certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --domain yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --staging  # This is the staging flag
```

### Multiple Domains (SAN Certificate)

```bash
certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --domain yourdomain.com \
  --domain www.yourdomain.com \
  --domain api.yourdomain.com \
  --email your-email@example.com \
  --agree-tos
```

Then update nginx config to use the certificate and route subdomains accordingly.

## Security Best Practices

### 1. HTTPS Only

✅ Current setup forces HTTP → HTTPS redirect

### 2. HSTS (HTTP Strict Transport Security)

Add to nginx config for additional security:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Certificate Pinning (Optional)

For mobile apps:
```
1. Get certificate pin hash
2. Add to app configuration
3. App verifies certificate matches pin
```

### 4. Monitor Certificate Status

```bash
# Set up monitoring (cron job to check expiration)
0 0 * * * certbot certificates | grep "Expiration Date"
```

### 5. Email Notifications

Let's Encrypt automatically sends emails to `LETSENCRYPT_EMAIL`:
- 30 days before expiration
- On renewal failure
- On other important events

## Renewal Status Monitoring

### Check if Renewal is Working

```bash
# View the last renewal attempt
docker compose exec certbot certbot certificates | grep -A 5 yourdomain.com

# Should show:
# - Expiration date (90 days from issue date initially)
# - Next renewal date (60 days from issue date, auto-renewed)
```

### Logs Location

Logs are stored in the certbot container volume:
```bash
# View all certbot logs
docker compose exec certbot cat /var/log/letsencrypt/letsencrypt.log

# Watch renewal logs in real-time
docker compose logs -f certbot | grep -i "renew"
```

## Updating Domain

If you need to change domains:

```bash
# 1. Update .env
LETSENCRYPT_DOMAIN=newdomain.com

# 2. Restart services
docker compose --profile production down
docker compose --profile production up --build -d

# 3. Certbot will generate new certificate for new domain
```

## Backup Certificates

The Let's Encrypt certificates are stored in Docker volume `spare_parts_letsencrypt_data`.

To backup:

```bash
# Backup certificate data
docker run --rm \
  -v spare_parts_letsencrypt_data:/data \
  -v /backup/path:/backup \
  alpine tar czf /backup/letsencrypt-backup.tar.gz -C /data .

# Restore certificate data
docker run --rm \
  -v spare_parts_letsencrypt_data:/data \
  -v /backup/path:/backup \
  alpine tar xzf /backup/letsencrypt-backup.tar.gz -C /data
```

## Cost

Let's Encrypt SSL certificates are:
- ✅ **Completely free**
- ✅ **Automatically renewed**
- ✅ **Trusted by all browsers**
- ✅ **No manual renewal needed**

## Summary

| Aspect | Status |
|--------|--------|
| SSL Certificate | Let's Encrypt (Free) |
| Renewal | Automatic (every 60 days) |
| Downtime | None (zero-downtime reload) |
| Configuration | Environment variables (.env) |
| Monitoring | Email notifications |
| Troubleshooting | Logs in `docker compose logs certbot` |

The SSL setup is production-ready and will automatically renew certificates throughout the lifetime of your deployment.
