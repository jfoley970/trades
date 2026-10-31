# Trades Dispatch mobile

Homeowner app for the Phase 0 LAN beta. Expo SDK 58, React Native, TypeScript.

A homeowner can open this on a phone and request a small house call for a plumber, electrician, or HVAC tech. The list starts empty. Submitting a request calls `GET` and `POST /house-calls` on the existing Fastify API. Video chat is not in this app.

Sign-in is not implemented. The house-call API is unauthenticated. Keep it on the LAN.

## Run

```bash
cd apps/mobile
npm start
```

Open the project in Expo Go, an emulator, or `npm run web`.

The app uses `EXPO_PUBLIC_API_URL`. The default is `http://10.225.30.31/api`, which is Caddy on the LAN beta. Caddy strips the `/api` prefix before Fastify. To talk to an API process directly, set `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000` and restart Metro so the value is inlined.

iOS allows that private-network HTTP URL. Android allows cleartext because the LAN beta is HTTP.
