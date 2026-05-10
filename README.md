# sparerow-engine

This repository contains the **spare-parts-backend** Strapi v5 application under [`spare-parts-backend/`](spare-parts-backend/README.md) and a **Vite/React storefront** under [`storefront/`](storefront/).

Run both with Docker from the repo root: copy `docker-compose.env.example` to `.env`, copy `spare-parts-backend/.env.docker.example` to `spare-parts-backend/.env`, then `docker compose up --build` (Strapi 1337, storefront 8080). One `docker-compose.yml` covers dev, optional Postgres, and production profiles — see [AGENTS.md](AGENTS.md).
