# Deploying the frontend (zurt.com.br)

## Why you see 500/504 errors (e.g. `@vite/client`, `/src/*.tsx`, `node_modules/.vite/deps/`)

If the live site requests **development-only** URLs such as:
- `https://zurt.com.br/@vite/client`
- `https://zurt.com.br/node_modules/.vite/deps/...`
- `https://zurt.com.br/src/main.tsx` or any `.tsx` file

then the server is serving the **development** `index.html` and the browser is trying to run the app in dev mode. Those URLs only exist when running `npm run dev`; they must **never** be used in production. The 504 (Gateway Timeout) usually means the reverse proxy is waiting for a process (e.g. Vite dev server) that isn’t running or is too slow.

## Why you see 500 errors for `/src/.../*.tsx`

If the live site requests URLs like:

- `https://zurt.com.br/src/main.tsx`
- `https://zurt.com.br/src/App.tsx`
- `https://zurt.com.br/src/components/ui/toaster.tsx`

**the server is serving the development `index.html`**, which loads the app as raw source files. Production cannot serve `.tsx`/`.ts` source; it must serve the **built** app.

## Correct production deployment

1. **Build the app** (from the `frontend` directory):
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder only.**  
   - The web server document root (or “publish directory”) must be **`dist/`**, not the project root.  
   - The built `dist/index.html` references bundled files like `/assets/js/index-[hash].js`, not `/src/main.tsx`.  
   - No `.tsx` or `.ts` file should ever be requested in production.

3. **Do not** point the server at the repo root or at the `index.html` that contains:
   ```html
   <script type="module" src="/src/main.tsx"></script>
   ```
   That file is for the Vite dev server only.

## Summary

| Wrong (causes 500)              | Correct                          |
|---------------------------------|----------------------------------|
| Document root = project root    | Document root = `dist/`          |
| Serving `index.html` with `/src/main.tsx` | Serving built `dist/index.html`  |
| Browser requests `.tsx` files   | Browser requests `.js` in `assets/` |

After deploying `dist/` as the site root, the 500/502 errors for `/src/.../*.tsx` and `node_modules/.vite/deps/` will stop.

---

## Do **not** run `npm run dev` in production

- **502 Bad Gateway**: Your reverse proxy (e.g. Nginx) is forwarding to a Vite dev server. If that process is not running or crashes, the proxy returns 502.
- **Correct setup**: Run `npm run build` on the server (or in CI), then serve the generated **static** files from `dist/` with Nginx or another web server. No Node process needs to run for the frontend in production.

### Nginx example (serve built app only)

```nginx
server {
    listen 80;
    server_name zurt.com.br;
    root /path/to/Fintech-project/frontend/dist;   # document root = dist/
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Reload Nginx after building: `cd frontend && npm run build`.

---

## If `npm run dev` crashes with "The service was stopped" (esbuild)

This often happens on low-memory VPS (e.g. 2 GB RAM). esbuild’s process can be killed by the OS when memory is tight.

- **Recommended**: Do not run the dev server on production. Build once (`npm run build`), then serve `dist/` as above.
- **If you need dev on that machine**: The project’s `npm run dev` now runs with increased Node memory (1536 MB) to reduce esbuild crashes. If it still fails, run `npm run dev:no-memory-limit` only on machines with enough RAM, or build locally and deploy only the `dist/` folder.

### Using the dev server with zurt.com.br (no 502)

- **Option A – Dev:** Run `npm run dev` on the server, then open **http://localhost:8080** in the browser (or ensure your reverse proxy forwards zurt.com.br to `http://127.0.0.1:8080` and the dev server is running).
- **Option B – Production-like (recommended for zurt.com.br):** Run `npm run build` then `npm run start` (or `npm run preview`). That serves the built app on port 8080 with no Vite dev server. Point Nginx at `http://127.0.0.1:8080`. No 502, no `node_modules` or `.tsx` requests.
