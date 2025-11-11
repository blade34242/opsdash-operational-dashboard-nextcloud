APP_NAME := opsdash
SRC_DIR := $(APP_NAME)
BUILD_DIR := build
DIST_DIR := $(BUILD_DIR)/dist
APP_BUILD_DIR := $(BUILD_DIR)/$(APP_NAME)
VERSION ?= $(shell sed -n 's/.*<version>\(.*\)<\/version>.*/\1/p' $(SRC_DIR)/appinfo/info.xml | head -n 1)

.PHONY: clean deps build test appstore

clean:
	@echo "[make] Cleaning build artifacts"
	rm -rf $(BUILD_DIR)

deps:
	@echo "[make] Installing npm + composer dependencies"
	cd $(SRC_DIR) && npm ci
	cd $(SRC_DIR) && composer install

build:
	@echo "[make] Building SPA assets"
	cd $(SRC_DIR) && npm run build

# Minimal unit tests (Vitest + PHPUnit). Playwright runs in CI against a real NC instance.
test:
	@echo "[make] Running Vitest"
	cd $(SRC_DIR) && npm run test -- --run
	@echo "[make] Running PHPUnit"
	cd $(SRC_DIR) && composer run test:unit

appstore: clean
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required (pass VERSION=x.y.z)" >&2; exit 1; fi
	@echo "[make] Preparing appstore package for $(VERSION)"
	mkdir -p $(APP_BUILD_DIR)
	rsync -a --delete \
	  --exclude='.git' --exclude='.github' --exclude='.idea' --exclude='.vscode' \
	  --exclude='node_modules' --exclude='.vite' --exclude='dist' \
	  --exclude='playwright-report' --exclude='test-results' \
	  $(SRC_DIR)/ $(APP_BUILD_DIR)/
	cd $(APP_BUILD_DIR) && npm ci
	cd $(APP_BUILD_DIR) && npm run build
	cd $(APP_BUILD_DIR) && composer install --no-dev --prefer-dist --optimize-autoloader
	@echo "[make] Removing dev artifacts"
	rm -rf $(APP_BUILD_DIR)/node_modules \
	  $(APP_BUILD_DIR)/test $(APP_BUILD_DIR)/tests \
	  $(APP_BUILD_DIR)/playwright-report $(APP_BUILD_DIR)/test-results \
	  $(APP_BUILD_DIR)/.vscode $(APP_BUILD_DIR)/.idea \
	  $(APP_BUILD_DIR)/.github $(APP_BUILD_DIR)/tools \
	  $(APP_BUILD_DIR)/docker-compose*.yml $(APP_BUILD_DIR)/Dockerfile \
	  $(APP_BUILD_DIR)/src $(APP_BUILD_DIR)/docs
	rm -f $(APP_BUILD_DIR)/package-lock.json $(APP_BUILD_DIR)/pnpm-lock.yaml $(APP_BUILD_DIR)/yarn.lock
	@echo "[make] Creating tarball"
	mkdir -p $(DIST_DIR)
	tar -czf $(DIST_DIR)/$(APP_NAME)-$(VERSION).tar.gz -C $(BUILD_DIR) $(APP_NAME)
	@echo "[make] Package ready: $(DIST_DIR)/$(APP_NAME)-$(VERSION).tar.gz"
	@echo "[make] Signing step (uncomment once certificates are available):"
	@echo "# occ integrity:sign-app --path $(DIST_DIR)/$(APP_NAME) --privateKey /path/key.pem --certificate /path/cert.crt"
