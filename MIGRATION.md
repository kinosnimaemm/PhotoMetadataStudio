# Cloud migration

## Target

Primary target: Railway with one Docker web service and one PostgreSQL service.

The application remains stateless:

- uploads are written only to the container temporary directory;
- processed files expire after 15 minutes;
- successful ZIP delivery removes the whole batch;
- PostgreSQL stores users, presets, and batch records, never photo bytes.

## Prepared

- Linux Docker image with Node.js, ExifTool, FFmpeg, and ZIP.
- `APP_MODE=local|cloud` runtime switch.
- Cloud-safe `HOST` and `PORT` configuration.
- PostgreSQL connection health check.
- Versioned SQL migrations.
- Railway config with pre-deploy migrations and health check.
- Cloud ZIP download path and local macOS save path.

## Next production steps

1. Move custom presets from browser `localStorage` to authenticated API endpoints.
2. Add authentication and row-level ownership for presets.
3. Record batch status without retaining photo contents.
4. Add a concurrency queue before allowing simultaneous FFmpeg jobs.
5. Add per-user rate limits and file quotas.
6. Add database backups before accepting paid users.
7. Package a licensed Display P3 ICC profile for Linux if identical color-profile embedding is required.

## Scaling path

- Internal use: one web replica, Railway Postgres, no persistent file storage.
- First users: 1-2 vCPU, at least 1 GB RAM, one processing batch per replica.
- Growth: web API plus dedicated worker and Redis-backed queue.
- Larger traffic: private object bucket with short-lived objects and lifecycle deletion.
