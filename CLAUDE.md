# CLAUDE.md — Pages Launcher (uOttawa Faculty of Science)

## What this project is
A **single-page web tool** that lets non-technical users publish and update a
**static website** on **GitHub Pages** with no Git and no command line. The user
already has their site files; this tool only **deploys** them. It is NOT a CMS and
does NOT author content — that was an explicit requirement.

Audience: uOttawa Faculty of Science / Faculté des sciences. The UI is bilingual
(EN/FR) and uses the uOttawa garnet (`#8b1d41`) identity.

## The design decision that shaped everything
GitHub Pages has three friction points for a novice: (1) a GitHub account, (2)
authorizing a tool to write to a repo, (3) knowing what to put in the repo. Since
users **already have their files**, (3) is solved — so this tool is pure
**deployment**: create repo if needed → commit files → enable Pages → return the
live URL. "Create" and "update" are the same action (a commit).

## Architecture (deliberately tiny)
- **`index.html`** — the entire app. No build step, no framework, no dependencies
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
- **`oauth-worker/`** — a Cloudflare Worker doing ONLY the OAuth `code → token`
  exchange (the one step that needs the client *secret*). `POST /exchange`. CORS is
  locked to `ALLOWED_ORIGINS`.

## CONFIG (top of index.html)
```js
const CONFIG = { githubClientId: "", oauthWorkerUrl: "" };
```
- Both empty → **demo mode**: a notice shows and the "Sign in" button nudges users
  to the token path. Everything still works.
- Filled in → one-click GitHub sign-in. `oauthWorkerUrl` must include `/exchange`.

## Hosting
Target account: **https://github.com/Jrbecart-uo** (uOttawa). Host `index.html` on
GitHub Pages there. OAuth callback URL and the worker's `ALLOWED_ORIGINS` must match
the page's final origin exactly (e.g. `https://jrbecart-uo.github.io`).

## Conventions / gotchas
- OAuth scope requested is `repo` (needed to create repos + enable Pages).
- `*.github.io` repo name → user site at `/`; any other name → project site at
  `/<repo>/`. The result URL logic depends on this.
- New repos take a moment to get a branch ref — the read step retries 6× with 800ms.
- Keep it dependency-free and single-file. If you add OAuth UI changes, route ALL
  user-visible strings through the `DICT`/`t()` system — never hardcode English/French.
- Vanilla JS only here; the Date.now/Math.random restriction in the harness applies
  to *workflow scripts*, not to this browser code.

## Status / next ideas
- Working end-to-end against the live GitHub API (token mode verified by design).
- Not yet done: deploy the worker + fill CONFIG (needs the user's OAuth App), and
  push `index.html` to the uOttawa account (awaiting repo access).
- Possible polish: progress bar for large uploads, drag-to-reorder, a "view repo"
  link in the result, remembering the last repo name per user.
