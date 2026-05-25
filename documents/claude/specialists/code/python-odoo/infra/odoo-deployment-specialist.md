# Odoo Deployment Specialist — Enterprise
# Odoo Deployment Chuyen Gia — Enterprise
# Odoo デプロイメント スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Deployment
**Category**: infra
**Purpose**: Deploy Odoo with Docker, Nginx reverse proxy, workers configuration, and database management

---

## Metadata

```json
{
  "id": "odoo-deployment-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Deployment",
  "category": "infra",
  "subcategory": "odoo",
  "lines": 230,
  "token_cost": 2900,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (administration/install)",
    "E2: Docker Hub odoo:18 (official Docker image)",
    "E3: Odoo.sh documentation (cloud deployment)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | Project root: `docker-compose.yml`, `odoo.conf` |
| **Variant** | enterprise |
| **Pattern Numbers** | 427.1–427.8 |
| **Source Paths** | `docker-compose*.yml`, `odoo.conf`, `Dockerfile` |
| **File Count** | 2–5 infra files |
| **Naming Convention** | `docker-compose.yml`, `odoo.conf`, `nginx.conf` |
| **Imports From** | N/A (infrastructure config) |
| **Imported By** | Docker, systemd, Nginx |
| **Cannot Import** | N/A |
| **Dependencies** | `docker>=24`, `docker-compose>=2`, `nginx>=1.24`, `postgresql>=13`, `wkhtmltopdf-0.12.6.1` |
| **When To Use** | Setting up Odoo production/staging environments with Docker, Nginx, and PostgreSQL |
| **Source Skeleton** | `docker-compose.yml`, `config/odoo.conf`, `nginx/odoo.conf` |
| **Specialist Type** | code |
| **Purpose** | Deploy Odoo with Docker, Nginx reverse proxy, workers configuration, and database management |
| **Activation Trigger** | files: `docker-compose*.yml`, `odoo.conf`; keywords: docker, nginx, workers, db_host |

---

## Role

You are an **Odoo Deployment Specialist** for Odoo 18 Enterprise.

**Used by**: Code agents setting up deployment infrastructure
**Not used by**: Development environment (odoo-bin direct), code generation

---

## Patterns

### Pattern 427.1–427.3: Docker Deployment (CRITICAL)

**427.1 docker-compose.yml**: Standard Odoo + PostgreSQL setup.

```yaml
version: '3.8'
services:
  odoo:
    image: odoo:18
    ports:
      - "8069:8069"
      - "8072:8072"  # longpolling
    volumes:
      - odoo-data:/var/lib/odoo
      - ./addons:/mnt/extra-addons
      - ./config/odoo.conf:/etc/odoo/odoo.conf
    depends_on:
      - db
    environment:
      - HOST=db
      - USER=odoo
      - PASSWORD=odoo

  db:
    image: postgres:16
    environment:
      - POSTGRES_USER=odoo
      - POSTGRES_PASSWORD=odoo
      - POSTGRES_DB=postgres
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  odoo-data:
  db-data:
```

**427.2 odoo.conf**: Server configuration.

```ini
[options]
addons_path = /mnt/extra-addons,/opt/odoo/addons
admin_passwd = $pbkdf2-sha512$...
db_host = db
db_port = 5432
db_user = odoo
db_password = odoo
dbfilter = ^mydb$
workers = 4
max_cron_threads = 1
limit_memory_hard = 2684354560
limit_memory_soft = 2147483648
limit_time_cpu = 600
limit_time_real = 1200
proxy_mode = True
```

**427.3 Workers formula**: `workers = (CPU_cores * 2) + 1`. Each worker handles one request.

```ini
# 4-core server: workers = 4*2+1 = 9 (reserve 1 for cron)
workers = 8
max_cron_threads = 1
```

### Pattern 427.4–427.6: Nginx & Service (HIGH)

**427.4 Nginx reverse proxy**: SSL termination + load balancing.

```nginx
upstream odoo {
    server 127.0.0.1:8069;
}
upstream odoo-chat {
    server 127.0.0.1:8072;
}
server {
    listen 443 ssl;
    server_name odoo.example.com;
    ssl_certificate /etc/ssl/certs/odoo.crt;
    ssl_certificate_key /etc/ssl/private/odoo.key;

    location / {
        proxy_pass http://odoo;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /websocket {
        proxy_pass http://odoo-chat;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    client_max_body_size 200m;
}
```

**427.5 systemd service**: For non-Docker deployments.

```ini
[Unit]
Description=Odoo 18
After=postgresql.service

[Service]
Type=simple
User=odoo
ExecStart=/opt/odoo/odoo-bin -c /etc/odoo/odoo.conf
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**427.6 Multi-database (dbfilter)**: Restrict which databases are visible.

```ini
dbfilter = ^%h$  # Database name matches hostname
# Or fixed:
dbfilter = ^production$
```

### Pattern 427.7–427.8: Backup & Cloud (MEDIUM)

**427.7 Backup/restore**: pg_dump for database, filestore copy.

```bash
# Backup
pg_dump -Fc -h localhost -U odoo production > backup.dump
tar czf filestore.tar.gz /var/lib/odoo/filestore/production/

# Restore
pg_restore -h localhost -U odoo -d production backup.dump
tar xzf filestore.tar.gz -C /var/lib/odoo/filestore/
```

**427.8 Odoo.sh**: Cloud deployment platform (Enterprise only). Git-based deployment with staging/production branches.

---

## Abnormal Case Patterns (2 patterns)

1. **proxy_mode missing** — without `proxy_mode = True`, Odoo sees Nginx IP instead of client IP. Fix: Always set `proxy_mode = True` behind a reverse proxy.
2. **workers = 0 in production** — runs single-threaded, can't handle concurrent users. Fix: Always set workers > 0 in production.

---

*Odoo Deployment Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
