# CLAUDE.md - Pages Launcher (uOttawa Faculty of Science)

## What this project is
A **single-page web tool** that lets non-technical users publish and update a
**static website** on **GitHub Pages** with no Git and no command line. The user
already has their site files; this tool only **deploys** them. It is NOT a CMS and
does NOT author content - that was an explicit requirement.

Audience: uOttawa Faculty of Science / Faculté des sciences. The UI is bilingual
(EN/FR) and uses the uOttawa garnet (`#8b1d41`) identity.

## The design decision that shaped everything
GitHub Pages has three friction points for a novice: (1) a GitHub account, (2)
authorizing a tool to write to a repo, (3) knowing what to put in the repo. Since
users **already have their files**, (3) is solved - so this tool is pure
**deployment**: create repo if needed → commit files → enable Pages → return the
live URL. "Create" and "update" are the same action (a commit).

## Architecture (deliberately tiny)
- **`index.html`** - the entire app. No build step, no framework, no dependencies
  except two Google Fonts. Talks **directly** to `api.github.com` from the browser.
  - Publish flow = the Git Data API: `blobs → tree → commit → move/create ref`,
    so many files land in **one commit**. `base_tree` is set in *update* mode
    (overlay) and omitted in *replace* mode (fresh tree).
  - Pages is enabled via `POST /repos/{o}/{r}/pages` (404 → create; 200 → rebuild).
  - **i18n**: a flat `DICT.en` / `DICT.fr` map + `t(key, vars)`. Static text uses
    `data-i18n` / `data-i18n-html` / `data-i18n-ph` attributes, swapped by
    `setLang()`. Dynamic strings (log lines, errors) go through `t()`. Language is
    remembered in `localStorage` and survives the OAuth redirect via `sessionStorage`.
  - **Auth**: primary path is OAuth ("Sign in with GitHub"); fallback is pasting a
    fine-grained PAT under "Advanced". `connectWithToken()` is the shared endpoint
    both paths converge on.
- **`oauth-worker/`** - a Cloudflare Worker doing ONLY the OAuth `code → token`
  exchange (the one step that needs the client *secret*). `POST /exchange`. CORS is
  locked to `ALLOWED_ORIGINS`.

## CONFIG (top of index.html)
```js
const CONFIG = { githubClientId: "Ov23liiOW8KoYkI9NCmj", oauthWorkerUrl: "https://pages-launcher-oauth.uottawacsg.workers.dev/exchange" };
```
- Now **filled in and live** → one-click GitHub sign-in. `oauthWorkerUrl` must include `/exchange`.
- If both were empty → **demo mode**: a notice shows and the "Sign in" button nudges
  users to the token path. Everything still works (kept as a fallback design).

## Hosting - LIVE (as of 2026-06-03)
- **App:** https://jrbecart-uo.github.io/pages-launcher/ - repo `Jrbecart-uo/pages-launcher`,
  branch `main`, GitHub Pages on root. Account: https://github.com/Jrbecart-uo (uOttawa).
- **OAuth worker:** https://pages-launcher-oauth.uottawacsg.workers.dev/exchange -
  Cloudflare; account-wide workers.dev subdomain is `uottawacsg`. CORS locked to
  `https://jrbecart-uo.github.io`.
- **OAuth App:** client ID (public) `Ov23liiOW8KoYkI9NCmj`; callback URL must stay
  exactly `https://jrbecart-uo.github.io/pages-launcher/`. The client **secret** lives
  ONLY as the Cloudflare secret `GITHUB_CLIENT_SECRET` - never in repo or chat.
- OAuth callback URL and the worker's `ALLOWED_ORIGINS` must match the page origin exactly.

## Git remotes - push to both with one command
- `origin` fetch → GitHub. `origin` push → **both** GitHub (HTTPS, via `gh` creds) and
  GitLab (SSH). So a plain `git push` updates both.
- **GitLab backup:** `git@gitlab.uottawa.ca:CSG/pages-launcher.git`
  (https://gitlab.uottawa.ca/CSG/pages-launcher), auth via the local SSH key (`@jbecart`).
- `gitlab` remote also exists standalone (`git push gitlab main`).
- `gh` CLI is installed + authed as `Jrbecart-uo` (scopes incl. `repo`); wrangler is
  logged into the user's Cloudflare account. So repo create / push / Pages enable /
  worker deploy can all be driven directly from this machine.

## Conventions / gotchas
- OAuth scope requested is `repo` (needed to create repos + enable Pages).
- `*.github.io` repo name → user site at `/`; any other name → project site at
  `/<repo>/`. The result URL logic depends on this. (Naming a project repo
  `something.github.io` works but the `.github.io` suffix is redundant.)
- New repos take a moment to get a branch ref - the read step retries 6× with 800ms.
- After publish, the tool **polls `/pages/builds/latest` until `built`** before
  revealing the live link (so the first click isn't a 404), and adds a `?v=<ts>`
  cache-buster to the href so a previously-cached 404 can't stick. No "hard refresh"
  is ever asked of users.
- A dragged-in `File` is a snapshot reference; if it changes on disk after being added,
  the read throws `NotReadableError`. Caught and shown as a clear EN/FR "drag it in
  again" message (`err.readStale`). Safe order for users: edit → drag → publish.
- Repository-name field is a `<datalist>` populated by `loadRepos()` from
  `GET /user/repos` (Pages sites first via `has_pages`); still free-text for new names.
- **Wrangler gotcha:** `wrangler deploy` bakes `wrangler.toml` vars at deploy time -
  editing the toml after deploying does nothing until you redeploy. A placeholder
  `GITHUB_CLIENT_ID` made GitHub return `{"error":"Not Found"}` until a redeploy.
- Keep it dependency-free and single-file. If you add OAuth UI changes, route ALL
  user-visible strings through the `DICT`/`t()` system - never hardcode English/French.
- House style: **no em-dashes** in any file - use hyphens (`-`). (User preference.)
- Vanilla JS only here; the Date.now/Math.random restriction in the harness applies
  to *workflow scripts*, not to this browser code.

## Status / next ideas
- **LIVE and working end-to-end**: OAuth sign-in, publish, build-wait + cache-buster,
  stale-file message, and the repo dropdown are all deployed and verified.
- Sample test page at `sample-site/index.html`; user's test repo
  `Jrbecart-uo/jrbecart-uo-test.github.io`.
- Optional polish only: a tip box teaching "edit → drag → publish"; the real uOttawa
  logo SVG (currently a text wordmark, chosen to avoid trademark issues); wrap the
  token field in a `<form>` to silence a benign Chrome console hint; progress bar for
  large uploads; remembering the last repo name per user.
