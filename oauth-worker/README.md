# OAuth worker — deploy in 5 steps

This tiny Cloudflare Worker turns the GitHub `?code=` into an access token so the
static page can offer a real **"Sign in with GitHub"** button. It's the only piece
that needs the OAuth client *secret*, which is why it can't live in the page itself.

You only set this up **once**.

## 1. Create a GitHub OAuth App
GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
- **Application name:** `uOttawa Science — Pages Launcher`
- **Homepage URL:** `https://jrbecart-uo.github.io/<repo>/` (where you host index.html)
- **Authorization callback URL:** the **exact same URL** as the homepage (the page redirects back to itself)
- Click **Register**, then **Generate a new client secret**.

Copy the **Client ID** (public) and the **Client secret** (secret — shown once).

## 2. Configure the worker
Edit `wrangler.toml`:
- `GITHUB_CLIENT_ID` → your Client ID
- `ALLOWED_ORIGINS` → the origin that serves the page, e.g. `https://jrbecart-uo.github.io`
  (add `,http://localhost:8000` while testing locally)

## 3. Deploy
```bash
cd oauth-worker
npx wrangler login            # one-time, opens a browser
npx wrangler secret put GITHUB_CLIENT_SECRET   # paste the secret when prompted
npx wrangler deploy
```
Wrangler prints the worker URL, e.g. `https://pages-launcher-oauth.<you>.workers.dev`.

## 4. Point the page at the worker
In `../index.html`, fill in `CONFIG`:
```js
const CONFIG = {
  githubClientId: "Iv1.xxxxxxxxxxxx",                                   // from step 1
  oauthWorkerUrl: "https://pages-launcher-oauth.<you>.workers.dev/exchange", // note the /exchange
};
```

## 5. Re-publish the page
Commit `index.html` — the demo notice disappears and the GitHub button goes live.

---

### Don't want to run a worker?
The page works without it: leave `CONFIG` empty and users click **"Advanced: use a
personal access token"**. Slightly more friction (each user makes a token once) but
zero hosting beyond the static page. Cloudflare Workers' free tier is far more than
enough for this, though — 100k requests/day.

### Alternatives to Cloudflare
The exchange is ~30 lines and ports trivially to Netlify Functions, Vercel, or Deno
Deploy if you'd rather host it next to something you already run.
