#!/usr/bin/env bash
# Private CA + server cert (IP SAN) + dedicated nginx server block for the
# IFAGRITHM network store. Vercel functions pin the CA, so they get verified
# TLS against the raw IP — no domain, no DNS, no firewall changes.
set -euo pipefail

mkdir -p /etc/nginx/ifg
cd /etc/nginx/ifg

if [ ! -f ifg-ca.crt ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -keyout ifg-ca.key -out ifg-ca.crt \
    -days 3650 -subj "/CN=IFG Network CA" >/dev/null 2>&1
fi
if [ ! -f ifg-server.crt ]; then
  openssl req -newkey rsa:2048 -nodes -keyout ifg-server.key -out ifg-server.csr \
    -subj "/CN=217.77.4.143" >/dev/null 2>&1
  printf "subjectAltName=IP:217.77.4.143\n" > ifg-server.ext
  openssl x509 -req -in ifg-server.csr -CA ifg-ca.crt -CAkey ifg-ca.key \
    -CAcreateserial -out ifg-server.crt -days 1825 -extfile ifg-server.ext >/dev/null 2>&1
  chmod 600 ifg-ca.key ifg-server.key
fi

cat > /etc/nginx/sites-available/ifg-network <<'NGINX'
# IFAGRITHM network store — default_server on 443 catches IP + unknown-SNI
# connections; SNI-matched traffic (unilorinstudentconnect.com) is untouched.
server {
  listen 443 ssl http2 default_server;
  listen [::]:443 ssl http2 default_server;
  server_name _;

  ssl_certificate /etc/nginx/ifg/ifg-server.crt;
  ssl_certificate_key /etc/nginx/ifg/ifg-server.key;
  client_max_body_size 64k;

  location / {
    proxy_pass http://127.0.0.1:4100;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 15s;
  }
}
NGINX

ln -sf /etc/nginx/sites-available/ifg-network /etc/nginx/sites-enabled/ifg-network
nginx -t && systemctl reload nginx
echo "TLS_NGINX_OK"
