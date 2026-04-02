# See It Say It

Astro SSR application targeting Cloudflare for a UK-first, global-ready community issue reporting platform.

## Current Foundation

- Astro SSR configured for Cloudflare
- English (UK) locale as the default language
- Translation layer in place from day one
- Role-aware domain model including `resident`, `warden`, `moderator`, and `admin`
- Brief reference stored in [`docs/brief-summary.md`](./docs/brief-summary.md)

## Local Runtime

- Node `22`
- npm `10+`

Use `.nvmrc` if you manage Node with `nvm`.

```sh
nvm use
```

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

## Project Notes

- The first market is the UK, but the data model should support multi-country routing.
- All user-facing copy should be added via the locale dictionary, starting in [`src/i18n/en-GB.ts`](./src/i18n/en-GB.ts).
- Warden operations are treated as a first-class moderation concern, not a later extension.
