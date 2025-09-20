# Bingo Platform Deployment Guide

## Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Deployment Profiles](#deployment-profiles)
- [Offline/Local Deployment](#offlinelocal-deployment)
- [Cloud Production Deployment](#cloud-production-deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Quick Start

### One-Command Deployment (Offline)
```bash
./scripts/deploy.sh --profile offline --observability
```

### Access URLs
- **Main Screen**: http://localhost/screen or http://bingo.local/screen
- **Admin Console**: http://localhost/console or http://bingo.local/console
- **Player App**: http://localhost/player or http://bingo.local/player
- **API Docs**: http://localhost/docs

## Prerequisites

### Required Software
- Docker Engine 24.0+ or Docker Desktop
- Docker Compose v2.20+
- 4GB+ RAM available
- 10GB+ disk space

### Installation
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# macOS/Windows
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
```

## Deployment Profiles

| Profile | Use Case | Services | Port | TLS |
|---------|----------|----------|------|-----|
| `offline` | Local events, no internet | All core services | 80 | No |
| `cloud` | Production deployment | All core services | 80/443 | Yes |
| `obs` | Add monitoring stack | Prometheus, Grafana, Loki | +9090, +3001 | - |

## Offline/Local Deployment

### 1. Setup Environment
```bash
# Copy environment template
cp .env.offline.example .env.offline

# Edit configuration (optional)
nano .env.offline
```

### 2. Deploy Services
```bash
# Basic deployment
docker compose --profile offline up -d

# With monitoring
docker compose --profile offline,obs up -d

# Or use the convenience script
./scripts/deploy.sh --profile offline --observability
```

### 3. Enable mDNS (Optional)
For `bingo.local` access:

**Linux:**
```bash
sudo apt install avahi-daemon
sudo hostnamectl set-hostname bingo
```

**macOS:** Works out of the box with Bonjour

**Windows:** Install [Bonjour Print Services](https://support.apple.com/downloads/bonjour-for-windows)

### 4. Generate QR Code for Mobile Access
```bash
# Install qrencode
sudo apt install qrencode  # Linux
brew install qrencode       # macOS

# Generate QR code
qrencode -o player-qr.png "http://$(hostname -I | awk '{print $1}')/player"
```

## Cloud Production Deployment

### 1. Prerequisites
- Domain name with DNS access
- Server with public IP (AWS, DigitalOcean, etc.)
- Ports 80 and 443 open

### 2. DNS Configuration
Add A record pointing to your server:
```
Type: A
Name: @ (or subdomain)
Value: YOUR_SERVER_IP
TTL: 300
```

### 3. Setup Environment
```bash
# Copy cloud template
cp .env.cloud.example .env.cloud

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.cloud
echo "GAME_SEED_SECRET=$(openssl rand -base64 32)" >> .env.cloud

# Edit configuration
nano .env.cloud
# Set DOMAIN and EMAIL for Let's Encrypt
```

### 4. Deploy to Cloud
```bash
# SSH to your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/your-org/bingo.git
cd bingo

# Deploy with TLS
docker compose --profile cloud,obs up -d
```

### 5. Verify TLS Certificate
```bash
curl -I https://your-domain.com/health
# Should show HTTP/2 200 with valid certificate
```

## Monitoring & Observability

### Access Monitoring Stack
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Loki**: http://localhost:3100

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api realtime

# With timestamps
docker compose logs -f --timestamps

# Last 100 lines
docker compose logs --tail=100
```

### Metrics Available
- API response times (p95, p99)
- WebSocket connections count
- Event throughput rate
- Service health status
- Database connection pool
- Redis operations/sec

### Custom Alerts
Edit `infra/grafana/provisioning/alerting/alerts.yaml` to add custom alerts.

## Backup & Recovery

### Database Backup
```bash
# Manual backup
./scripts/pg-backup.sh

# Automated daily backup (cron)
crontab -e
# Add: 0 2 * * * /path/to/bingo/scripts/pg-backup.sh
```

### Database Restore
```bash
# List available backups
ls -lh backups/

# Restore from backup
./scripts/pg-restore.sh backups/bingo-db-20240115-120000.sql.gz
```

### Full System Backup
```bash
# Backup volumes
docker run --rm -v bingo_pg_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/volumes-$(date +%Y%m%d).tar.gz /data
```

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check logs
docker compose logs

# Check port conflicts
sudo lsof -i :80
sudo lsof -i :3000

# Reset everything
docker compose down -v
docker compose up -d
```

#### Cannot Access bingo.local
1. Check mDNS service is running
2. Verify firewall allows multicast (port 5353)
3. Use IP address instead: `http://<host-ip>/screen`

#### Database Connection Failed
```bash
# Check PostgreSQL is healthy
docker compose ps postgres
docker compose exec postgres pg_isready

# Reset database
docker compose down -v postgres
docker compose up -d postgres
```

#### TLS Certificate Issues (Cloud)
```bash
# Check Caddy logs
docker compose logs web

# Verify DNS
nslookup your-domain.com

# Force certificate renewal
docker compose exec web caddy reload --force
```

### Performance Tuning

#### Resource Limits
Edit `docker-compose.yml`:
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

#### Database Optimization
```sql
-- Connect to database
docker compose exec postgres psql -U bingo

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Vacuum and analyze
VACUUM ANALYZE;
```

## Security Considerations

### Production Checklist
- [ ] Change all default passwords in `.env`
- [ ] Use strong JWT_SECRET (min 32 chars)
- [ ] Enable TLS in cloud deployment
- [ ] Restrict database access (no external ports)
- [ ] Regular security updates: `docker compose pull`
- [ ] Enable firewall (ufw, iptables)
- [ ] Set up fail2ban for SSH
- [ ] Use Docker secrets for sensitive data
- [ ] Enable audit logging
- [ ] Regular backups with encryption

### Firewall Configuration
```bash
# UFW example
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Docker Secrets (Advanced)
```bash
# Create secrets
echo "your-secret" | docker secret create jwt_secret -

# Use in compose
services:
  api:
    secrets:
      - jwt_secret
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
```

## Support & Maintenance

### Health Checks
```bash
# API health
curl http://localhost:3000/health

# Realtime health
curl http://localhost:4000/health

# Overall status
docker compose ps
```

### Update Services
```bash
# Pull latest images
docker compose pull

# Recreate with new images
docker compose up -d --force-recreate
```

### Clean Up
```bash
# Remove stopped containers
docker compose down

# Remove everything including volumes (DANGER!)
docker compose down -v

# Clean Docker system
docker system prune -a
```

## Quick Reference Card

### Essential Commands
```bash
# Start
docker compose --profile offline up -d

# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker compose logs -f

# Backup
./scripts/pg-backup.sh

# Update
docker compose pull && docker compose up -d
```

### Service Ports
- Web UI: 80/443
- API: 3000 (internal)
- Realtime: 4000 (internal)
- PostgreSQL: 5432 (internal)
- Redis: 6379 (internal)
- Prometheus: 9090
- Grafana: 3001

### File Locations
- Environment: `.env.offline`, `.env.cloud`
- Backups: `./backups/`
- Logs: `docker compose logs`
- Data: Docker volumes

---

For additional help, refer to the [GitHub Issues](https://github.com/your-org/bingo/issues) or contact the development team.