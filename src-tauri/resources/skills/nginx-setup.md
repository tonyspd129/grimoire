---
name: nginx-setup
description: Configure nginx as reverse proxy with SSL, debug 502/503/504 errors, upstream issues
category: system
triggers: [nginx, proxy, ssl, 502, 503, 504, upstream, certbot, reverse-proxy, load-balancer]
---

## Nginx — Reverse Proxy + SSL Setup and Debugging

### Minimal reverse proxy config

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

### SSL with Certbot

```bash
certbot --nginx -d example.com -d www.example.com
certbot renew --dry-run        # test renewal
systemctl status certbot.timer # check auto-renewal
```

### Diagnosing 502 Bad Gateway

```bash
nginx -t                                    # test config syntax
tail -50 /var/log/nginx/error.log           # see actual error
curl -v http://localhost:8080               # is upstream responding?
ss -tlnp | grep 8080                        # is the port listening?
journalctl -u myapp --since "5 min ago"    # is the app running?
```

**502 root causes (in order of frequency):**
1. Backend not running → start/restart the service
2. Backend listening on wrong port → check service config
3. Backend crashing on startup → check app logs
4. Firewall blocking loopback → `ufw allow` or check iptables
5. SELinux blocking proxy → `setsebool -P httpd_can_network_connect 1`

### Diagnosing 504 Gateway Timeout

```bash
# Increase timeout for slow upstreams
proxy_read_timeout 300s;
proxy_connect_timeout 60s;
proxy_send_timeout 300s;
```

### Performance tuning

```nginx
# In http {} block
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
gzip on;
gzip_types text/plain application/json application/javascript text/css;
client_max_body_size 50M;
```

### Log format for debugging

```nginx
log_format main '$time_local $request_method $status $upstream_response_time $request_uri';
access_log /var/log/nginx/access.log main;
```

### Reload vs restart

```bash
nginx -t && systemctl reload nginx   # zero-downtime config reload
systemctl restart nginx              # full restart (brief downtime)
```
