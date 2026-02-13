# Web Skeleton (T4.1)

Run locally:

```bash
pnpm --filter @earthistory/web dev
```

T4.4 API integration:

- Default API base URL is `/api`.
- In dev mode, Vite proxies `/api` to `http://localhost:3001`.
- Start API first:

```bash
pnpm --filter @earthistory/api dev
```

- Optional: point to a remote API by setting `VITE_API_BASE_URL`.

Staging deploy (T5.1):

- Workflow: `.github/workflows/web-staging-deploy.yml`
- Trigger: push to `main` or manual run (`workflow_dispatch`)
- Staging URL: `https://seasu.github.io/earthistory/`
- If API is hosted elsewhere, set `VITE_API_BASE_URL` during build (for example in workflow env).

Build:

```bash
pnpm --filter @earthistory/web build
```

Map provider abstraction (T4.2):

- `src/map/MapViewport.tsx`
- `src/map/providers/CesiumProvider.tsx`
- `src/map/providers/MapLibreProvider.tsx`
