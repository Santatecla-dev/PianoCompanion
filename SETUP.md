# Piano Companion local setup

## 1. Start PostgreSQL

From `C:\PianoCompanionDev`:

```powershell
docker compose up -d
```

PostgreSQL uses host port `5433` because BuddyApp already uses `5432`.

## 2. Start the API

In a second terminal:

```powershell
cd C:\PianoCompanionDev\backend
npm run start:dev
```

The API runs at `http://localhost:3001`.

Useful endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (Bearer token required)
- `GET /pieces`
- `POST /practice/sessions` (Bearer token required)
- `GET /practice/sessions` (Bearer token required)
- `PATCH /practice/sessions/:id` and `DELETE /practice/sessions/:id` (Bearer token required)
- `GET/POST/PATCH/DELETE /milestones` (Bearer token required)

## 3. Start the web app

In a third terminal:

```powershell
cd C:\PianoCompanionDev
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

The first screen creates or authenticates a real user through the API. The catalogue is seeded into PostgreSQL automatically on the first backend start, and ending a practice session saves it to the database.

## Stop services

Stop the API and web app with `Ctrl+C`. Stop PostgreSQL with:

```powershell
cd C:\PianoCompanionDev
docker compose down
```

The named Docker volume keeps local data between restarts. To remove that data deliberately, use `docker compose down -v`.
