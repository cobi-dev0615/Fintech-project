# WebSocket Nginx Configuration for zurT

## Problem
WebSocket connections to `wss://zurt.com.br/ws` are failing with `504 Gateway Timeout` errors. This happens because nginx is not properly configured to proxy WebSocket connections.

## Solution

Add or update the `/ws` location block in your nginx configuration file with the following settings:

### Complete WebSocket Configuration

```nginx
# Proxy WebSocket connections
location /ws {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    
    # WebSocket upgrade headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # CRITICAL: Extended timeouts for WebSocket (prevents 504 errors)
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # Disable buffering for WebSocket frames
    proxy_buffering off;
    
    # Additional WebSocket-specific settings
    proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
    proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
    proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
}
```

## Complete Server Block Example

Here's a complete nginx server block configuration:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.zurt.com.br zurt.com.br;

    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy WebSocket connections - CRITICAL FOR WEBSOCKET TO WORK
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CRITICAL: Extended timeouts (prevents 504 Gateway Timeout)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        
        # Disable buffering
        proxy_buffering off;
        
        # WebSocket-specific headers
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
    }

    # Serve frontend
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

1. **Edit your nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/zurt.com.br
   # or
   sudo nano /etc/nginx/conf.d/zurt.com.br.conf
   ```

2. **Add or update the `/ws` location block** with the configuration above

3. **IMPORTANT: Place `/ws` location BEFORE `/` location** - nginx matches locations in order, and more specific paths should come first

4. **Test the configuration:**
   ```bash
   sudo nginx -t
   ```

5. **If test passes, reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

6. **Verify WebSocket endpoint is accessible:**
   ```bash
   # Test WebSocket connection
   curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: test" \
     https://www.zurt.com.br/ws
   ```
   
   You should see a `101 Switching Protocols` response (or 400/401 if authentication is required), NOT a 504.

## Why These Settings Are Critical

1. **`proxy_connect_timeout 7d`**: WebSocket connections are long-lived. Default nginx timeout (60s) will close the connection prematurely, causing 504 errors.

2. **`proxy_send_timeout 7d`**: Prevents timeout when sending WebSocket frames.

3. **`proxy_read_timeout 7d`**: Prevents timeout when reading WebSocket frames.

4. **`proxy_buffering off`**: WebSocket frames should not be buffered - they need to be sent immediately.

5. **`Connection "upgrade"`**: Required to upgrade HTTP connection to WebSocket.

6. **`Upgrade $http_upgrade`**: Passes the Upgrade header from client to backend.

## Troubleshooting

### Still getting 504 errors?

1. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify backend WebSocket server is running:**
   ```bash
   # Check if backend is listening on port 5000
   netstat -tlnp | grep 5000
   # or
   ss -tlnp | grep 5000
   ```

3. **Test WebSocket directly to backend (bypassing nginx):**
   ```bash
   # Install wscat if needed: npm install -g wscat
   wscat -c ws://localhost:5000/ws?token=YOUR_TOKEN
   ```
   
   If this works, the issue is nginx configuration. If it doesn't, check backend WebSocket setup.

4. **Verify location block order:**
   ```bash
   sudo grep -A 15 "location /" /etc/nginx/sites-available/zurt.com.br
   ```
   
   `/ws` should come BEFORE `/` in the configuration file.

5. **Check for conflicting location blocks:**
   ```bash
   sudo grep -n "location" /etc/nginx/sites-available/zurt.com.br
   ```

### Common Issues

- **504 Gateway Timeout**: Missing or incorrect timeout settings in `/ws` location block
- **502 Bad Gateway**: Backend server not running or not accessible
- **404 Not Found**: `/ws` location block missing or incorrect `proxy_pass` URL
- **Connection refused**: Backend WebSocket server not listening on port 5000

## Verification

After applying the configuration, the WebSocket connection should:
- Connect successfully without 504 errors
- Stay connected for extended periods
- Receive and send messages properly
- Reconnect automatically if connection drops

The client-side code will automatically retry connections, but the nginx configuration must be correct for WebSockets to work.
