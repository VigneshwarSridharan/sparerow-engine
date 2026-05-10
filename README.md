# sparerow-engine

This repository contains the **spare-parts-backend** Strapi v5 application under [`spare-parts-backend/`](spare-parts-backend/README.md) and a **Vite/React storefront** under [`storefront/`](storefront/).

Run both with Docker from the repo root: copy `spare-parts-backend/.env.docker.example` to `spare-parts-backend/.env`, then `docker compose up --build` (Strapi on port 1337, storefront on 8080). See [AGENTS.md](AGENTS.md) for Compose variants (Postgres, production).
