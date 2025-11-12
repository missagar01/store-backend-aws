#!/bin/bash
set -e
APP_DIR="/var/www/app"
cd "$APP_DIR"
npm ci --omit=dev
