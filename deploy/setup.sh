#!/bin/bash
# Deploy script for novosite.barbeariavip.com.br
# Run as root on the server

set -e

DOMAIN="novosite.barbeariavip.com.br"
DEPLOY_DIR="/var/www/barbeariavip-website"
REPO_DIR="/opt/barbeariavip-website"

echo "=== Barbearia VIP - Deploy Setup ==="

# 1. Create deploy directory
echo "[1/7] Creating deploy directory..."
mkdir -p $DEPLOY_DIR/img/blog

# 2. Clone/pull repo
echo "[2/7] Cloning repository..."
if [ -d "$REPO_DIR" ]; then
    cd $REPO_DIR && git pull
else
    git clone https://github.com/YOUR_USER/barbeariavip-website.git $REPO_DIR
fi

# 3. Copy files to deploy directory
echo "[3/7] Copying files..."
rsync -av --exclude='node_modules' --exclude='.git' --exclude='deploy' \
    $REPO_DIR/ $DEPLOY_DIR/

# 4. Build Tailwind CSS
echo "[4/7] Building Tailwind CSS..."
cd $REPO_DIR
npm install
npm run build
cp css/style.css $DEPLOY_DIR/css/style.css

# 5. Install Python dependencies
echo "[5/7] Installing Python dependencies..."
pip3 install -r $DEPLOY_DIR/api/requirements.txt

# 6. Setup NGINX
echo "[6/7] Configuring NGINX..."
cp $REPO_DIR/deploy/nginx.conf /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 7. Setup systemd service
echo "[7/7] Configuring FastAPI service..."
cp $REPO_DIR/deploy/barbeariavip-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable barbeariavip-api
systemctl restart barbeariavip-api

# Set permissions
chown -R www-data:www-data $DEPLOY_DIR

echo ""
echo "=== Deploy complete! ==="
echo ""
echo "Next steps:"
echo "  1. Update DNS: A record for $DOMAIN -> server IP"
echo "  2. Get SSL cert: certbot --nginx -d $DOMAIN"
echo "  3. Update JWT_SECRET in /etc/systemd/system/barbeariavip-api.service"
echo "     Then: systemctl daemon-reload && systemctl restart barbeariavip-api"
echo "  4. Update CORS origins in api/main.py with https://$DOMAIN"
echo "  5. Test: curl https://$DOMAIN"
