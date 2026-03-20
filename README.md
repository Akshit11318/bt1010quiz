# BT1010 Quiz App

Mobile-friendly React quiz app for BT1010 MCQs (Q1/Q2 chapters).

## Run locally

```bash
npm install
npm run dev
```

Dev server runs on **http://127.0.0.1:8090**.

## Production build

```bash
npm run build
npm run preview
```

## Docker deploy

```bash
git clone https://github.com/Akshit11318/bt1010quiz.git
cd bt1010quiz
docker build -t bt1010quiz:latest .
docker rm -f bt1010quiz 2>/dev/null || true
docker run -d --name bt1010quiz -p 127.0.0.1:8090:80 --restart unless-stopped bt1010quiz:latest
```

Open: **http://127.0.0.1:8090**

## Cloudflare Tunnel (bio)

Update your tunnel config to:

```yaml
ingress:
  - hostname: bio.kryptolo121.xyz
    service: http://127.0.0.1:8090
  - service: http_status:404
```

Then restart tunnel:

```bash
cloudflared tunnel run
```

## Reapply updates after `git pull` (Docker)

```bash
cd bt1010quiz
git pull
docker rm -f bt1010quiz 2>/dev/null || true
docker build -t bt1010quiz:latest .
docker run -d --name bt1010quiz -p 127.0.0.1:8090:80 --restart unless-stopped bt1010quiz:latest
```
