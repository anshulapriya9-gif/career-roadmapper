# Public website deployment

The Render Blueprint deploys the frontend and Express API together as one web service. The app uses browser-local storage for each visitor's roadmap; generated roadmaps are requested from the server.

## Deploy

1. Push this repository to GitHub. `.env` is ignored; never commit Groq or API tokens.
2. In Render, choose **New > Blueprint** and select this GitHub repository.
3. Set `GROQ_API_KEY` as a secret when prompted. The Blueprint generates `API_TOKEN` for the protected state API.
4. Deploy the service. The Render service URL is the public website URL.

The free Render service may sleep when idle, so its first request can take longer. Roadmap edits are saved in each visitor's browser and are not shared with other visitors. The protected state API remains available for trusted server-side clients; its file-backed state can reset after a restart or redeploy.

## Routes

- `GET /api/health`: public health check.
- `GET /api/state`: read the shared roadmap state.
- `PUT /api/state`: replace the shared roadmap state with a validated JSON body.
- `POST /api/roadmap/generate`: generate phases from a JSON body containing `role` and `skills`.

The generation endpoint is public and limited to 10 requests per IP every 15 minutes. The state routes require `Authorization: Bearer <API_TOKEN>`; keep that token in a trusted server-side client and never embed it in browser code. Keep `GROQ_API_KEY` in Render's environment settings only.

Example health check:

```powershell
Invoke-RestMethod https://YOUR-SERVICE.onrender.com/api/health
```