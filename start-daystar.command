#!/bin/zsh
cd "/Users/hezhenyang/Documents/Daystar信息录入项目/daystar-crm"
export PATH="/Users/hezhenyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/hezhenyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH"
export HOME="/Users/hezhenyang/Documents/Daystar信息录入项目/.home"
export PNPM_HOME="/Users/hezhenyang/Documents/Daystar信息录入项目/.pnpm-cache"
export XDG_CACHE_HOME="/Users/hezhenyang/Documents/Daystar信息录入项目/.pnpm-cache"
export npm_config_store_dir="/Users/hezhenyang/Documents/Daystar信息录入项目/.pnpm-store"
export NEXT_TELEMETRY_DISABLED=1
export WATCHPACK_POLLING=true
pnpm dev --hostname 127.0.0.1 --port 3000
