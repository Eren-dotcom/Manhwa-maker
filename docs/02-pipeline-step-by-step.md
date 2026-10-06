# 02 — The step-by-step process (premise → published episode)

This is the studio pipeline from `01` rearranged for **one creator + AI**. Fourteen steps, grouped
into four phases. The toolkit command is given for every step that's automatable.

```
PHASE 0  PRE-PRODUCTION      1 premise · 2 bible · 3 cast lock · 4 arc outline
PHASE 1  WRITING             5 episode outline · 6 script/panel sheet
PHASE 2  ART                 7 reference sheets · 8 prompts · 9 generate · 10 select+fix
PHASE 3  ASSEMBLY            11 layout+letter · 12 QC · 13 package · 14 publish
```

---

## PHASE 0 — Pre-production

### Step 1. Premise and promise (1 hour)
One sentence: *who wants what, and what stands in the way.* Then a second sentence: *why would a
stranger scroll past panel 5?* If you can't answer both, keep going — this is the step every abandoned
webtoon skipped.

Pick a genre that the platform actually surfaces (action, fantasy, romance, thriller dominate), and
pick **one** aesthetic promise you can hold for 50 episodes. Your first 3 episodes will be judged on
the promise, not the plot.

> `manhwa.py init my-series --title "MY SERIES"` creates `series.json` — fill in logline, genre, tone.

### Step 2. Story bible (`series.json`)
Decide and write down, once:
- tone words (3), audience, release cadence
- the **art direction block** — one paragraph that becomes the style suffix on every prompt. Vague
  style = drifted art by episode 4.
- the **negative block** (what the model must never add: text, letters, watermarks, extra limbs…)
- a 4-colour palette + one grading rule (e.g. "cool shadows, warm practicals, skin tones constant")
- the AI disclosure line you'll paste into every episode description

### Step 3. Lock the cast (`characters/*.json`)
For each main character write:
- a **`prompt_block`**: an exhaustive, unchanging visual description in model-friendly language
  (hair, eyes, a distinguishing mark, default outfit, build). This string is reused verbatim forever.
- **palette keys** (`hair`, `skin`, `outfit`, `accent`) — for colourists and for your own reference
- **wardrobe variants** and **`consistency_notes`** (the invariants: "never change the fringe",
  "scar on the right jaw only")
- a `lora` slot (file + trigger token + weight) and `seed`

> Everything downstream reads these files. Get them right once and 500 panels stay on-model.

### Step 4. Arc outline (2 hours)
8–12 episodes per arc. Per episode write one line of *what changes*. Mark the arc's turning points.
This is what stops you writing yourself into a corner at episode 6 with a weekly deadline looming.

---

## PHASE 1 — Writing

### Step 5. Episode outline
For each episode, decide the four load-bearing beats before you write dialogue:

| Beat | Where | What it does |
|---|---|---|
| **Hook** | panels 1–5 | the image/line that makes a stranger stay |
| **Midpoint hook** | ~30–40% in | catches the reader drop-off; a surprise, a question, a tonal shift |
| **Climax** | ~2/3 through | the biggest event, not at the very end |
| **Cliffhanger/sting** | final 2–3 panels | a revelation or an unanswered question |

Then estimate the panel count (40–80; ~55–60 is the sweet spot for a weekly solo AI-assisted episode).

### Step 6. Script as a panel sheet (`episodes/epNNN.json`)
Write **panel by panel**, not scene by scene. For each panel:

- `shot` — from the grammar in `references/02-panel-grammar.md` (establishing_wide, close, ots,
  insert, extreme_close, action, environment, …)
- `beat` — hook / setup / inciting / turn / reveal / conflict / midpoint_hook / build / impact /
  reaction / cliffhanger / sting
- `pace` — fast (80px gap) / normal (200) / dramatic (600) / transition (700) / silent (1000)
- `characters` — who is on screen (this drives prompt assembly)
- `action` — one actionable sentence describing exactly what is happening
- `dialogue[]` — `{character, text, style, anchor}` with style ∈ speech / whisper / shout / thought /
  narration / system / radio / sfx

**Write the dialogue before you draw.** The bubble comes first in the layout and the art fills the
space that's left — studios do exactly this because bubble space is expensive to retrofit.

Rules of thumb for the script itself:
- **one action per panel** — if you wrote "she turns and the door opens", that's two panels
- **≤3 bubbles per panel**, ≤30 words per bubble; if a bubble is longer, split it or cut it
- **never put dialogue on an action panel** — give the action its own panel and put the line before
  or after
- end the episode on an image, not a paragraph

> `manhwa.py check 1` lints all of the above before a single image is generated. This is the cheapest
> possible time to fix a pacing problem.

---

## PHASE 2 — Art

### Step 7. Generate the character reference sheets — FIRST
Two images per significant character:
1. **turnaround sheet** (front / ¾ / side / back, identical outfit, plain background)
2. **expression sheet** (6 heads: neutral, wary, angry, sorrowful, small smile, shock)

This is the single most valuable artefact in the whole production. Approve it, version it, and never
casually regenerate it. Everything in Step 9 conditions on it.

> `manhwa.py prompts 1 --tool gemini` → the sheet entries are at the top of the pack.

### Step 8. Emit the prompt pack
One command turns the whole episode's story data into per-panel prompts with the correct camera
language, beat lighting, characters, wardrobe variant, bubble-space instruction, deterministic seed,
and generation resolution.

```bash
manhwa.py prompts 1 --tool sdxl        # booru tags + <lora:...> for ComfyUI/A1111
manhwa.py prompts 1 --tool flux        # natural-language paragraph
manhwa.py prompts 1 --tool midjourney  # prose + --ar flags
manhwa.py prompts 1 --tool gemini      # reference-image instructions
```
Each pack ships a `.md` (to read), a `.csv` (for batch tools) and a `queue.json` (machine jobs).
For ComfyUI there's also `comfy_workflow_template.json` + `comfy_batch.py` — a headless runner.

Generation resolution is **not** your layout size: the pack computes a model-friendly size (multiple
of 64, ~1.15MP) matching each panel's aspect ratio, so a 720×340 strip panel is generated at
1536×704 and down-cropped on assembly. That's how you get sharp line art at 800px.

### Step 9. Generate
Batch by stage, not by episode — run all the *close-ups* of the arc, then all *wides*. Keep the seed
per character/panel consistent. When a face drifts, re-run with a stronger LoRA or by feeding the
sheet back as an image reference (IP-Adapter / `--cref` / attached reference).

Cost/time reality: 1 panel ≈ 10–60 seconds on a local GPU, seconds-to-a-minute in the cloud. Your
bottleneck is **selection**, not generation — budget more time for step 10 than step 9.

### Step 10. Select, fix, retouch
Per panel, in order of preference:
1. **re-roll** (cheap, changes composition)
2. **inpaint** the broken part (hands, eyes, an extra limb) — keeps composition
3. **img2img** at low strength to fix line/shading
4. **draw it yourself** (30 seconds in any paint app beats 20 minutes of re-rolling a hand)

Then a **continuity pass**: hair length, scar side, outfit, skin tone, palette, eye colour across the
episode. `manhwa.py check` flags the character/palette risks, but a human eyeball on a phone is the
real gate.

Drop approved art into `art/epNNN/pNNN.png` (the naming is the contract — nothing else to configure).

---

## PHASE 3 — Assembly, QC, publish

### Step 11. Assemble the strip and letter it
```bash
manhwa.py assemble 1
```
Does, deterministically:
- computes each panel's height from its art's aspect ratio and the shot grammar, applies tiered
  gutters (80/200/600/700/1000px) from `pace`, respects the safe margins
- composits the vertical strip at the platform width
- **lettering**: bubbles, tails, caption boxes, thought clouds, burst shouts, system windows, SFX —
  auto-placed by scanning the panel for the lowest-detail region so bubbles stop landing on faces
- **slicing**: cuts the strip into platform-legal tiles, hunting for the calmest row near the cap so
  no face or bubble is bisected
- writes `preview.html` (phone-width reader), `manifest.json` (metrics), `UPLOAD.md` (upload sheet)

Add `--no-art` to see the storyboard layout before any art exists, `--annotate` to burn panel ids and
shot tags onto the strip for review.

### Step 12. QC gate
```bash
manhwa.py check 1 --final
```
Mechanical: width, tile height cap, per-tile MB, total MB, tile count, formats, font size legibility.
Editorial: hook in the first 3 panels, cliffhanger at the end, midpoint hook present, panel budget,
gutter floors, scene-transition spacing, shot repetition, bubble word count, bubble coverage, unknown
speakers, missing LoRA/reference, disclosure present.

`--final` turns "missing art / placeholder" into errors. **This is the pre-upload gate — don't ship
with a FAIL.**

### Step 13. Package
Everything lands in `output/epNNN/`: `upload/` (the ordered tiles), `preview.html`, `UPLOAD.md`,
`manifest.json`, `qc-report.md`. The upload sheet lists tile sizes and the disclosure line.

### Step 14. Publish and schedule
- Upload tiles in numeric order; add title, episode thumbnail, description, tags.
- **Paste your AI disclosure into the description**, every episode. Rules differ by platform and are
  moving (see `05-research-sources.md`); voluntary disclosure costs nothing and pre-empts a pile-on.
- Publish on a fixed day and time. Then start the next episode immediately — the plan in
  `manhwa.py plan --episodes 12 --team solo` shows why: work is *staggered*, so you should already be
  two episodes ahead of what's shipping.
- Keep a **3–4 episode buffer** before assembling each episode.

---

## The weekly rhythm (solo, AI-assisted)

| Day | Work | Command |
|---|---|---|
| Mon | outline + script ep N+2 | `manhwa.py check N+2` |
| Tue | prompt pack + generate art for ep N+1 | `manhwa.py prompts N+1 --tool …` |
| Wed | select / inpaint / continuity pass | — |
| Thu | assemble + letter ep N, QC | `manhwa.py assemble N` · `check N --final` |
| Fri | publish ep N, buffer check | `manhwa.py status` |
| Sat/Sun | rest, or batch backgrounds for the arc | `manhwa.py plan` |

The whole design goal is that **one episode a week is a four-day job, not a seven-day one** — that's
the difference between a series and a burnout.
