# AWS Deploy Setup (GitHub Actions + PM2 + Nginx)

## What I generated
- `.github/workflows/deploy.yml` — GitHub Actions pipeline to push to EC2 and restart PM2
- `ecosystem.config.js` — PM2 configuration (entry: `src/server.js`, port: 3004)
- `appspec.yml` + `scripts/` — Optional CodeDeploy files if you want AWS-native pipeline

## EC2 One-time Setup (run these on the server)
```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl build-essential nginx
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt -y install nodejs
sudo npm i -g pm2

# Create deploy user & app dir
sudo adduser deploy --gecos "" --disabled-password
sudo usermod -aG sudo deploy
sudo mkdir -p /var/www/store-backend
sudo chown -R deploy:deploy /var/www/store-backend

# Nginx reverse proxy (edit server_name)
sudo bash -lc 'cat > /etc/nginx/sites-available/store-backend <<EOF
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF'
sudo ln -s /etc/nginx/sites-available/store-backend /etc/nginx/sites-enabled/store-backend || true
sudo nginx -t && sudo systemctl reload nginx
```

## GitHub Secrets to add
- `EC2_HOST` = your-ec2-ip-or-dns
- `EC2_USER` = `deploy`
- `EC2_KEY`  = private key content for the deploy user (PEM)
- `APP_DIR`  = `/var/www/store-backend`
- `ENV_FILE` = the entire content of your production `.env` (optional, or use SSM)

## Deploy
- Push to `main` → Actions runs → syncs code to EC2 → installs deps → PM2 reload
