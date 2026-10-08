# Public API deployment

This project can deploy its Express API to Render using the root `render.yaml` Blueprint.

## Deploy

1. Push this repository to GitHub. `.env` is ignored; never commit Groq or API tokens.
2. In Render, choose **New > Blueprint** and select the GitHub repository.
3. When prompted, provide `GROQ_API_KEY` as a secret. The Blueprint generates `API_TOKEN` for protected API access.
4. Deploy the service. Its Render URL is the public API base URL.

The free Render service uses an ephemeral filesystem. The state API works, but file-backed state can reset after a restart or redeploy. Use a persistent database before relying on hosted state. State is shared by all callers using the same token, so this is for one trusted user, not separate accounts.

## Routes

- `GET /api/health`: public health check.
- `GET /api/state`: read the shared roadmap state.
- `PUT /api/state`: replace the shared roadmap state with a validated JSON body.
- `POST /api/roadmap/generate`: generate phases from a JSON body containing `role` and `skills`.

All routes except health require `Authorization: Bearer <API_TOKEN>`. Keep this token in a trusted server-side client; do not embed it in public browser code. Keep `GROQ_API_KEY` in Render's environment settings only.

Example health check:

```powershell
Invoke-RestMethod https://YOUR-SERVICE.onrender.com/api/health
```