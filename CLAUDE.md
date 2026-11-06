# CLAUDE.md

## Workflow (owner's standing instruction)
The owner does not test on Vercel preview deployments. After finishing a change:
1. Run `npm test` and `npx next build`; both must pass.
2. Commit and push the working branch.
3. Open a pull request into `main` (ready for review, not a draft).
4. Merge it right away. Vercel deploys `main` to production automatically.

## Project
- Next.js (App Router, TypeScript), `basePath: /boardgame`, deployed on Vercel.
- Production URL path: chaivoot.com/boardgame/... (rewritten from the main Astro site).
- Games live under `app/<game>/`, `app/api/<game>/`, `lib/<game>/`.
- ชายชุดดำ (Men in Black): rules engine `lib/meninblack/engine.ts`, per-player view
  `lib/meninblack/view.ts`, storage `lib/meninblack/store.ts` (Upstash Redis via
  `KV_REST_API_URL`/`KV_REST_API_TOKEN`; in-memory fallback for local dev only).
- Original artwork only (SVG in `lib/meninblack/cards.ts`); do not copy assets from the commercial game.
