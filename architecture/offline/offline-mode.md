# Offline Mode Architecture

**Version:** 1.0
**Author:** Agent C — System Architect
**Date:** 2025-09-19

## Overview

The Bingo Platform supports complete offline/LAN deployment for venues without reliable internet connectivity. This architecture enables zero-config local deployment with automatic service discovery, self-contained assets, and progressive web app capabilities.

**Key Features:**
- **Zero-Config Deployment:** Single-command Docker Compose setup
- **Automatic Discovery:** mDNS service advertising as bingo.local
- **Self-Contained:** No external CDN dependencies
- **Progressive Web App:** Offline-capable client applications
- **Local Networking:** Optimized for LAN performance (<200ms latency)

**Use Cases:**
- Event venues with poor internet connectivity
- Remote locations without broadband
- Corporate events with restricted networks
- Backup deployment for redundancy
- Development and testing environments

---

## 1. Docker Compose Architecture

### 1.1 Service Configuration

```yaml
# docker-compose.offline.yml
version: '3.8'

services:
  # ================================
  # APPLICATION SERVICES
  # ================================

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: production
    image: bingo-platform/api:latest
    container_name: bingo_api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://bingo:${POSTGRES_PASSWORD}@postgres:5432/bingo
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - GAME_SEED_SECRET=${GAME_SEED_SECRET}
      - PORT=3000
      - CORS_ORIGIN=http://bingo.local:*
      - OFFLINE_MODE=true
      - MDNS_ENABLED=true
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - bingo_network
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  websocket:
    build:
      context: .
      dockerfile: apps/websocket/Dockerfile
      target: production
    image: bingo-platform/websocket:latest
    container_name: bingo_websocket
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - API_URL=http://api:3000
      - PORT=3001
      - CORS_ORIGIN=http://bingo.local:*
      - OFFLINE_MODE=true
    ports:
      - "3001:3001"
    depends_on:
      - redis
      - api
    networks:
      - bingo_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: production
    image: bingo-platform/web:latest
    container_name: bingo_web
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - API_URL=http://bingo.local:3000
      - WS_URL=ws://bingo.local:3001
      - OFFLINE_MODE=true
      - PWA_ENABLED=true
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - websocket
    networks:
      - bingo_network
    volumes:
      - ./nginx/offline.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./static:/usr/share/nginx/html/static:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ================================
  # DATA SERVICES
  # ================================

  postgres:
    image: postgres:15-alpine
    container_name: bingo_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=bingo
      - POSTGRES_USER=bingo
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    ports:
      - "5432:5432"
    networks:
      - bingo_network
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bingo -d bingo"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200

  redis:
    image: redis:7-alpine
    container_name: bingo_redis
    restart: unless-stopped
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
      --appendonly yes
      --appendfsync everysec
    ports:
      - "6379:6379"
    networks:
      - bingo_network
    volumes:
      - redis_data:/data
      - ./redis/offline.conf:/usr/local/etc/redis/redis.conf:ro
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ================================
  # DISCOVERY & NETWORKING
  # ================================

  mdns:
    image: bingo-platform/mdns:latest
    build:
      context: ./tools/mdns
      dockerfile: Dockerfile
    container_name: bingo_mdns
    restart: unless-stopped
    environment:
      - SERVICE_NAME=bingo
      - SERVICE_TYPE=_http._tcp
      - SERVICE_PORT=80
      - SERVICE_HOSTNAME=bingo.local
      - SERVICE_TXT="path=/,version=1.0,mode=offline"
    network_mode: host
    privileged: true
    volumes:
      - /var/run/dbus:/var/run/dbus:ro
    depends_on:
      - web
    healthcheck:
      test: ["CMD", "avahi-browse", "-t", "_http._tcp", "-r"]
      interval: 60s
      timeout: 10s
      retries: 3

  # ================================
  # MONITORING (OPTIONAL)
  # ================================

  prometheus:
    image: prom/prometheus:latest
    container_name: bingo_prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    networks:
      - bingo_network
    volumes:
      - ./monitoring/prometheus-offline.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=7d'
      - '--web.enable-lifecycle'
    profiles: ["monitoring"]

  grafana:
    image: grafana/grafana:latest
    container_name: bingo_grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=
    ports:
      - "3030:3000"
    networks:
      - bingo_network
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-offline.ini:/etc/grafana/grafana.ini:ro
      - ./monitoring/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus
    profiles: ["monitoring"]

# ================================
# NETWORKS & VOLUMES
# ================================

networks:
  bingo_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
    driver_opts:
      com.docker.network.bridge.name: bingo0

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/prometheus
  grafana_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/grafana
```

### 1.2 Environment Configuration

```bash
# .env.offline
# Database Configuration
POSTGRES_PASSWORD=secure_postgres_password_change_me

# Application Secrets
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
GAME_SEED_SECRET=your_game_seed_secret_for_rng_generation

# Monitoring (Optional)
GRAFANA_PASSWORD=admin_password_change_me

# Deployment Settings
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# Network Configuration
BINGO_HOSTNAME=bingo.local
BINGO_DOMAIN=.local
MDNS_ENABLED=true

# Performance Tuning
NODE_OPTIONS=--max-old-space-size=512
REDIS_MAXMEMORY=512mb
POSTGRES_SHARED_BUFFERS=256MB
```

### 1.3 Deployment Scripts

```bash
#!/bin/bash
# deploy-offline.sh

set -euo pipefail

# Configuration
ENV_FILE=".env.offline"
COMPOSE_FILE="docker-compose.offline.yml"
DATA_DIR="./data"
LOGS_DIR="./logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Pre-deployment checks
check_requirements() {
    log "Checking deployment requirements..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi

    # Check available disk space (minimum 5GB)
    available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 5242880 ]; then
        error "Insufficient disk space. Need at least 5GB available."
    fi

    # Check available memory (minimum 2GB)
    available_memory=$(free -m | awk 'NR==2{print $7}')
    if [ "$available_memory" -lt 2048 ]; then
        warn "Low available memory. Recommend at least 2GB for optimal performance."
    fi

    log "Requirements check passed"
}

# Generate secrets if they don't exist
generate_secrets() {
    if [ ! -f "$ENV_FILE" ]; then
        log "Generating environment configuration..."

        cat > "$ENV_FILE" << EOF
# Generated on $(date)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
GAME_SEED_SECRET=$(openssl rand -base64 32)
GRAFANA_PASSWORD=$(openssl rand -base64 16)
EOF

        log "Environment file created: $ENV_FILE"
        warn "Please review and customize the generated secrets"
    fi
}

# Prepare data directories
setup_directories() {
    log "Setting up data directories..."

    mkdir -p "$DATA_DIR"/{prometheus,grafana}
    mkdir -p "$LOGS_DIR"
    mkdir -p ./uploads
    mkdir -p ./ssl

    # Set proper permissions
    chmod 755 "$DATA_DIR"/{prometheus,grafana}
    chmod 755 "$LOGS_DIR"

    log "Directories created successfully"
}

# Build and start services
deploy_services() {
    log "Building and starting Bingo Platform services..."

    # Pull base images
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull postgres redis

    # Build application images
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel

    # Start core services
    log "Starting core services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout 60 bash -c 'until docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U bingo -d bingo; do sleep 2; done'

    # Run database migrations
    log "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api npm run migrate:deploy

    # Start application services
    log "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api websocket web

    # Start mDNS service
    log "Starting mDNS service discovery..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mdns

    log "Deployment completed successfully!"
}

# Health check
check_health() {
    log "Performing health checks..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost/health > /dev/null; then
            log "Health check passed"
            return 0
        fi

        warn "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts"
}

# Display access information
show_access_info() {
    cat << EOF

${GREEN}🎉 Bingo Platform deployed successfully!${NC}

${YELLOW}Access Information:${NC}
  • Web Interface: http://bingo.local
  • API Endpoint: http://bingo.local:3000
  • WebSocket: ws://bingo.local:3001
  • mDNS Service: bingo.local

${YELLOW}Monitoring (if enabled):${NC}
  • Prometheus: http://localhost:9090
  • Grafana: http://localhost:3030

${YELLOW}Direct Access (fallback):${NC}
  • Web Interface: http://$(hostname -I | awk '{print $1}')
  • API Endpoint: http://$(hostname -I | awk '{print $1}'):3000

${YELLOW}Management Commands:${NC}
  • View logs: docker-compose -f $COMPOSE_FILE logs -f
  • Stop services: docker-compose -f $COMPOSE_FILE down
  • Restart: $0 restart
  • Status: docker-compose -f $COMPOSE_FILE ps

${YELLOW}Network Discovery:${NC}
  Clients should automatically discover the service as 'bingo.local'
  If automatic discovery fails, use the direct IP addresses above.

EOF
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "deploy")
            log "Starting Bingo Platform offline deployment..."
            check_requirements
            generate_secrets
            setup_directories
            deploy_services
            check_health
            show_access_info
            ;;

        "restart")
            log "Restarting Bingo Platform..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
            check_health
            log "Restart completed"
            ;;

        "stop")
            log "Stopping Bingo Platform..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
            log "Services stopped"
            ;;

        "logs")
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
            ;;

        "status")
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
            ;;

        "cleanup")
            warn "This will remove all data and containers. Are you sure? (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans
                docker system prune -f
                rm -rf "$DATA_DIR" "$LOGS_DIR"
                log "Cleanup completed"
            else
                log "Cleanup cancelled"
            fi
            ;;

        *)
            echo "Usage: $0 {deploy|restart|stop|logs|status|cleanup}"
            exit 1
            ;;
    esac
}

main "$@"
```

---

## 2. mDNS Service Discovery

### 2.1 mDNS Service Configuration

```dockerfile
# tools/mdns/Dockerfile
FROM alpine:3.18

# Install Avahi for mDNS
RUN apk add --no-cache \
    avahi \
    avahi-tools \
    dbus \
    supervisor

# Create avahi user
RUN addgroup -g 1000 avahi && \
    adduser -D -u 1000 -G avahi avahi

# Copy configuration files
COPY avahi-daemon.conf /etc/avahi/avahi-daemon.conf
COPY bingo.service /etc/avahi/services/bingo.service
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Create necessary directories
RUN mkdir -p /var/run/avahi-daemon && \
    chown avahi:avahi /var/run/avahi-daemon

EXPOSE 5353/udp

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

```ini
# tools/mdns/avahi-daemon.conf
[server]
host-name-from-machine-id=no
host-name=bingo
domain-name=.local
browse-domains=.local
use-ipv4=yes
use-ipv6=no
allow-interfaces=eth0,br-*,docker*
deny-interfaces=lo
ratelimit-interval-usec=1000000
ratelimit-burst=1000

[wide-area]
enable-wide-area=no

[publish]
disable-publishing=no
disable-user-service-publishing=no
add-service-cookie=no
publish-addresses=yes
publish-hinfo=yes
publish-workstation=yes
publish-domain=yes
publish-dns-servers=no
publish-resolv-conf-dns-servers=no
publish-aaaa-on-ipv4=yes
publish-a-on-ipv6=no

[reflector]
enable-reflector=yes
reflect-ipv=no

[rlimits]
rlimit-as=
rlimit-core=0
rlimit-data=8388608
rlimit-fsize=0
rlimit-nofile=768
rlimit-stack=8388608
rlimit-nproc=3
```

```xml
<?xml version="1.0" standalone='no'?>
<!-- tools/mdns/bingo.service -->
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">Bingo Platform on %h</name>

  <!-- HTTP Service -->
  <service>
    <type>_http._tcp</type>
    <port>80</port>
    <txt-record>path=/</txt-record>
    <txt-record>version=1.0</txt-record>
    <txt-record>mode=offline</txt-record>
    <txt-record>platform=bingo</txt-record>
  </service>

  <!-- WebSocket Service -->
  <service>
    <type>_websocket._tcp</type>
    <port>3001</port>
    <txt-record>path=/socket.io</txt-record>
    <txt-record>transport=websocket</txt-record>
  </service>

  <!-- API Service -->
  <service>
    <type>_bingo-api._tcp</type>
    <port>3000</port>
    <txt-record>path=/api/v1</txt-record>
    <txt-record>version=1.0</txt-record>
  </service>
</service-group>
```

### 2.2 Client-Side Service Discovery

```typescript
// Client-side mDNS discovery
interface DiscoveredService {
  name: string;
  host: string;
  port: number;
  addresses: string[];
  txt?: Record<string, string>;
}

class BingoServiceDiscovery {
  private static readonly SERVICE_TYPE = '_http._tcp.local';
  private static readonly DISCOVERY_TIMEOUT = 10000; // 10 seconds

  static async discoverBingoService(): Promise<DiscoveredService | null> {
    // Try mDNS discovery first
    const mdnsService = await this.tryMDNSDiscovery();
    if (mdnsService) {
      return mdnsService;
    }

    // Fallback to common local IPs
    return await this.tryCommonIPs();
  }

  private static async tryMDNSDiscovery(): Promise<DiscoveredService | null> {
    try {
      // Check if bingo.local resolves
      const response = await fetch('http://bingo.local/health', {
        signal: AbortSignal.timeout(this.DISCOVERY_TIMEOUT)
      });

      if (response.ok) {
        return {
          name: 'Bingo Platform',
          host: 'bingo.local',
          port: 80,
          addresses: ['bingo.local'],
          txt: {
            version: '1.0',
            mode: 'offline',
            platform: 'bingo'
          }
        };
      }
    } catch (error) {
      console.log('mDNS discovery failed:', error.message);
    }

    return null;
  }

  private static async tryCommonIPs(): Promise<DiscoveredService | null> {
    const commonIPs = [
      '192.168.1.100', '192.168.1.101', '192.168.1.102',
      '192.168.0.100', '192.168.0.101', '192.168.0.102',
      '10.0.0.100', '10.0.0.101', '10.0.0.102',
      '172.16.0.100', '172.16.0.101', '172.16.0.102'
    ];

    const promises = commonIPs.map(async (ip) => {
      try {
        const response = await fetch(`http://${ip}/health`, {
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const healthData = await response.json();
          if (healthData.service === 'bingo-platform') {
            return {
              name: 'Bingo Platform',
              host: ip,
              port: 80,
              addresses: [ip],
              txt: healthData.meta || {}
            };
          }
        }
      } catch {
        // Ignore failed attempts
      }
      return null;
    });

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }

    return null;
  }
}

// Usage in application
async function initializeApp() {
  const loadingIndicator = document.getElementById('loading');
  loadingIndicator.textContent = 'Discovering Bingo service...';

  const service = await BingoServiceDiscovery.discoverBingoService();

  if (service) {
    console.log('Discovered Bingo service:', service);

    // Configure API client
    const apiClient = new BingoAPIClient({
      baseURL: `http://${service.host}:${service.port || 80}`,
      wsURL: `ws://${service.host}:3001`
    });

    // Initialize application
    const app = new BingoApp(apiClient);
    await app.initialize();

    loadingIndicator.style.display = 'none';
  } else {
    loadingIndicator.innerHTML = `
      <div class="error">
        <h3>Bingo service not found</h3>
        <p>Please ensure the Bingo platform is running on the local network.</p>
        <button onclick="location.reload()">Retry Discovery</button>
      </div>
    `;
  }
}

// Auto-retry discovery on network changes
window.addEventListener('online', () => {
  console.log('Network connection restored, retrying discovery...');
  setTimeout(initializeApp, 1000);
});
```

---

## 3. Asset Bundling & Self-Containment

### 3.1 Build Configuration

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isOffline = mode === 'offline';

  return {
    plugins: [sveltekit()],

    build: {
      target: 'es2020',
      outDir: 'build',
      assetsDir: 'assets',
      sourcemap: !isOffline,

      rollupOptions: {
        output: {
          // Bundle everything locally for offline mode
          manualChunks: isOffline ? undefined : {
            vendor: ['socket.io-client', 'date-fns', 'lucide-svelte'],
            utils: ['src/lib/utils', 'src/lib/stores'],
          },
        },
      },

      // Inline small assets
      assetsInlineLimit: isOffline ? 8192 : 4096,
    },

    define: {
      __OFFLINE_MODE__: isOffline,
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // Self-contained asset handling
    optimizeDeps: {
      include: [
        'socket.io-client',
        'date-fns',
        'lucide-svelte',
      ],
    },

    server: {
      fs: {
        allow: ['..'],
      },
    },
  };
});
```

```json
{
  "name": "@bingo/web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:offline": "vite build --mode offline",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "bundle-assets": "node scripts/bundle-assets.js",
    "optimize-offline": "npm run build:offline && npm run bundle-assets"
  },
  "dependencies": {
    "@sveltejs/kit": "^2.0.0",
    "svelte": "^5.0.0",
    "socket.io-client": "^4.7.0",
    "date-fns": "^3.0.0",
    "lucide-svelte": "^0.400.0",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 3.2 Asset Bundling Script

```javascript
// scripts/bundle-assets.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, '../build');
const assetsDir = path.join(buildDir, 'assets');

class OfflineAssetBundler {
  constructor() {
    this.manifest = {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      assets: {},
      totalSize: 0
    };
  }

  async bundle() {
    console.log('🔄 Bundling assets for offline mode...');

    // Process all assets
    await this.processDirectory(buildDir);

    // Generate asset manifest
    await this.generateManifest();

    // Create offline package
    await this.createOfflinePackage();

    console.log('✅ Offline asset bundling completed');
    console.log(`📦 Total assets: ${Object.keys(this.manifest.assets).length}`);
    console.log(`📊 Total size: ${(this.manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);
  }

  async processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.processDirectory(fullPath);
      } else {
        await this.processFile(fullPath);
      }
    }
  }

  async processFile(filePath) {
    const relativePath = path.relative(buildDir, filePath);
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);

    this.manifest.assets[relativePath] = {
      size: stat.size,
      hash: hash,
      mimeType: this.getMimeType(filePath),
      compressed: this.shouldCompress(filePath)
    };

    this.manifest.totalSize += stat.size;

    // Compress large text files
    if (this.shouldCompress(filePath) && stat.size > 1024) {
      await this.compressFile(filePath, hash);
    }
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  shouldCompress(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.html', '.css', '.js', '.json', '.svg'].includes(ext);
  }

  async compressFile(filePath, hash) {
    // Note: In a real implementation, you might use gzip or brotli compression
    // For simplicity, we're just noting which files should be compressed
    console.log(`📦 Marked for compression: ${path.relative(buildDir, filePath)}`);
  }

  async generateManifest() {
    const manifestPath = path.join(buildDir, 'asset-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(this.manifest, null, 2));
    console.log('📄 Generated asset manifest');
  }

  async createOfflinePackage() {
    // Create a simple offline indicator file
    const offlineMarker = {
      offline: true,
      version: this.manifest.version,
      buildTime: this.manifest.buildTime,
      totalAssets: Object.keys(this.manifest.assets).length,
      totalSize: this.manifest.totalSize
    };

    fs.writeFileSync(
      path.join(buildDir, 'offline.json'),
      JSON.stringify(offlineMarker, null, 2)
    );

    console.log('🔒 Created offline package marker');
  }
}

// Run the bundler
const bundler = new OfflineAssetBundler();
bundler.bundle().catch(console.error);
```

### 3.3 Nginx Configuration for Self-Hosting

```nginx
# nginx/offline.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # CORS for offline mode
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";

    server {
        listen 80;
        server_name bingo.local localhost _;
        root /usr/share/nginx/html;
        index index.html;

        # Health check endpoint
        location /health {
            add_header Content-Type application/json;
            return 200 '{"status":"healthy","service":"bingo-platform","mode":"offline","timestamp":"$time_iso8601"}';
        }

        # API proxy
        location /api/ {
            proxy_pass http://api:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket proxy
        location /socket.io/ {
            proxy_pass http://websocket:3001/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static assets with long cache
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Source "offline";
        }

        # HTML files with no cache
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
            add_header X-Content-Source "offline";
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
            add_header X-Content-Source "offline";
        }

        # Security
        location ~ /\. {
            deny all;
        }

        # Asset manifest
        location /asset-manifest.json {
            add_header Content-Type application/json;
            add_header Cache-Control "no-cache";
        }

        # Offline indicator
        location /offline.json {
            add_header Content-Type application/json;
            add_header Cache-Control "no-cache";
        }
    }
}
```

---

## 4. Progressive Web App (PWA) Strategy

### 4.1 Service Worker Implementation

```typescript
// apps/web/src/service-worker.ts
import { build, files, version } from '$service-worker';

const CACHE_NAME = `bingo-cache-${version}`;
const OFFLINE_CACHE = 'bingo-offline';
const RUNTIME_CACHE = 'bingo-runtime';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/game',
  '/admin',
  '/display',
  ...build,
  ...files
];

// Runtime caching patterns
const RUNTIME_PATTERNS = [
  /^\/api\/v1\/(games|players|health)/, // Cache game data
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/, // Images
  /\.(woff|woff2|ttf|eot)$/ // Fonts
];

interface OfflineQueueItem {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

class OfflineQueue {
  private queue: OfflineQueueItem[] = [];
  private readonly QUEUE_KEY = 'bingo-offline-queue';

  async add(request: Request): Promise<void> {
    const item: OfflineQueueItem = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : undefined,
      timestamp: Date.now()
    };

    this.queue.push(item);
    await this.persist();
  }

  async process(): Promise<void> {
    const queue = [...this.queue];
    this.queue = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });

        if (!response.ok) {
          // Re-queue if failed
          this.queue.push(item);
        }
      } catch (error) {
        // Re-queue if network error
        this.queue.push(item);
      }
    }

    await this.persist();
  }

  private async persist(): Promise<void> {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.put(
      this.QUEUE_KEY,
      new Response(JSON.stringify(this.queue))
    );
  }

  async load(): Promise<void> {
    try {
      const cache = await caches.open(OFFLINE_CACHE);
      const response = await cache.match(this.QUEUE_KEY);

      if (response) {
        this.queue = await response.json();
      }
    } catch (error) {
      console.log('Failed to load offline queue:', error);
    }
  }
}

const offlineQueue = new OfflineQueue();

// Install event - precache assets
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Service worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache core assets
      await cache.addAll(PRECACHE_ASSETS);

      // Load offline queue
      await offlineQueue.load();

      console.log('Precached', PRECACHE_ASSETS.length, 'assets');
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Service worker activating...');

  event.waitUntil(
    Promise.all([
      // Take control immediately
      self.clients.claim(),

      // Cleanup old caches
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== OFFLINE_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        )
      )
    ])
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // Handle offline queueing for mutations
    if (request.url.includes('/api/')) {
      event.respondWith(
        fetch(request).catch(async () => {
          await offlineQueue.add(request.clone());
          return new Response(
            JSON.stringify({ error: 'Offline - queued for retry' }),
            {
              status: 202,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );
    }
    return;
  }

  event.respondWith(handleFetch(request));
});

async function handleFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Handle different request types
  if (url.pathname.startsWith('/api/')) {
    return handleAPIRequest(request);
  }

  if (isStaticAsset(url.pathname)) {
    return handleStaticAsset(request);
  }

  return handleNavigation(request);
}

async function handleAPIRequest(request: Request): Promise<Response> {
  try {
    // Try network first for API requests
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok && shouldCacheAPIResponse(request)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline indicator
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Response': 'true'
        }
      }
    );
  }
}

async function handleStaticAsset(request: Request): Promise<Response> {
  // Check cache first for static assets
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  // Try network and cache
  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return offline fallback for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".35em" font-family="sans-serif" font-size="14" fill="#9ca3af">Image Offline</text></svg>',
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'X-Offline-Fallback': 'true'
          }
        }
      );
    }

    throw error;
  }
}

async function handleNavigation(request: Request): Promise<Response> {
  // Try cache first for navigation
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  // Try network
  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Fallback to cached index.html for SPA
    const indexResponse = await cache.match('/');

    if (indexResponse) {
      return indexResponse;
    }

    // Ultimate fallback
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Bingo Platform - Offline</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; text-align: center; margin-top: 100px; }
          .offline { color: #ef4444; }
          .retry { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1 class="offline">Bingo Platform Offline</h1>
        <p>The application is currently offline. Please check your connection.</p>
        <button class="retry" onclick="location.reload()">Retry Connection</button>
      </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
          'X-Offline-Fallback': 'true'
        }
      }
    );
  }
}

function isStaticAsset(pathname: string): boolean {
  return /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$/.test(pathname);
}

function shouldCacheAPIResponse(request: Request): boolean {
  const url = new URL(request.url);

  // Cache read-only API responses
  return RUNTIME_PATTERNS.some(pattern => pattern.test(url.pathname)) &&
         !url.pathname.includes('/admin/') &&
         !url.searchParams.has('no-cache');
}

// Background sync for offline queue
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'offline-queue') {
    event.waitUntil(offlineQueue.process());
  }
});

// Message handling
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'PROCESS_QUEUE') {
    event.waitUntil(offlineQueue.process());
  }
});

// Periodic sync when online
self.addEventListener('online', () => {
  offlineQueue.process();
});
```

### 4.2 PWA Manifest

```json
{
  "name": "Bingo Platform",
  "short_name": "Bingo",
  "description": "Real-time multiplayer Bingo platform for events",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "any",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop-game.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Game interface on desktop"
    },
    {
      "src": "/screenshots/mobile-card.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Bingo card on mobile"
    }
  ],
  "categories": ["games", "entertainment", "social"],
  "shortcuts": [
    {
      "name": "Join Game",
      "short_name": "Join",
      "description": "Join a game by PIN",
      "url": "/join",
      "icons": [
        {
          "src": "/icons/shortcut-join.png",
          "sizes": "96x96"
        }
      ]
    },
    {
      "name": "GameMaster",
      "short_name": "Admin",
      "description": "GameMaster console",
      "url": "/admin",
      "icons": [
        {
          "src": "/icons/shortcut-admin.png",
          "sizes": "96x96"
        }
      ]
    }
  ],
  "prefer_related_applications": false,
  "offline_enabled": true,
  "custom": {
    "offline_mode": true,
    "discovery_method": "mdns",
    "service_name": "bingo.local"
  }
}
```

---

## 5. Implementation Checklist

### 5.1 Infrastructure Setup

- [ ] **Docker Environment**
  - [ ] Multi-stage Dockerfiles for all services
  - [ ] Production-optimized base images
  - [ ] Health checks for all containers
  - [ ] Resource limits and constraints

- [ ] **Service Discovery**
  - [ ] Avahi/mDNS container configuration
  - [ ] Service registration and announcement
  - [ ] Client-side discovery implementation
  - [ ] Fallback IP discovery mechanism

- [ ] **Networking**
  - [ ] Bridge network configuration
  - [ ] Port mapping and firewall rules
  - [ ] TLS certificate generation (optional)
  - [ ] CORS configuration for offline mode

### 5.2 Application Changes

- [ ] **Build Pipeline**
  - [ ] Offline build mode configuration
  - [ ] Asset bundling and optimization
  - [ ] Dependency vendoring
  - [ ] Cache busting strategies

- [ ] **Service Worker**
  - [ ] Comprehensive caching strategy
  - [ ] Offline queue implementation
  - [ ] Background sync capabilities
  - [ ] Update notifications

- [ ] **Application Logic**
  - [ ] Offline mode detection
  - [ ] Local storage utilization
  - [ ] Graceful degradation
  - [ ] Error boundary implementation

### 5.3 Deployment Automation

- [ ] **Scripts**
  - [ ] One-command deployment script
  - [ ] Health check automation
  - [ ] Backup and restore procedures
  - [ ] Update mechanisms

- [ ] **Documentation**
  - [ ] Venue setup instructions
  - [ ] Troubleshooting guide
  - [ ] Performance tuning guide
  - [ ] Security considerations

---

**Document Status:** Complete and ready for implementation
**Deployment Target:** Single-host venue deployment with <5-minute setup
**Network Requirements:** Local network with mDNS support (most modern networks)
**Hardware Requirements:** 4GB RAM, 20GB storage, dual-core CPU minimum