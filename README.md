# Adam Royal Entertainments – Website

```
adam-royal-website/
├── public/            ← the website (index.html) + fonts/
└── server/
    ├── server.js      ← serves the site + sends contact form emails
    ├── package.json
    ├── .env           ← put your SMTP password / emails here
    └── .env.example
```

## 1. Fill in `server/.env`
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=adamfinastrarender@gmail.com
SMTP_PASSWORD=your-16-character-app-password
MAIL_FROM="Adam Royal Website <adamfinastrarender@gmail.com>"
MAIL_TO=the-inbox-that-receives-enquiries@example.com
```
Gmail: use an **App Password** (Google Account → Security → 2-Step Verification → App passwords), not your normal password.

## 2. Run
```
cd server
npm install
npm start
```
Open http://localhost:3000 – the contact form posts to `/api/contact` and the email arrives at `MAIL_TO`.
On a live server, run it with pm2 (`pm2 start server.js --name adam-royal`) and point your domain / Nginx to port 3000.

## Font
Put `PolymathDisplay-Demo.woff2` (or .woff / .otf / .ttf) in `public/fonts/`.
