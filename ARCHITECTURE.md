# Production Architecture

## Before (Old Setup)

```
Browser
    ├─ yourdomain.com:80 → Storefront (port 80)
    │   └─ React app makes requests to http://localhost:1337/graphql
    │       └─ CORS issues, hardcoded API URL
    │
    └─ yourdomain.com:1337 → Strapi API (port 1337)
        └─ Database

Problems:
- Two separate domains/ports needed
- CORS configuration required
- API endpoint hardcoded in frontend (http://localhost:1337/graphql)
- Difficult to manage SSL certificates
```

## After (New Setup - RECOMMENDED)

```
Browser
    └─ yourdomain.com:80 → Nginx Reverse Proxy (port 80)
        ├─ /graphql, /api, /admin, /uploads → Strapi (port 1337, internal)
        │   └─ Database
        │
        └─ / → Storefront (port 80, internal)
            └─ React app makes requests to /graphql
                └─ Same domain = no CORS issues
                └─ Relative path = flexible API endpoint

Benefits:
✓ Single domain for entire application
✓ No CORS issues (same origin)
✓ API endpoint is relative path (/graphql)
✓ Single SSL certificate for all services
✓ Reverse proxy handles routing, caching, rate limiting
✓ Easy to scale backend independently
✓ Standard architecture for production web apps
```

## Data Flow

### Page Load
1. Browser: `GET yourdomain.com/`
2. Reverse Proxy: Routes to Storefront (internal)
3. Storefront: Returns React app + JavaScript bundle
4. Browser: Loads React app, makes request to `/graphql`

### GraphQL Request
1. Browser: `POST yourdomain.com/graphql`
2. Reverse Proxy: Detects `/graphql` path
3. Reverse Proxy: Routes to Strapi backend (internal)
4. Strapi: Processes GraphQL query
5. Strapi: Returns JSON response
6. Browser: Receives data, updates UI

### File Uploads
1. Browser: `POST yourdomain.com/upload`
2. Reverse Proxy: Routes to Strapi
3. Strapi: Handles file upload
4. Strapi: Stores in `/uploads`
5. Browser: Can access via `yourdomain.com/uploads/...`

## Service Layout

| Service | Container | Port | Access | Purpose |
|---------|-----------|------|--------|---------|
| PostgreSQL | spare-parts-postgres | 5432 | Internal | Database |
| Strapi | spare-parts-strapi | 1337 | Internal (proxied) | GraphQL/REST API, Admin |
| Storefront | spare-parts-storefront | 80 | Internal (proxied) | React app (static files) |
| Nginx Proxy | spare-parts-reverse-proxy | 80, 443 | External (public) | Routing, SSL, load balancing |

## Environment Variables

The storefront now uses a **relative path** for the GraphQL endpoint:

```env
# OLD (hardcoded to backend)
VITE_STOREFRONT_GRAPHQL_ENDPOINT=http://localhost:1337/graphql

# NEW (relative path, works with reverse proxy)
VITE_STOREFRONT_GRAPHQL_ENDPOINT=/graphql
```

This means the React app will make requests to:
- `yourdomain.com/graphql` (instead of `http://localhost:1337/graphql`)
- The reverse proxy intercepts and routes to internal Strapi

## Reverse Proxy Configuration

Located in `reverse-proxy/nginx/default.conf`:

```nginx
# Routes GraphQL/API/Admin requests to Strapi
location ~ ^/(graphql|api|admin|uploads) {
  proxy_pass http://strapi_prod:1337;
  # Headers preserve original request info
}

# Routes everything else to Storefront
location / {
  proxy_pass http://storefront_prod:80;
}
```

## Security Considerations

1. **Backend not exposed directly** — Strapi only accessible through reverse proxy
2. **Single SSL certificate** — All services covered by one cert
3. **Reverse proxy handles rate limiting** — Can add throttling at proxy level
4. **CORS not needed** — Same origin eliminates cross-origin issues
5. **Upload size limit** — Reverse proxy enforces 100MB limit (configurable)

## Scaling

The architecture supports independent scaling:

- **Scale storefront**: Build more Storefront containers, add to nginx upstream
- **Scale backend**: Build more Strapi containers, add to nginx upstream
- **Database**: PostgreSQL can be moved to managed service (RDS, etc.)

Example with multiple backends:

```nginx
upstream strapi {
  server strapi_prod_1:1337;
  server strapi_prod_2:1337;
  server strapi_prod_3:1337;
  # Nginx distributes requests across all
}
```
