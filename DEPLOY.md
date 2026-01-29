# Deployment Guide

## Quick Deploy

### Railway (5 minutes)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Uni real learning AI"
git remote add origin https://github.com/yourusername/uni.git
git push -u origin main
```

2. **Deploy on Railway**
- Go to railway.app
- "New Project" → "Deploy from GitHub"
- Select repository
- Railway auto-detects Node.js
- Deploys automatically

3. **Access**
- Railway provides URL like `uni.up.railway.app`
- Learning persists in `uni_brain.json`

**Cost**: Free 500hrs/month, then $5/month

---

### Render (Free)

1. **Connect Repository**
- Go to render.com
- "New Web Service"
- Connect GitHub

2. **Configure**
- Name: uni-ai
- Build: `npm install`
- Start: `npm start`
- Create

3. **Access**
- `https://uni-ai.onrender.com`
- Auto SSL certificate

**Note**: Free tier sleeps after 15min idle (wakes in ~30sec)

---

### DigitalOcean ($5/month)

1. **App Platform**
- Create new app
- Connect GitHub
- Auto-detects Node.js

2. **Deploy**
- Automatic builds on push
- Built-in monitoring
- Custom domains

**Cost**: $5/month minimum

---

### AWS EC2 (Full Control)

1. **Launch Instance**
- Ubuntu 22.04
- t2.micro (free tier)
- Open ports 80, 443

2. **Setup**
```bash
# SSH into server
ssh -i key.pem ubuntu@your-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and run
git clone your-repo
cd uni
npm install

# Install PM2
sudo npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

3. **Nginx Reverse Proxy**
```bash
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/uni
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/uni /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. **SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables

Optional `.env`:
```
PORT=3000
NODE_ENV=production
```

---

## Monitoring

### PM2 Monitoring
```bash
pm2 status
pm2 logs uni
pm2 monit
```

### Health Check Endpoint
Add to server.js:
```javascript
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        uptime: process.uptime(),
        knowledge: uni.knowledge.size
    });
});
```

---

## Backup Strategy

### Automated Backups
```bash
# Add to crontab
0 */6 * * * cp /path/to/uni_brain.json /path/to/backups/uni_brain_$(date +\%Y\%m\%d_\%H\%M\%S).json
```

### Cloud Backup
```javascript
// Add to server.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function backupToS3() {
    const data = await fs.readFile('uni_brain.json');
    await s3.putObject({
        Bucket: 'uni-backups',
        Key: `uni_brain_${Date.now()}.json`,
        Body: data
    }).promise();
}

// Backup every hour
setInterval(backupToS3, 3600000);
```

---

## Scaling

### Horizontal Scaling

Use Redis for shared state:

```bash
npm install redis ioredis
```

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Store knowledge in Redis
async saveKnowledge() {
    await redis.set('uni:knowledge', JSON.stringify(Array.from(this.knowledge.entries())));
}
```

### Load Balancer

Nginx upstream:
```nginx
upstream uni_cluster {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    location / {
        proxy_pass http://uni_cluster;
    }
}
```

---

## Security

### Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use('/api/', limiter);
```

### Helmet
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## Performance

### Clustering
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else {
    // Start server
}
```

### Caching
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });

app.get('/api/knowledge', (req, res) => {
    const cached = cache.get('knowledge');
    if (cached) return res.json(cached);
    
    const data = getKnowledge();
    cache.set('knowledge', data);
    res.json(data);
});
```

---

## Troubleshooting

### Port in use
```bash
lsof -i :3000
kill -9 PID
```

### Memory issues
```bash
# Increase Node memory
node --max-old-space-size=4096 server.js
```

### WebSocket not connecting
- Check firewall rules
- Ensure proxy supports WebSocket upgrade
- Verify correct protocol (ws:// vs wss://)

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Auto-restart on crash (PM2)
- [ ] Automated backups scheduled
- [ ] SSL certificate installed
- [ ] Rate limiting enabled
- [ ] Monitoring/logging setup
- [ ] Health check endpoint
- [ ] Custom domain configured
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring

---

## Cost Comparison

| Platform | Free Tier | Paid |
|----------|-----------|------|
| Railway | 500hrs/mo | $5/mo unlimited |
| Render | Yes (sleeps) | $7/mo always-on |
| DigitalOcean | No | $5/mo |
| AWS EC2 | 750hrs/mo (1yr) | ~$10/mo |
| Heroku | No | $7/mo |

---

## Support

- Check logs: `pm2 logs uni`
- Monitor: `pm2 monit`
- Restart: `pm2 restart uni`
- Check brain: `cat uni_brain.json | jq .stats`
