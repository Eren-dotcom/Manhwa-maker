# 07 — Reconciliation with the supplied `SKILL.md`

The attached skill file (`manhwa-maker`) is the **canonical craft spec**. What was already built is the
**implementation layer**. This document is the point-by-point analysis: what was adopted, what
conflicts, what was missing, and what was added.

Legend: **ADOPTED** (already matched) · **MERGED** (their rule replaced mine) · **NEW** (did not exist) ·
**CONFLICT** (needed a decision).

---

## 0. Study the bar

| Their point | Status | How it landed |
|---|---|---|
| Study one chapter of a named reference work in-browser and extract craft as permanent rules | **NEW** | Process only — encoded as step 0 of the merged `SKILL.md` and an intake question. The toolkit has no browser step; the extracted rules land in `series.json → craft_rules` (free-form strings the QC prints into every report) |
| Never reproduce copyrighted art or text; analyse technique only | **NEW** | Added to `docs/05` and the skill's honesty rules |

## 1. Script refinement first

| Their point | Status | How it landed |
|---|---|---|
| Never build a provided script verbatim; improve it first | **NEW** | `manhwa.py refine <ep>` — a real pass, not advice (see below) |
| Fix logic, cut dead lines, tighten pacing | **NEW** | `refine` reports structural problems (unused characters, orphan beats, scenes without a turn) |
| 20 words max per balloon, 1–2 lines per balloon | **MERGED** | `lettering.max_words_per_bubble` default changed **30 → 20**; the type-size solver now also caps lines at 2 and shrinks the type until it fits; QC `R001` enforces 20, new `R004` enforces 2 lines |
| No-slop pass; banned words (delve, leverage, tapestry, realm…) | **NEW** | `refine` runs a slop linter: ~60 banned tokens plus phrasal heuristics (importance puffery, binary contrasts, throat-clearing). Findings become QC `D001` |
| Strengthen chapter-end hooks | **ADOPTED→** | `S003` (existing) now also checks the *content* of the final balloon set, not just the beat tag |
| Verify panel counts against chapter headers programmatically | **NEW** | `refine` parses `Panels: N` / `N panels` / `Cuts: N` from a source script and compares to the panel sheet |
| Note what changed in one or two lines | **NEW** | `refine` writes `refined/CHANGES.md` with a diff summary |

## Chapter architecture — four mandatory beats

| Their beat | Status | How it landed |
|---|---|---|
| **1. Engine** — first 3–5 panels state the chapter's visual idea in images | **NEW** | Beat vocabulary `engine`; QC `S008` requires an engine/tall-opener beat in the first 5 panels |
| **2. Introductions** — every chapter introduces or re-introduces someone, with a hero shot (backlit / low angle / name balloon on an empty gutter) | **NEW** | Beats `introduction` + `hero_shot`; shot presets `entrance` and `hero_backlit`; QC `S009` requires ≥1 introduction beat per chapter |
| **3. Past life / villain beat** — ≥1 per chapter | **NEW** | Beats `past_life` / `villain`; QC `S010` requires one |
| **4. End question** — the last panel asks something the reader must scroll for | **MERGED** | Extended my `cliffhanger`/`sting` beats with `end_question`; QC `S003` accepts any of them, and `S011` warns when the last panel is a statement rather than a question |

## Panel density

| Their point | Status | How it landed |
|---|---|---|
| Reference-tier chapters run **~110–130 panels**; story pages average 5–7 | **CONFLICT → resolved** | My pipeline's default target (40–80, ~55) is *platform survey* data; theirs is *reference-tier* craft. Resolution: `target_panels_per_episode` is now a series setting with named tiers — `standard` (~55), `dense` (~80), `reference` (~120). QC `S001` only complains relative to the selected tier. The demo uses `reference` |
| When a chapter feels thin, add *cuts* — not plot | **NEW** | `refine --pad` proposes detail-crop beats (eyes, mouths, hands, boots, fists) to reach the target density from existing panels |
| Break medium shots into detail-crop beats | **NEW** | Shot presets `detail_eyes`, `detail_mouth`, `detail_hands`, `detail_boots`, `detail_fist`; `refine` flags medium shots that carry a whole beat alone |

## 2. Reference sheets before any panel

| Their point | Status | How it landed |
|---|---|---|
| Written character sheet: build, face, costume, props, acting rules, faction palettes, effect language, injury continuity, do/don't | **ADOPTED→extended** | `characters/<id>.json` gained `acting_rules`, `faction`, `effect_language`, `injury_continuity`, `dos`, `donts` |
| Individual portraits **and** labeled faction group sheets | **MERGED** | Prompt pack now emits three sheet kinds per character: turnaround, expression, **portrait**; plus one **faction group sheet** per faction |
| **Never lock a design until the user explicitly approves it** | **NEW** | `manhwa.py approve <ep|cast>` writes an approval record; `assemble`/`check` stamp the strip with an unapproved-cast warning (`C006`) if any on-screen character is unapproved |
| Generate all art with no text | **ADOPTED** | Negative block already leads with the anti-text terms; QC `A003` now verifies the negative block actually contains them |

## 3. Panel art

| Their point | Status | How it landed |
|---|---|---|
| Attach character reference images for likeness | **ADOPTED** | `queue.json` carries `refs` per job; `gemini`/`chatgpt` adapters instruct attachment; `--tool comfy` template has the LoRA slot |
| One clear shot per panel (establishing, medium, close-up, detail crop, action) | **ADOPTED** | Shot grammar expanded, incl. the detail-crop family |
| Vary heights aggressively: 3× tall openers, full-height SFX panels, tall narrow entrance strips | **MERGED** | Ratio bands implemented (below); presets `opener_tall` (1:3), `entrance` (1:3.2), `sfx_full` (full height) |
| Compose **empty space where balloons sit (upper thirds, clean skies) — never over faces, blades, or key clues** | **MERGED** | Prompt branch rewritten to the upper-third/clean-sky rule; the energy scan still verifies and moves any bubble that lands on detail; new `focus_guard` list per panel tells the prompt what never to cover |
| No text/words/letters/balloons/captions in art | **ADOPTED** | Unchanged (the whole thesis) |
| **If a generation is refused, restage as a genuinely different shot — never retry the same request** | **NEW** | `manhwa.py restage <panel-id> [--as silhouette\|aftermath\|detail\|environment]` rewrites the prompt blocks rather than re-sending; recorded in the QA log. Standing instruction added to `SKILL.md` |

## 4. Lettering

| Their point | Status | How it landed |
|---|---|---|
| Balloon vocabulary: white oval, jagged starburst, fuzzy burst (thought), dashed grey (whisper/narration), **inverted black** (dark/angry), **tinted** (cream glow / red outline = recognition, urgency), **symbol-only** ("?", "…"), **wobbly cloud** (hesitant cut-off), **linked double ovals** (one speaker continuing) | **MERGED** | `BUBBLE_STYLES` rebuilt to the full vocabulary: `speech` (true oval now), `shout`, `thought`, `whisper`, `narration`, `dark`, `urgent`, `recognition`, `symbol`, `hesitant`, `continuing`, plus retained `system`/`radio`/`sfx`/`technique`/`prop` |
| Three lettering voices: clean bold / condensed block / hand-brushed (shake, motion blur) | **NEW** | `voices` in `series.json`; `dialogue.voice` selects one; hand-brushed applies a deterministic shake and/or motion blur to the type |
| Balloons may live **in gutter gaps** with thin tails reaching into panels | **NEW** | `dialogue.place: "gutter"`. The compositor *reserves* the gutter height it needs before laying out, so the balloon always fits, and draws a thin tail from the gutter back into the panel toward the speaker |
| Tails point at the speaker | **ADOPTED** | Already implemented (`tail`, `tail_to`); gutter tails added |
| Technique names get small dark caption boxes in a panel corner | **NEW** | `style: "technique"` → compact dark plate, corner-anchored, smaller type |
| Prop text drawn directly on the prop in a hand font | **NEW** | `style: "prop"` + `prop_rect` + `rotation` → text drawn on the art, no bubble |
| 1080px: speech ~40px bold, max ~780px wrap width | **MERGED** | Base type becomes **40px at 1080** (was 30 at 800); `bubble_max_width_ratio` default **0.72** (780/1080) |
| SFX large, **colour-coded** (red violence, blue cold motion, violet mystery, black+white-glow impact), white outline or glow halo | **NEW** | `SFX_PALETTE` + `dialogue.fx`; SFX renderer draws a halo/glow behind the outlined type |
| SFX routinely break panel borders and hang in gutters | **NEW** | `sfx` respects `place: "border"` / `"gutter"` — the type is composited on the strip overlay, so it can overhang its panel freely |
| Speed lines (radial/horizontal/red-tinted), motion smears, impact flashes, trembling lines | **NEW** | New `effects.py`: `speed_radial`, `speed_horizontal`, `speed_rage`, `smear`, `flash`, `tremble`, applied per panel via `fx`, always composited (never asked of the art model) |

## 5. Scroll craft rules

| Their point | Status | How it landed |
|---|---|---|
| Gutters do the pacing; vast empty gutters are silence beats; fast action = short stacked panels, dread = tall panels + wide gaps | **ADOPTED** | `pace` → gap table already existed; extended with `silence` (white/black beats) and the `fill` panel type |
| **Close-ups dominate; max 2–3 establishing shots per chapter** | **NEW** | QC `S012`: warns above 3 establishing/environment/wide shots per chapter, and reports the close-up ratio (`--strict` demands ≥35%) |
| **Palette shifts mark scenes**; each location/time gets its own palette | **NEW** | `scenes: {id: {palette, tint}}` in `series.json`; panel `scene` field; the compositor applies a deterministic tint so scenes read as different worlds |
| **White-out = time shift, black-out = dramatic beat** | **NEW** | Panel `fill: "#ffffff"` / `"#000000"` + `height` → a solid colour beat with no art; `pace: "silence"` reserves the air around it |
| Effect languages stay distinct per faction — never mix | **NEW** | `effect_languages` in `series.json`; panel `fx_faction`; QC `C005` warns when two factions' effects appear in one scene |
| **Technique legibility: start pose → force direction → contact point → result → cost**, in that order | **NEW** | `refine` detects multi-beat action sequences and verifies a 5-panel technique scaffold is present, or emits the scaffold to fill |
| Heroes get backlit low-angle hero shots; mystery figures stay face-hidden with rim light; sweat drops, trembling lines, extreme eye/mouth close-ups | **ADOPTED→** | Presets `hero_backlit`, `silhouette`, `detail_eyes`, `detail_mouth`; `fx: tremble`; the hero-shot presentation rule is encoded in `prompts.py` when `beat` is `introduction`/`hero_shot` |

## 6. Canvas, ratios & platform specs

| Their point | Status | How it landed |
|---|---|---|
| **Production master 1080px wide**, variable panel heights, all art and lettering built at this width | **CONFLICT → resolved** | My `assemble` wrote the strip at the platform width (800). Resolution: **two widths in one pass** — `--width` (master, default **1080**) and `--export-width` (default = platform, 800). Tiles are cut from the master at up to `1280 × 1080/800 = 1728px`, then downscaled to 800 wide, which also *improves* upload sharpness |
| Panel ratio bands: tall establishing 1:2–1:3 · dialogue 4:5–1:1 · action 16:9–2:1 · detail 1:1–3:4 · SFX/bleed any | **MERGED** | `RATIO_BANDS` implemented; every shot preset carries a band; QC `P006` warns when a panel's ratio falls outside its shot's band |
| Gutters ~90px in the master, ~200px for WEBTOON, 600–1000px scene transition | **MERGED** | All gap values are authored **at 800 and scaled to the master** (×1.35 at 1080). `fast` retuned to 70px@800 ≈ their 90px in-master figure. QC reports gutters in both master and export pixels |
| WEBTOON upload spec: ≤800×1280, 2MB, 20MB and 100 images per episode, JPG/PNG | **ADOPTED** | Unchanged, now validated against the *export* pass rather than the master |
| **PDF delivery: 1080×1920 pages** | **NEW** | `assemble --pdf` writes `delivery/<series>-chNNN.pdf`, plus a full-height review JPG (master) and a phone-friendly copy (800-wide) |

## 7. Assembly & delivery

| Their point | Status | How it landed |
|---|---|---|
| Panels 1080 wide, ~90px gutters, title card first | **NEW** | Series `title_card` (optional art or a generated card) is emitted as the first panel |
| Full vertical JPG for review | **MERGED** | `strip-master.jpg` (1080) + `strip-web.jpg` (800, phone-friendly) |
| Paginate to 1080×1920 PDF pages | **NEW** | Implemented (multi-page PNG→PDF via Pillow) |
| Ship a phone-friendly copy with the master every time | **ADOPTED** | Both are always written |

## 8. QC gates

| Their point | Status | How it landed |
|---|---|---|
| **Panel contact sheet** — likeness vs reference sheets, no drift, no text baked into art, balloon space composed in | **NEW** | `manhwa.py sheets <ep>` writes `contact-sheet.png` **and** a `match-check-<char>.png` (reference sheet beside every panel that character appears in — the likeness gate), plus a per-panel checklist |
| **Lettering QC sheet** — placement, no clipped text, tails reach speakers, SFX positions, prop text inside props | **NEW** | `sheets` also writes `lettering-qc.png`: the strip annotated with balloon rects, tail endpoints, gutter balloons and SFX bounds |
| Final scroll read-through before delivery | **ADOPTED** | Already the manual gate in `docs/04`; now printed as a required step in the delivery manifest |
| Never skip the gates | **NEW** | `check --final` now fails if the contact sheet / lettering sheet are missing or older than the strip |

## 9. File conventions

| Their point | Status | How it landed |
|---|---|---|
| `refined/`, `reference_art/`, `reference_sheets/`, `chXX/panels|lettered/`, `your_files/*.pdf` | **MERGED** | `init` scaffolds all of them; `assemble` writes panels to `chNN/panels` (raw) and `chNN/lettered` (lettered), and the PDF to `your_files/<series>-ch<NNN>.pdf`. The original `episodes/`+`art/`+`output/` layout still works — the new tree is additive, not a replacement |

## 10. Standing rules

| Their point | Status | How it landed |
|---|---|---|
| Provided scripts get improved first; note what changed | **NEW** | `refine` (above) |
| Whole-project reference sheets before any panel generation | **NEW** | `prompts` orders sheets first and `check` warns (`F003`) when panels exist for a character with no approved sheet |
| Character/style consistency is the top priority; match-check every panel | **ADOPTED→** | `match-check` sheet is now a gate, not a suggestion |
| Never publish externally without explicit approval; "stop" halts immediately | **NEW** | `approve` ledger + `C006`; and the standing rule is written into `SKILL.md` verbatim |
| When a generation stalls/refuses, restate in one line and offer the choice cleanly — never narrate the stall as the user declining | **NEW** | `restage` command + an explicit behavioural rule in `SKILL.md` |

---

## Summary of what the supplied file changed

1. **Master width 1080**, not 800 — output is now a master + an export pass, which raises upload quality.
2. **Panel density is much higher** (110–130 at reference tier) and density comes from *cuts*, not plot.
3. **Chapter architecture is a contract** (engine / introduction / past-life-villain / end question) — now enforced by QC.
4. **Script refinement is a real stage** with a slop linter and programmatic panel-count verification.
5. **The balloon vocabulary is far richer** — inverted, tinted, symbol-only, wobbly, linked, dashed — plus gutter balloons, prop text and technique captions.
6. **SFX is art**: colour-coded, glow-haloed, border-breaking, with a speed-line/motion-smear/impact-flash effect family.
7. **QC is visual, not just numeric**: contact sheets, likeness match-checks and annotated lettering sheets.
8. **Approval and refusal behaviour is specified** — the two places where an AI pipeline most often goes wrong socially rather than technically.

Nothing in the supplied file was dropped. The three places where it overrode what existed are marked
**CONFLICT → resolved** above, and in each case the resolution keeps both behaviours behind a setting.
