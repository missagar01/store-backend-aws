#!/bin/bash
set -e
APP_DIR="/var/www/app"
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save
