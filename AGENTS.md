# AGENTS.md — working on Manhwa Maker Studio

Instructions for any AI agent (or human) changing this repository.

## What this repo is

A React + TypeScript + Vite single-page studio for producing Korean-style webtoons, plus a markdown/JSON craft corpus that doubles as the AI's system prompt. There is **no backend**: state lives in `localStorage`, panel images in `IndexedDB`, AI calls go straight from the browser to the user's chosen provider.

## Commands

```bash
npm install
npm run dev        # vite --host 0.0.0.0 --port 5173
npm run build      # tsc -b && vite build
npm run typecheck  # tsc --noEmit
```

Keep `npm run build` clean. It is the definition of "done" here.

## Architecture map

```
src/store/types.ts       domain model — change here first, everything follows
src/store/constants.ts   looks, palettes, shots, angles, compositions, platforms, genre presets
src/store/demo.ts        the reference project ("The Lantern Bureau") — the product's showcase
src/store/studio.tsx     provider: project library, undo/redo, autosave, asset registry
src/lib/prompt.ts        style lock + per-panel prompt compiler (face anchor + outfit + version block)
src/lib/references.ts    reference memory: versions, sheets, panel→version resolution, ref attachments
src/lib/qc.ts            deterministic audit engine (drives Overview + QC + nav badges); rules carry `code`
src/lib/fixes.ts         repairs for mechanically fixable QC codes (undoable, never invents story/art)
src/lib/export.ts        prompt pack, bible, JSON, standalone reader HTML, storyboard print
src/lib/markdown.ts      tiny markdown renderer for docs
src/lib/imageStore.ts    IndexedDB helpers
src/ai/protocol.ts       MASTER_PROTOCOL + stage instructions + project context
src/ai/providers.ts      OpenAI / Anthropic / Gemini / OpenRouter / Ollama / custom adapters
src/ai/offline.ts        deterministic protocol engine (no key required)
src/ai/engine.ts         runAction(): context → model → validate → project patch
src/components/          ui.tsx (design system), PanelArt.tsx (storyboard + balloons), ReferenceMemory.tsx, shell pieces
src/views/               one file per screen, wired in App.tsx
src/styles/              base.css (tokens/components), views.css (screens)
docs/, protocols/        craft corpus + machine-readable doctrine
```

## Conventions

- **Types are the contract.** If a field appears in a view, it exists in `types.ts` and (where relevant) in `protocols/stage-contracts.json`.
- **All AI writes go through `runAction()`** and return an `apply(draft)` function. Never mutate the project directly inside an AI module.
- **All project mutations go through `update()`** from `useStudio()` (undo history + autosave). Use `updateLive()` + `commit()` only for drags.
- **Deterministic first.** Anything that can be computed (prompt compilation, QC, layout, export) must work with `provider: 'offline'`. The AI is an accelerator, not a dependency.
- **No UI framework additions.** Hand-written CSS with the tokens in `base.css`. Reuse `Btn`, `Field`, `Card`, `Badge`, `Modal`, `Slider`, `Chips`, `Icon`.
- **Panel images are asset refs** (`img:…` or a URL). Never store base64 in the project JSON or in undo snapshots.
- **Keep the demo project valid.** It is what users see on first load; if you change the model, update `demo.ts` and re-check the reader.

## Adding a stage or AI action

1. Add/extend the type in `types.ts`.
2. Add the stage contract to `protocols/stage-contracts.json` and the instruction to `src/ai/protocol.ts`.
3. Implement an offline generator in `src/ai/offline.ts`.
4. Add an apply function + validation in `src/ai/engine.ts`.
5. Add the UI in the relevant view (use `useAction()` for the button).
6. Add QC coverage in `src/lib/qc.ts` if the stage has blockers.
7. Document it in `docs/` if it changes craft guidance.

## Voice and content rules for docs

The corpus is written for practitioners: numbers, trade-offs, failure modes, and honest limits. No hype, no "unleash your creativity". Every table should be usable as a checklist. If you add a claim about a platform, a format or a model, keep it current and flag uncertainty.

## Things not to do

- Do not add a server or proxy — the privacy promise is "your key never leaves your browser except to the provider".
- Do not let an image model render lettering; balloons and captions are layout, drawn by the studio.
- Do not reproduce a living artist's name or a protected character in prompt templates.
- Do not commit `node_modules`, `dist`, or rendered assets outside `public/demo`.
