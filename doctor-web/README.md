# PatientCare Doctor Web Portal

Next.js doctor portal mirroring the doctor-mobile Expo app. Uses the same backend APIs (`/api/auth/*`, `/api/doctor/*`).

## Setup

```bash
cd doctor-web
# Prefer local install when disk allows:
# npm install
# Or symlink shared deps (dev only):
# ln -s ../path/to/admin/node_modules node_modules

cp .env.local.example .env.local   # if present
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Env

- `NEXT_PUBLIC_API_URL` — Django API base (same as `EXPO_PUBLIC_API_URL`)
- `NEXT_PUBLIC_WHATSAPP_REDIRECT_URI` — e.g. `http://localhost:3001/whatsapp/callback`

Backend should set `DOCTOR_WEB_WHATSAPP_REDIRECT_URI` for Embedded Signup web return.

## Scripts

- `npm run dev` — port 3001
- `npm run build`
- `npm start`
