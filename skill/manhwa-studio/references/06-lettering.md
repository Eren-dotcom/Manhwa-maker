# 06 — Lettering

Lettering is where AI pipelines break and where amateur webtoons lose readers. The toolkit composites
every character of text — nothing is generated.

---

## Why compositing, not generation

Image models cannot spell, cannot kern, cannot wrap a line, and cannot keep type size consistent
between panels. A single misspelled word in a bubble destroys reader trust faster than imperfect art.
So: negative-prompt text *out* of the art, then draw the text with a real font.

```json
{ "character": "sera", "text": "One more delivery.", "style": "speech", "anchor": "top-left" }
```

## Bubble styles

| Style | Shape | Use for |
|---|---|---|
| `speech` | white round-rect, tapered tail | normal dialogue |
| `whisper` | grey-outlined, smaller type | a small voice, a held breath |
| `shout` | white burst + tail, all caps | yelling (use sparingly — it loses power if common) |
| `thought` | cloud outline | inner monologue |
| `narration` | tinted caption box, no tail | narrator voice, letters, time stamps |
| `system` | dark HUD plate with a rule line | LitRPG/system windows, quest UI, status screens |
| `radio` | dark plate, cyan border, monospace | comms, phone calls, off-screen/mechanical voices |
| `sfx` | big outlined display text, rotated | sound effects — never inside a bubble |

Grey-outlined whispers and dark system windows exist so readers can *see* the register change without
reading the words. Use that.

## Type rules

| Rule | Value |
|---|---|
| Base dialogue size | 30px at 800px width (scales with the output width) |
| Readability floor | lowercase height ≈ 20–28px; never below 20px rendered |
| Leading | 110–130% of the font size (1.16 is the toolkit default) |
| Words per bubble | ≤30; split or cut beyond that (QC `R001`) |
| Bubble padding | ≈ one letter-width of empty space all round; text never touches the edge |
| Line breaks | at natural phrase boundaries, never mid-word; keep line lengths similar |
| Bubble width | ≤62% of the panel width |
| Casing | sentence case by default; `caps: true` in `series.json` for traditional all-caps lettering |
| Font choice | a comic-specific face (Anime Ace, CC Wild Words, Komika, Back Issues, Bangers) — **never** Times/Arial/decorative/cursive |
| Fonts per series | 2 max: one regular, one bold; a third only for system/radio |

Drop your fonts in `assets/fonts/` and point `series.json → lettering.font_regular` at them. Without
them the toolkit falls back to system fonts (DejaVu) — legible, but it reads generic. **Getting a real
comic font is the single cheapest upgrade to your episode's perceived quality.**

## Placement

The engine works in two passes:

1. **Ask the model.** Any panel with dialogue gets "leave clean negative space in the X area for a
   speech bubble" added to its prompt, using the shot preset's default bubble position.
2. **Measure the result.** An edge-energy scan (32×32 grid) scores every candidate position for
   visual busyness; the bubble goes to the calmest legal spot, avoiding already-placed bubbles.
   A requested `anchor` is honoured unless it would land on detail.

Overrides: `anchor: "top-left"` (or `top-center`, `middle-right`, `bottom-left`, `center`, …),
`anchor: "@0.5,0.22"` for exact panel fractions, or `anchor_lock: true` to force the position even
over art.

**Tails:** point down/up/left/right or at an exact speaker position:
```json
{ "tail": "auto", "tail_to": { "x": 0.42, "y": 0.78 } }
```
Tails are kept short (≈2 type-heights) — long spikes read as amateur. For two-hander panels, put the
speaker's tail toward their side of the frame: `"tail_to"` with x at 0.3 vs 0.7 does most of the work
of making a conversation legible.

## Reading order in a vertical scroll

- **Top-to-bottom, and dead simple.** Readers see roughly one panel at a time; don't ask them to
  resolve complex bubble chains.
- Place the first bubble a reader should read highest, then descend.
- **Never stack three or more bubbles vertically** in one panel — split the panel instead. QC warns
  beyond 3 bubbles in a panel.
- **Don't put dialogue and the panel's key visual in the same region.** The bubble always wins the
  fight for attention; if it's covering the reveal, the reveal is wasted.
- **Give the punchline its own panel.** A line alone in a panel lands; the same line crammed next to
  two others doesn't.

## SFX

```json
{ "character": "sfx", "text": "CRASH", "style": "sfx", "anchor": "@0.36,0.34", "rotation": -12, "size_scale": 1.1 }
```

- Big, outlined, rotated 5–15°, positioned in the action's direction (a falling object's SFX usually
  sits below-left or below-right of the impact).
- One SFX per panel. Repeat a word only for deliberate repetition (a heartbeat, a repeated impact).
- Length is fine: `KRRRSH` reads as rain; `THUD` as a body. Keep them shoutable in one syllable or
  one breath.
- Generate SFX panels with **no dialogue art underneath**, or the words fight.

## Final checks before upload

1. Read the whole episode at 40% zoom (≈ phone scale) — any line you have to strain at is too small.
2. Scan for a bubble covering a face or a key image; re-anchor it.
3. Check every bubble can be attributed to a speaker without ambiguity (tail direction, or `narration`
   for voiceover).
4. Punctuation discipline: ellipses for trailing off, em-dashes for cuts, no double punctuation.
5. Consistent casing across the whole episode, and consistent font size for the same register.
