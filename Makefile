# Bingo Platform - Development & Deployment Commands
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Variables
COMPOSE := docker compose
COMPOSE_DEV := docker compose -f docker-compose.dev.yml
PROFILE ?= offline
ENV_FILE ?= .env

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

.PHONY: help
help: ## Show this help message
	@echo -e "${GREEN}Bingo Platform - Available Commands${NC}"
	@echo -e "${YELLOW}================================${NC}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-20s${NC} %s\n", $$1, $$2}'

# ============ Development Commands ============

.PHONY: dev-up
dev-up: ## Start development environment
	$(COMPOSE_DEV) up -d
	@echo -e "${GREEN}✓ Development environment started${NC}"

.PHONY: dev-down
dev-down: ## Stop development environment
	$(COMPOSE_DEV) down
	@echo -e "${GREEN}✓ Development environment stopped${NC}"

.PHONY: dev-logs
dev-logs: ## View development logs
	$(COMPOSE_DEV) logs -f

.PHONY: dev-build
dev-build: ## Rebuild development containers
	$(COMPOSE_DEV) build

.PHONY: dev-clean
dev-clean: ## Clean development volumes
	$(COMPOSE_DEV) down -v
	@echo -e "${YELLOW}⚠ Development volumes removed${NC}"

# ============ Production Deployment ============

.PHONY: deploy-offline
deploy-offline: ## Deploy offline/local environment
	./scripts/deploy.sh --profile offline --env-file $(ENV_FILE)

.PHONY: deploy-cloud
deploy-cloud: ## Deploy cloud environment
	./scripts/deploy.sh --profile cloud --env-file .env.cloud

.PHONY: deploy-with-monitoring
deploy-with-monitoring: ## Deploy with monitoring stack
	./scripts/deploy.sh --profile $(PROFILE) --observability --env-file $(ENV_FILE)

.PHONY: up
up: ## Start production services (use PROFILE=offline|cloud)
	$(COMPOSE) --profile $(PROFILE) up -d
	@echo -e "${GREEN}✓ Services started with profile: $(PROFILE)${NC}"

.PHONY: down
down: ## Stop all services
	$(COMPOSE) down
	@echo -e "${GREEN}✓ All services stopped${NC}"

.PHONY: restart
restart: ## Restart all services
	$(COMPOSE) restart
	@echo -e "${GREEN}✓ All services restarted${NC}"

# ============ Monitoring & Logs ============

.PHONY: logs
logs: ## View all service logs
	$(COMPOSE) logs -f

.PHONY: logs-api
logs-api: ## View API logs
	$(COMPOSE) logs -f api

.PHONY: logs-realtime
logs-realtime: ## View realtime service logs
	$(COMPOSE) logs -f realtime

.PHONY: status
status: ## Show service status
	@$(COMPOSE) ps

.PHONY: health
health: ## Check service health
	@echo -e "${YELLOW}Checking service health...${NC}"
	@curl -s http://localhost:3000/health | jq . || echo "API not responding"
	@curl -s http://localhost:4000/health | jq . || echo "Realtime not responding"
	@curl -s http://localhost/health || echo "Web not responding"

# ============ Database Management ============

.PHONY: db-backup
db-backup: ## Backup PostgreSQL database
	./scripts/pg-backup.sh
	@echo -e "${GREEN}✓ Database backup completed${NC}"

.PHONY: db-restore
db-restore: ## Restore database from backup (requires BACKUP_FILE)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo -e "${RED}Error: BACKUP_FILE not specified${NC}"; \
		echo "Usage: make db-restore BACKUP_FILE=backups/bingo-db-YYYYMMDD.sql.gz"; \
		exit 1; \
	fi
	./scripts/pg-restore.sh $(BACKUP_FILE)

.PHONY: db-shell
db-shell: ## Open PostgreSQL shell
	$(COMPOSE) exec postgres psql -U bingo -d bingo

.PHONY: migrate
migrate: ## Run database migrations (if using Prisma/migrations)
	$(COMPOSE) exec api npx prisma migrate deploy 2>/dev/null || echo "Migrations not configured"

# ============ Build & Test ============

.PHONY: build
build: ## Build all Docker images
	$(COMPOSE) build
	@echo -e "${GREEN}✓ All images built${NC}"

.PHONY: build-no-cache
build-no-cache: ## Build images without cache
	$(COMPOSE) build --no-cache

.PHONY: test
test: ## Run all tests
	pnpm test

.PHONY: lint
lint: ## Run linters
	pnpm lint

.PHONY: format
format: ## Format code
	pnpm format

# ============ Utility Commands ============

.PHONY: clean
clean: ## Clean all data (DANGEROUS!)
	@echo -e "${RED}⚠ WARNING: This will delete all data!${NC}"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(COMPOSE) down -v; \
		rm -rf backups/*.sql.gz; \
		echo -e "${RED}✓ All data cleaned${NC}"; \
	else \
		echo "Cancelled"; \
	fi

.PHONY: shell-api
shell-api: ## Open shell in API container
	$(COMPOSE) exec api sh

.PHONY: shell-realtime
shell-realtime: ## Open shell in realtime container
	$(COMPOSE) exec realtime sh

.PHONY: pull
pull: ## Pull latest images
	$(COMPOSE) pull
	@echo -e "${GREEN}✓ Images updated${NC}"

.PHONY: qr
qr: ## Generate QR code for player app
	@command -v qrencode >/dev/null 2>&1 || { echo "qrencode not installed"; exit 1; }
	@IP=$$(hostname -I | awk '{print $$1}'); \
	qrencode -o player-qr.png "http://$$IP/player"; \
	echo -e "${GREEN}✓ QR code saved to player-qr.png${NC}"; \
	echo -e "Player URL: http://$$IP/player"

.PHONY: env-setup
env-setup: ## Setup environment file
	@if [ ! -f "$(ENV_FILE)" ]; then \
		cp $(ENV_FILE).example $(ENV_FILE) 2>/dev/null || \
		cp .env.offline.example $(ENV_FILE); \
		echo -e "${GREEN}✓ Environment file created: $(ENV_FILE)${NC}"; \
		echo -e "${YELLOW}⚠ Please edit $(ENV_FILE) and update secrets${NC}"; \
	else \
		echo -e "${YELLOW}Environment file already exists: $(ENV_FILE)${NC}"; \
	fi

.PHONY: install-deps
install-deps: ## Install pnpm dependencies
	pnpm install --frozen-lockfile
	@echo -e "${GREEN}✓ Dependencies installed${NC}"

# ============ Monitoring Commands ============

.PHONY: grafana
grafana: ## Open Grafana dashboard
	@echo -e "${GREEN}Opening Grafana at http://localhost:3001${NC}"
	@echo "Login: admin / admin (or check GRAFANA_ADMIN_PASSWORD)"
	@command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:3001 || \
	command -v open >/dev/null 2>&1 && open http://localhost:3001 || \
	echo "Please open http://localhost:3001 in your browser"

.PHONY: prometheus
prometheus: ## Open Prometheus dashboard
	@echo -e "${GREEN}Opening Prometheus at http://localhost:9090${NC}"
	@command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:9090 || \
	command -v open >/dev/null 2>&1 && open http://localhost:9090 || \
	echo "Please open http://localhost:9090 in your browser"