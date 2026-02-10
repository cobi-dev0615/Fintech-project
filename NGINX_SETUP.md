# Nginx Configuration for zurT API Routing

## 504 Gateway Time-out – Quick fix checklist

If you see **504 Gateway Time-out** on `https://zurt.com.br`:

1. **For the main page (/)**
   - Ensure `location /` serves **static files** from `frontend/dist`, **not** `proxy_pass` to another server.
   - If you proxy `/` to e.g. `localhost:8080`, the 504 means nothing is running there or it’s too slow. Switch to the static `root` + `try_files` block below (see “Serve frontend” in this doc).
   - Build the frontend: `cd frontend && npm run build`, then point `root` to that `dist` folder.

2. **For /api requests**
   - Backend must be running (e.g. on port 5000). Check: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health` or similar.
   - In nginx, the `location /api` block must have long timeouts (e.g. `proxy_read_timeout 120s;`). Default 60s can cause 504 on slow requests. Use the example config in this repo.

3. **Apply and reload**
   - Edit the site config: `sudo nano /etc/nginx/sites-available/zurt.com.br`
   - Test: `sudo nginx -t`
   - Reload: `sudo systemctl reload nginx`
   - Check logs: `sudo tail -f /var/log/nginx/error.log`

---

## Problem
Requests to `https://www.zurt.com.br/api/auth/login` are returning 404 because nginx is not configured to proxy `/api` requests to the backend server.

## Solution

Add the following location block to your nginx configuration file (usually located at `/etc/nginx/sites-available/zurt.com.br` or `/etc/nginx/conf.d/zurt.com.br.conf`):

```nginx
# Proxy API requests to backend
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Increase timeouts for long-running requests
    proxy_connect_timeout 120s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
}
```

## Complete Example Configuration

Here's a complete nginx server block example:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.zurt.com.br zurt.com.br;

    # Your SSL certificate configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Proxy API requests to backend (port 5000)
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Proxy WebSocket connections
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Critical: WebSocket timeout settings to prevent 504 errors
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
    }

    # Serve frontend from built files (avoids 504 – no upstream process needed)
    location / {
        root /home/Fintech-project/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## Steps to Apply

1. **Edit your nginx configuration file:**
   ```bash
   sudo nano /etc/nginx/sites-available/zurt.com.br
   # or
   sudo nano /etc/nginx/conf.d/zurt.com.br.conf
   ```

2. **Add the `/api location block** (see above)

3. **Test the configuration:**
   ```bash
   sudo nginx -t
   ```

4. **If the test passes, reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

5. **Verify the backend is running:**
   ```bash
   # Check if backend is running on port 5000
   curl http://localhost:5000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'
   ```
   You should get a 401 (Unauthorized) response, not a 404.

6. **Test the API through nginx:**
   ```bash
   curl https://www.zurt.com.br/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'
   ```

## Fixing 504 Gateway Time-out on the frontend

If you see **504 Gateway Time-out** when opening `https://zurt.com.br/`, Nginx is proxying `/` to an upstream (e.g. `http://localhost:8080`) and that upstream is not responding (nothing running or it crashed).

**Fix: serve the built frontend as static files instead of proxying.**

1. Build the frontend once:
   ```bash
   cd /home/Fintech-project/frontend && npm run build
   ```
2. In your Nginx config, replace the `location /` block that uses `proxy_pass http://localhost:8080` with:
   ```nginx
   location / {
       root /home/Fintech-project/frontend/dist;
       index index.html;
       try_files $uri $uri/ /index.html;
   }
   ```
3. Reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`.

After this, the site is served directly by Nginx from `dist/`; no process on port 8080 is needed and the 504 goes away.

## Important Notes

- The backend server must be running on `localhost:5000` (or update the `proxy_pass` URL accordingly)
- Make sure the backend server is accessible from nginx (usually `localhost:5000` works)
- If your backend is on a different host, use `http://167.71.94.65:5000` instead of `localhost:5000`
- The `/api` location block must be placed **before** the `/` location block in your nginx config, as nginx matches locations in order

## WebSocket Configuration (Important!)

The WebSocket `/ws` location block **must** include extended timeout settings to prevent 504 Gateway Timeout errors:

```nginx
location /ws {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Critical: WebSocket timeout settings to prevent 504 errors
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # Disable buffering for WebSocket
    proxy_buffering off;
}
```

**Why these settings are needed:**
- WebSocket connections are long-lived and can stay open for hours/days
- Default nginx timeouts (usually 60s) will close the connection prematurely
- `7d` (7 days) ensures the connection stays open as long as needed
- `proxy_buffering off` prevents nginx from buffering WebSocket frames

## Troubleshooting

If you still get 404 errors after adding the configuration:

1. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify backend is running:**
   ```bash
   ps aux | grep node
   # or
   netstat -tlnp | grep 5000
   ```

3. **Check nginx access logs:**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

4. **Verify the location block is being matched:**
   - Check that `/api` location is before `/` location
   - Ensure there are no conflicting location blocks

### WebSocket 504 Gateway Timeout Errors

If you're seeing `504 Gateway Timeout` errors for WebSocket connections:

1. **Verify WebSocket timeout settings are in place:**
   ```bash
   sudo grep -A 10 "location /ws" /etc/nginx/sites-available/zurt.com.br
   ```
   Make sure `proxy_connect_timeout 7d`, `proxy_send_timeout 7d`, and `proxy_read_timeout 7d` are present.

2. **Check nginx error logs for WebSocket issues:**
   ```bash
   sudo tail -f /var/log/nginx/error.log | grep -i websocket
   ```

3. **Verify backend WebSocket server is running:**
   ```bash
   # Check if backend is listening on port 5000
   netstat -tlnp | grep 5000
   # or
   ss -tlnp | grep 5000
   ```

4. **Test WebSocket connection directly to backend (bypassing nginx):**
   ```bash
   # This should work if backend WebSocket is configured correctly
   wscat -c ws://localhost:5000/ws?token=YOUR_TOKEN
   ```

5. **Reload nginx after making changes:**
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
