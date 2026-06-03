# Pages Launcher - uOttawa Faculty of Science

A one-page tool that lets non-technical people publish (and update) a static
website on **GitHub Pages** without ever touching Git or a command line. They sign
in with GitHub, drag a folder, and click **Publish**. Bilingual (EN/FR), styled in
the uOttawa Faculty of Science identity.

> Built for people who **already have** their static site files. It does not author
> content - it deploys a folder and re-deploys it on every update.

## What's here
| File | Purpose |
|------|---------|
| `index.html` | The whole app - UI + GitHub API logic, runs entirely in the browser. **This is what you host.** |
| `oauth-worker/` | A ~60-line Cloudflare Worker for the "Sign in with GitHub" token exchange. Set up once. See its README. |
| `ghpages-publisher-demo.html` | The original single-file demo (token-only). Kept for reference. |
| `CLAUDE.md` | Architecture + context brief for future Claude Code sessions. |

## How a user updates files (the common question)
Every **Publish** is one Git commit. Two modes:
- **Add / update files** - drop one edited page → only that page changes, the rest
  of the site stays. Best for day-to-day edits.
- **Replace entire site** - the dropped folder *becomes* the whole site.

Either way they get free version history because each push is a commit.

## Setup (one-time, by you)
1. **Host the page.** Put `index.html` on GitHub Pages (or any static host). The
   simplest: a repo on the uOttawa account, Pages → deploy from branch.
2. **Enable one-click sign-in.** Follow `oauth-worker/README.md` - create a GitHub
   OAuth App, deploy the worker, and fill in `CONFIG` at the top of `index.html`.

Until step 2 is done, the page runs in **demo mode**: it shows a notice and users
sign in with a personal access token via the **Advanced** option. Everything else
(repo creation, commit, Pages enablement) is fully real either way.

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
