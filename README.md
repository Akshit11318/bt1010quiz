# BT1010 Quiz App

Mobile-friendly React quiz app for BT1010 MCQs (Q1/Q2 chapters).

## Run locally

```bash
npm install
npm run dev
```

Dev server runs on **http://localhost:8090**.

## Production build

```bash
npm run build
npm run preview
```

## Docker deploy

```bash
docker build -t bt1010quiz:latest .
docker run -d --name bt1010quiz -p 8090:80 --restart unless-stopped bt1010quiz:latest
```

Open: **http://localhost:8090**

For Cloudflare Tunnel, point service URL to:

`http://localhost:8090`
