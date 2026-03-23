#!/bin/bash
# Deploy script for novosite.barbearia.vip
# Run as root on the server
# Safe for servers with existing NGINX sites

set -e

DOMAIN="novosite.barbearia.vip"
DEPLOY_DIR="/var/www/barbeariavip-website"
REPO_DIR="/opt/barbeariavip-website"

echo "=== Barbearia VIP - Deploy Setup ==="
echo "Domain: $DOMAIN"
echo "Deploy dir: $DEPLOY_DIR"
echo ""

# 1. Create deploy directory
echo "[1/8] Creating deploy directory..."
mkdir -p $DEPLOY_DIR/img/blog

# 2. Clone/pull repo
echo "[2/8] Cloning repository..."
if [ -d "$REPO_DIR/.git" ]; then
    cd $REPO_DIR && git pull
else
    git clone https://github.com/joaorafaelvaz/barbeariavip-website.git $REPO_DIR
fi

# 3. Copy files to deploy directory
echo "[3/8] Copying files..."
rsync -av --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='deploy' \
    --exclude='img/blog/*' \
    $REPO_DIR/ $DEPLOY_DIR/

# 4. Build Tailwind CSS
echo "[4/8] Building Tailwind CSS..."
cd $REPO_DIR
npm install --production=false
npm run build
cp css/style.css $DEPLOY_DIR/css/style.css

# 5. Install Python dependencies
echo "[5/8] Installing Python dependencies..."
pip3 install -r $DEPLOY_DIR/api/requirements.txt

# 6. Setup NGINX (only this site, no touching other configs)
echo "[6/8] Configuring NGINX for $DOMAIN..."
cp $REPO_DIR/deploy/nginx.conf /etc/nginx/sites-available/$DOMAIN

if [ ! -L /etc/nginx/sites-enabled/$DOMAIN ]; then
    ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
fi

echo "  Testing NGINX config (all sites)..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "  NGINX reloaded successfully."
else
    echo "  ERROR: NGINX config test failed! Other sites not affected."
    echo "  Fix the config at /etc/nginx/sites-available/$DOMAIN and run: nginx -t && systemctl reload nginx"
    exit 1
fi

# 7. Setup systemd service for FastAPI
echo "[7/8] Configuring FastAPI service..."
cp $REPO_DIR/deploy/barbeariavip-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable barbeariavip-api
systemctl restart barbeariavip-api

# 8. Set permissions
echo "[8/8] Setting permissions..."
chown -R www-data:www-data $DEPLOY_DIR

echo ""
echo "=== Deploy complete! ==="
echo ""
echo "Existing sites were NOT modified."
echo ""
echo "Next steps:"
echo "  1. DNS: Add A record   $DOMAIN -> $(curl -s ifconfig.me || echo 'SERVER_IP')"
echo "  2. SSL: certbot --nginx -d $DOMAIN"
echo "  3. JWT: Edit /etc/systemd/system/barbeariavip-api.service"
echo "     Change JWT_SECRET, then: systemctl daemon-reload && systemctl restart barbeariavip-api"
echo "  4. Test: curl -I https://$DOMAIN"
