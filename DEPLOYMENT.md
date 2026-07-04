# Production Deployment Guide

## Architecture

Single domain with nginx reverse proxy routing:

```
yourdomain.com (port 80/443)
    ↓ (nginx reverse proxy)
    ├─ /graphql → Strapi (internal)
    ├─ /api → Strapi (internal)
    ├─ /admin → Strapi admin (internal)
    ├─ /uploads → Strapi uploads (internal)
    └─ / → Storefront React app (internal)
```

All traffic flows through the reverse proxy on a single domain, eliminating CORS issues.

## Setup Steps

### 1. Prerequisites

- Docker & Docker Compose installed
- Domain name pointing to your server IP
- PostgreSQL password set in environment

### 2. Clone & Configure

```bash
# Copy production environment template
cp docker-compose.env.production .env

# Edit .env with your actual values
vim .env
# Update: POSTGRES_PASSWORD, domain name in reverse proxy if needed

# Copy backend environment
cp spare-parts-backend/.env.docker.example spare-parts-backend/.env

# Edit backend .env with secrets
vim spare-parts-backend/.env
# Set: CUSTOMER_JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, etc.
```

### 3. Deploy

```bash
# Build and start all production services
docker compose --profile production up --build -d

# View logs
docker compose logs -f reverse_proxy
docker compose logs -f strapi_prod
docker compose logs -f storefront_prod
```

### 4. Verify Services are Running

```bash
docker compose ps

# Expected output:
# NAME                    STATUS
# spare-parts-postgres    Up (healthy)
# spare-parts-strapi      Up
# spare-parts-storefront  Up
# spare-parts-reverse-proxy Up
```

## Testing

### Test 1: Reverse Proxy Health

```bash
# From server
curl -I http://localhost/

# Expected: 200 OK (serves storefront home page)
```

### Test 2: GraphQL Endpoint

```bash
curl -X POST http://localhost/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Expected: 200 OK with GraphQL response
```

### Test 3: Storefront

```bash
# Visit in browser:
# http://yourdomain.com/

# Should load the React app and make requests to /graphql
# Check browser DevTools → Network tab:
# - GraphQL requests should go to /graphql (not http://localhost:1337/graphql)
```

### Test 4: API Routes

```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# Should return appropriate response (success or validation error)
```

### Test 5: Admin Panel

```bash
# Visit: http://yourdomain.com/admin
# Should load Strapi admin panel
```

## SSL/HTTPS Setup

After verifying HTTP works, set up SSL:

### Option A: Let's Encrypt with Certbot (Recommended)

```bash
# Install Certbot
apt update && apt install certbot python3-certbot-nginx -y

# Get certificate
certbot certonly --standalone -d yourdomain.com

# Update reverse proxy nginx config to use SSL certificates
# Edit reverse-proxy/nginx/default.conf and add SSL configuration
```

### Option B: Using Docker with Let's Encrypt

Use `certbot-nginx` container or similar for automated SSL renewal.

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f strapi_prod

# With timestamps and last N lines
docker compose logs -f --timestamps --tail=100
```

### Database Backups

```bash
# Backup PostgreSQL
docker compose exec spare-parts-postgres pg_dump -U strapi strapi_spare > backup.sql

# Restore from backup
docker compose exec -T spare-parts-postgres psql -U strapi strapi_spare < backup.sql
```

### Update Code

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose --profile production up --build -d
```

### Resource Cleanup

```bash
# Stop all containers
docker compose down

# Remove all data (CAUTION - destructive)
docker compose --profile production down -v
```

## Troubleshooting

### Storefront shows 404

- Check reverse proxy logs: `docker compose logs reverse_proxy`
- Verify storefront container is running: `docker compose ps`
- Ensure GraphQL endpoint is set to `/graphql` (relative path)

### GraphQL requests fail

- Check Strapi logs: `docker compose logs strapi_prod`
- Verify database is healthy: `docker compose ps` (should show "healthy")
- Check STRAPI_INTERNAL_API_KEY if using internal API

### Database connection fails

- Verify POSTGRES_PASSWORD is set correctly in .env
- Check database logs: `docker compose logs spare-parts-postgres`
- Ensure DATABASE_URL is correctly formatted in spare-parts-backend/.env

### Port 80 already in use

```bash
# Find what's using port 80
sudo lsof -i :80

# Stop the conflicting service or change port in docker-compose
```

## Performance Tuning

### Increase file upload size

Edit `reverse-proxy/nginx/default.conf`, increase `client_max_body_size`:

```nginx
client_max_body_size 500M;  # Increase from 100M as needed
```

### Enable Gzip compression

Add to reverse proxy nginx config:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### Database optimization

```sql
-- Connect to PostgreSQL
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_products_category ON products(category_id);
```
