#!/usr/bin/env bash
# DB + roles + service skeleton for the IFAGRITHM network store.
# Secrets are generated on the box and written straight into
# /opt/ifg-network/.env — nothing is echoed back to the client.
set -euo pipefail

OWNER_PW=$(openssl rand -hex 24)
APP_PW=$(openssl rand -hex 24)
STORE_SECRET=$(openssl rand -hex 32)

# --- database + roles (owner/app split per box convention) ---
sudo -u postgres psql -v ON_ERROR_STOP=1 --set=owner_pw="$OWNER_PW" --set=app_pw="$APP_PW" <<'SQL'
CREATE ROLE ifagrithm_owner LOGIN PASSWORD :'owner_pw';
CREATE ROLE ifagrithm_app LOGIN PASSWORD :'app_pw';
CREATE DATABASE ifagrithm OWNER ifagrithm_owner;
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 --dbname=ifagrithm <<'SQL'
SET ROLE ifagrithm_owner;
CREATE TABLE applications (
  id          serial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  full_name   text NOT NULL,
  x_handle    text NOT NULL,
  telegram    text NOT NULL,
  email       text NOT NULL,
  country     text NOT NULL,
  role        text NOT NULL,
  desks       text[] NOT NULL DEFAULT '{}',
  links       text NOT NULL,
  context     text NOT NULL DEFAULT '',
  why         text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  claim_token text,
  claimed_at  timestamptz
);
CREATE INDEX applications_status_idx ON applications (status, created_at DESC);
CREATE UNIQUE INDEX applications_claim_token_idx ON applications (claim_token);
GRANT USAGE ON SCHEMA public TO ifagrithm_app;
GRANT SELECT, INSERT, UPDATE ON applications TO ifagrithm_app;
GRANT USAGE, SELECT ON SEQUENCE applications_id_seq TO ifagrithm_app;
REVOKE DELETE, TRUNCATE ON applications FROM ifagrithm_app;
SQL

# --- service skeleton per box convention ---
id -u ifg-network >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin ifg-network
mkdir -p /opt/ifg-network
cat > /opt/ifg-network/.env <<ENV
DATABASE_URL=postgresql://ifagrithm_app:${APP_PW}@127.0.0.1:5432/ifagrithm
MIGRATION_URL=postgresql://ifagrithm_owner:${OWNER_PW}@127.0.0.1:5432/ifagrithm
STORE_SECRET=${STORE_SECRET}
RESEND_KEY=
RESEND_FROM=onboarding@resend.dev
PORT=4100
ENV
chown -R ifg-network:ifg-network /opt/ifg-network
chmod 600 /opt/ifg-network/.env
chmod 750 /opt/ifg-network

echo "DB_ROLES_OK TABLE_OK ENV_OK"
