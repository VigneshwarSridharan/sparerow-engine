# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Dev server (Compose bind-mounts source at /app)
FROM deps AS development
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Static production build → nginx
FROM deps AS builder
ARG VITE_STOREFRONT_GRAPHQL_ENDPOINT=http://localhost:1337/graphql
ENV VITE_STOREFRONT_GRAPHQL_ENDPOINT=$VITE_STOREFRONT_GRAPHQL_ENDPOINT
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
