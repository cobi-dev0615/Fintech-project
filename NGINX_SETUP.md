# Nginx Configuration for zurT API Routing

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
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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
    }

    # Serve frontend (Vite dev server on port 8080)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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

## Important Notes

- The backend server must be running on `localhost:5000` (or update the `proxy_pass` URL accordingly)
- Make sure the backend server is accessible from nginx (usually `localhost:5000` works)
- If your backend is on a different host, use `http://167.71.94.65:5000` instead of `localhost:5000`
- The `/api` location block must be placed **before** the `/` location block in your nginx config, as nginx matches locations in order

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
