# 🧠 Thesis Brain

**A local-first second brain for writing a thesis.** Empty your 38 open tabs, capture notes with their exact source, see the literature as a synthesis matrix, and write a draft where every paragraph knows which papers it rests on.

> Built because I was writing my MSc thesis with 28 papers and 10 resources open, couldn't remember which reference belonged to which paragraph, and kept postponing because it all felt like too much.

UI is in Spanish 🇪🇸 (the draft and AI synthesis can be in English).

## Why

Research on thesis writing keeps pointing to the same problems:

| Problem | What Thesis Brain does |
|---|---|
| **Procrastination from overwhelm**: the next step is unclear | **Hoy (Today)**: a "where I left off" note for tomorrow-you, one micro-step, auto-suggestions, focus timer |
| **The reading trap**: reading and organising *feel* productive while the draft doesn't grow | Timer separates **reading** and **writing** blocks; write `[CITA?]` instead of stopping to look up a reference, and the app reminds you later |
| **Summary instead of synthesis** | **Synthesis matrix** (sources × themes), auto-built from your notes. Open a theme, pick notes, turn them into a paragraph (optionally drafted by AI from *your notes only*) |
| **"Which paper was this paragraph from?"** | Notes keep source + page. Paragraphs link to notes/sources, and every source shows the § ¶ where it's used |
| **"What did I read first?"** | **Rastro (Trail)**: reading order with start/finish dates + a day-by-day activity log |

## Features

- 📥 **Tab dump + triage**: paste dozens of URLs/titles at once (duplicates ignored, papers auto-detected), then give each a one-line "why I opened it" and a priority
- ✅ **To-dos & ideas (Pendientes)**: capture anything while you work with `T` from any view, ⭐ important items show on *Hoy*, optional due date and link to a source or draft section, turn an idea into a note with one click
- 📚 **Sources**: Inbox → To read → Reading → Read → Synthesised (or dropped, recoverable)
- 🗂️ **Notes (fichas)**: paraphrase / quote / own idea, page or section, *your* comment, themes. Press `N` anywhere
- 🧩 **Synthesis matrix**, with weak-evidence themes flagged
- ✍️ **Draft**: sections → paragraphs with status (idea / draft / done), linked citations, `[CITA?]` highlighting, MSc thesis skeleton, Markdown export with a reference list
- ✨ **AI synthesis (optional)**: with your own Anthropic API key, or copy the prompt into Claude
- ⏱️ **Focus timer** (25/50 min) that survives reloads and logs completed blocks
- 📲 **Installable app (PWA)**: own window and Dock/taskbar icon, works offline, asks before updating
- ⌨️ Shortcuts: `N` new note · `T` quick to-do / idea · `Ctrl/⌘ + Enter` save · `Esc` close

## Install it as an app

Thesis Brain is a PWA, so it runs in its own window, outside your browser tabs, and works offline.

- **Chrome / Edge:** click **📲 Instalar app** in the sidebar, or the install icon in the address bar.
- **Safari (macOS):** File → Add to Dock.
- **iPhone / iPad:** Share → Add to Home Screen.

When a new version is deployed, the app shows a small "Actualizar" banner instead of reloading while you're typing. Right-click the Dock icon → **Nueva ficha** to jump straight to a new note.

## Your data (local-first)

There is **no server and no account**. Your data never leaves your machine unless you choose to.

1. **IndexedDB** in your browser: automatic, offline, survives reloads.
2. **Sync to a JSON file** (Chrome / Edge): *⚙️ Datos y ajustes → Crear archivo nuevo*. Every change is written to that file. Put it in **iCloud Drive / Dropbox / OneDrive** (or a private git repo) and use *Abrir archivo existente* on another computer. After a browser restart, click **Reconectar** to re-grant permission.
3. **Manual backup**: download / import a `.json` at any time. Backups from the first Claude-artifact prototype import fine too.

> ⚠️ Data in IndexedDB is per browser and per origin: `localhost:5173` and your GitHub Pages URL are separate stores. Use the file sync or a backup to move between them.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # production build in dist/
```

Requires Node 18+.

## Deploy to GitHub Pages

1. Push to a GitHub repo (branch `main`).
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) tests, builds and publishes on every push.

`vite.config.ts` uses `base: './'`, so it works under any repo name. Since the app is static, it also works on Netlify, Vercel or Cloudflare Pages with zero config (build: `npm run build`, output: `dist`).

## AI synthesis

Optional. In *⚙️ Datos y ajustes*, paste an API key from [console.anthropic.com](https://console.anthropic.com). It is stored only in your browser's `localStorage` and sent directly to `api.anthropic.com` (using the `anthropic-dangerous-direct-browser-access` header). **Never commit a key or bake it into a build.** For a public deployment, a tiny proxy would be safer, but for personal use this is fine. Without a key, use **Copiar prompt** and paste it into Claude.

The prompt only uses the notes you tick, asks for synthesis by idea (not author by author), cites `(Author, Year)` exactly as given, forbids invented sources, and marks gaps as `[CITA?]`.

## Project structure

```
src/
  App.tsx              # layout, routing (#hash), modal host, shortcuts
  types.ts             # State, Source, Note, Section, Paragraph…
  ui.ts                # UI context (open/close modals, navigate)
  lib/
    store.ts           # tiny global store (useSyncExternalStore + structuredClone)
    storage.ts         # IndexedDB + File System Access sync + backup
    utils.ts           # citations, URL parsing, Markdown export…  (+ utils.test.ts)
    ai.ts              # prompt builder + Anthropic API call
    timer.ts           # focus timer that survives reloads
    pwa.ts             # install prompt handling
  components/          # Nav, cards, shared UI (Modal, ThemePicker, ConfirmButton…)
  views/               # Hoy, Pendientes, Fuentes, Fichas, Matriz, Borrador, Rastro
  modals/              # source, note, paragraph, theme workspace, export, settings…
```

The whole state is one serialisable object, so saving it (IndexedDB or a file) is a single write, and backups are just JSON.

## Roadmap

- [ ] Import from Zotero / BibTeX; export references in IEEE / APA
- [ ] PDF reader with highlights → notes
- [x] PWA (installable, offline cache)
- [ ] Desktop app with Tauri (real files on disk, global shortcut)
- [ ] Word count and per-section progress
- [ ] English UI (i18n)

## License

MIT © Adriana Calvo Bueno
