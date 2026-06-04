# Pages Launcher - uOttawa Faculty of Science

A one-page tool that lets non-technical people publish (and update) a static
website on **GitHub Pages** without ever touching Git or a command line. They sign
in with GitHub, drag a folder, and click **Publish**. Bilingual (EN/FR), styled in
the uOttawa Faculty of Science identity.

> Built for people who **already have** their static site files. It does not author
> content - it deploys a folder and re-deploys it on every update.

## Live
- **App:** https://jrbecart-uo.github.io/pages-launcher/ (one-click GitHub sign-in is enabled)
- **OAuth worker:** https://pages-launcher-oauth.uottawacsg.workers.dev (Cloudflare)
- **Source:** GitHub `Jrbecart-uo/pages-launcher` · **Backup:** GitLab `CSG/pages-launcher`

## What's here
| File | Purpose |
|------|---------|
| `index.html` | The whole app - UI + GitHub API logic, runs entirely in the browser. **This is what you host.** |
| `oauth-worker/` | A ~60-line Cloudflare Worker for the "Sign in with GitHub" token exchange. Set up once. See its README. |
| `sample-site/` | A simple test page to drag into the tool for an end-to-end check. |
| `ghpages-publisher-demo.html` | The original single-file demo (token-only). Kept for reference. |
| `CLAUDE.md` | Architecture + context brief for future Claude Code sessions. |

## How a user updates files (the common question)
Every **Publish** is one Git commit. Two modes:
- **Add / update files** - drop one edited page → only that page changes, the rest
  of the site stays. Best for day-to-day edits.
- **Replace entire site** - the dropped folder *becomes* the whole site.

Either way they get free version history because each push is a commit.

## Setup (already done - for reference / re-deploy)
1. **Host the page.** `index.html` is on GitHub Pages at `Jrbecart-uo/pages-launcher`
   (branch `main`, root). Pages → deploy from branch.
2. **One-click sign-in is enabled.** Per `oauth-worker/README.md`: a GitHub OAuth App
   (client ID `Ov23liiOW8KoYkI9NCmj`, callback `https://jrbecart-uo.github.io/pages-launcher/`)
   + the deployed Cloudflare worker, with `CONFIG` at the top of `index.html` filled in.

If `CONFIG` were left empty the page falls back to **demo mode**: users sign in with a
personal access token via the **Advanced** option. Everything else (repo creation,
commit, Pages enablement) is fully real either way.

> **Re-deploying the worker:** `wrangler deploy` bakes `wrangler.toml` vars at deploy
> time - if you edit the client ID or `ALLOWED_ORIGINS`, you must redeploy for it to
> take effect.

## Backups & git remotes
- `git push` updates **both** GitHub (live source) and GitLab (uOttawa backup) at once -
  `origin` has two push URLs. `git pull`/fetch uses GitHub only.
- GitLab backup: https://gitlab.uottawa.ca/CSG/pages-launcher (auth via SSH key).
- Standalone backup push if needed: `git push gitlab main`.

## Local preview
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
Add `http://localhost:8000` to the worker's `ALLOWED_ORIGINS` and the OAuth App
callback if you want to test sign-in locally.

## Security notes
- The page never stores anything server-side. The access token lives only in the
  browser tab (memory) for the session.
- The OAuth **client secret** lives only in the Cloudflare Worker as an encrypted
  secret - never in the page or the repo.
- The worker restricts which page origins may call it via `ALLOWED_ORIGINS`.
