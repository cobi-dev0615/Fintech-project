# Deployment troubleshooting – 502 Bad Gateway (zurt.com.br)

A **502 Bad Gateway** from nginx means the upstream server Nginx is proxying to is not responding. Use this checklist on the **server** where zurt.com.br is hosted.

## 1. See which upstream is failing

From your Nginx config (see WEBSOCKET_NGINX_CONFIG.md):

- **`location /`** → `http://localhost:8080` (frontend – SPA)
- **`location /api`** → `http://localhost:5000` (backend API)
- **`location /ws`** → `http://localhost:5000` (WebSocket)

If **zurt.com.br** or **zurt.com.br/app/cards** shows 502, the **frontend** upstream (port **8080**) is almost certainly down.

## 2. Fix 502 for the whole site (e.g. /app/cards)

The app is served by whatever is listening on **port 8080**. That process must be running.

### Option A – Production (built frontend)

1. **Build the frontend**
   ```bash
   cd /home/Fintech-project/frontend
   npm run build
   ```

2. **Serve the built files on port 8080**

   Examples:

   - **Using `serve`:**
     ```bash
     npx serve -s dist -l 8080
     ```
     (Run in a process manager – see “Keep processes running” below.)

   - **Or Nginx serving static files**  
     Change the config so `location /` serves files from the frontend `dist` folder instead of `proxy_pass http://localhost:8080`. Then you don’t need a Node process on 8080.

### Option B – Development (Vite dev server)

1. **Start the frontend dev server on 8080**
   ```bash
   cd /home/Fintech-project/frontend
   npm run dev
   ```
   By default Vite uses port 5173. Either:
   - Set in `frontend/vite.config.ts`: `server: { port: 8080 }`, or  
   - Run: `npm run dev -- --port 8080`

2. Keep this process running (e.g. in a terminal, or with a process manager).

## 3. Check that the upstream is listening

On the server:

```bash
# Is anything listening on 8080 (frontend)?
sudo ss -tlnp | grep 8080
# or
sudo lsof -i :8080

# Is the backend listening on 5000?
sudo ss -tlnp | grep 5000
```

- If **nothing** is on **8080** → start the frontend (Option A or B above). That fixes the 502 for the site (including /app/cards).
- If **nothing** is on **5000** → start the backend (see below). That fixes 502 for API/WebSocket.

## 4. Start the backend (API + WebSocket, port 5000)

If API or WebSocket return 502:

```bash
cd /home/Fintech-project/backend
cp .env.example .env   # if not done yet
# Edit .env (DATABASE_URL, PORT=5000, JWT_SECRET, FRONTEND_URL, etc.)
npm install
npm run dev
# Or for production: npm run build && node dist/index.js
```

Ensure `PORT` in `.env` is **5000** (or whatever your Nginx `proxy_pass` uses for `/api` and `/ws`).

## 5. Keep processes running (recommended)

So they don’t stop when you close SSH:

- **systemd** – create a service for the frontend (e.g. `serve` on 8080) and one for the backend (Node on 5000).
- **pm2** – e.g.:
  ```bash
  pm2 start "npx serve -s dist -l 8080" --name zurt-frontend
  pm2 start "node dist/index.js" --cwd /home/Fintech-project/backend --name zurt-backend
  pm2 save && pm2 startup
  ```

## 6. Nginx config quick check

- **Location order:** More specific paths first (e.g. `/api`, `/ws`) then `location /`.
- **Test and reload:**
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  ```

## 404 “This page can’t be found” (zurt.com.br or zurt.com.br/)

**Cause:** The server is reached but the resource for `/` (or `/app/cards`, etc.) is not found.

1. **Frontend has an entry point**  
   The repo includes `frontend/index.html`. If you deployed without it or built elsewhere, ensure `index.html` exists at the frontend root and that the dev server or static server is serving it for `/`.

2. **If you serve the built app with Nginx directly (no proxy to 8080)**  
   Use SPA fallback so all routes serve `index.html`:
   ```nginx
   root /path/to/Fintech-project/frontend/dist;
   index index.html;
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```
   Keep `location /api` and `location /ws` proxying to the backend as before.

3. **If you proxy `location /` to the app on 8080**  
   Ensure the process on 8080 is the Vite dev server (or a static server like `serve -s dist -l 8080`) so it serves `index.html` for `/` and other paths. Restart the frontend after adding `index.html` if you had it missing.

## 504 Gateway Time-out (blank page, JS files fail to load)

**Cause:** Nginx is proxying `location /` to the **Vite dev server** (port 8080). The first requests (HTML + many JS modules) can take a long time because Vite pre-bundles dependencies on demand. Nginx’s default proxy timeout (often 60s) is exceeded → **504** and the page stays blank.

**Recommended fix – serve the built frontend (no proxy to Vite):**

1. **Build the frontend** on the server:
   ```bash
   cd /home/Fintech-project/frontend
   npm run build
   ```

2. **Configure Nginx to serve static files** instead of proxying to 8080:
   ```nginx
   location / {
       root /home/Fintech-project/frontend/dist;
       index index.html;
       try_files $uri $uri/ /index.html;
       add_header Cache-Control "no-cache";
   }
   ```
   Remove or comment out `proxy_pass http://localhost:8080` for `location /`.

3. **Reload Nginx:** `sudo nginx -t && sudo systemctl reload nginx`

Then the browser loads pre-built JS from Nginx; there is no upstream timeout and no 504.

**If you must keep proxying to the Vite dev server**, increase Nginx timeouts for that location:
   ```nginx
   location / {
       proxy_pass http://localhost:8080;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
       proxy_connect_timeout 300s;
       proxy_send_timeout 300s;
       proxy_read_timeout 300s;
   }
   ```
   Even with this, the first load can be slow; production should use the built `dist` and the config above.

## Summary

| Symptom              | Cause              | Fix                                      |
|----------------------|--------------------|------------------------------------------|
| 502 on site/SPA      | Nothing on :8080   | Start frontend (build + serve or Vite)   |
| 502 on API/WebSocket | Nothing on :5000   | Start backend (Node on PORT=5000)       |
| 404 on / or /app/*   | No index.html or wrong Nginx root/fallback | Add index.html, use try_files or proxy to app on 8080 |
| **504 on / (blank page, JS timeouts)** | Nginx proxy to Vite times out | **Serve `frontend/dist` with Nginx** (try_files); or raise proxy_*_timeout if using dev server |

After starting the process that listens on **8080**, reload the page at **zurt.com.br/app/cards**; the 502 should stop if Nginx is correctly proxying `location /` to `http://localhost:8080`.
