# Convenience commands for the pnpm workspace. Install and formatting run once
# at the repository root (one lockfile, one Prettier config). The other targets
# run each app's own pnpm scripts (apps/<name>/package.json): apps that do not
# define a script are skipped, and new folders in apps/ are picked up
# automatically.
#
#   make build              all apps
#   make build APP=backend  one app

APP ?=
DEV_APP ?= backend
APPS := $(if $(APP),apps/$(APP),$(wildcard apps/*))

ifneq ($(APP),)
ifeq ($(wildcard apps/$(APP)/package.json),)
$(error APP=$(APP): apps/$(APP)/package.json not found)
endif
endif

# $(call run,<script>[,<apps>]): run a pnpm script in each app that has a package.json
define run
@for app in $(or $(2),$(APPS)); do \
	if [ -f $$app/package.json ]; then \
		echo "==> $$app: $(1)"; \
		pnpm -C $$app --if-present run $(1) || exit 1; \
	fi; \
done
endef

.DEFAULT_GOAL := help
.PHONY: help install dev start build lint typecheck format format-check test check clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo
	@echo "Limit to one app with APP=<name>, e.g. make build APP=backend"

install: ## Install dependencies for the whole workspace
	pnpm install --frozen-lockfile

dev: ## Run one app in watch mode (DEV_APP=backend by default)
	pnpm -C apps/$(or $(APP),$(DEV_APP)) run dev

start: ## Run the compiled app (run make build first)
	$(call run,start)

build: ## Build every app
	$(call run,build)

lint: ## Run ESLint
	$(call run,lint)

typecheck: ## Type-check without emitting files
	$(call run,typecheck)

format: ## Format the repository with Prettier
	pnpm run format

format-check: ## Check formatting with Prettier
	pnpm run format:check

test: ## Run the tests (apps without tests are skipped)
	$(call run,test)

check: lint typecheck format-check test build ## Everything CI should run

clean: ## Remove build output and installed dependencies
	@for app in $(APPS); do rm -rf $$app/dist $$app/node_modules; done
	rm -rf node_modules
