# 07 — QC gates

What the toolkit verifies, why each check exists, and what to do about it. Gates are never skipped:
the numeric gate (`check`) is cheap, and the three visual gates (`sheets`) are the ones that catch the
failures numbers cannot see.

```bash
manhwa.py refine 1 --source script.md     # script gates (D/S codes) -- run BEFORE art
manhwa.py check 1                         # script + layout lint
manhwa.py check 1 --final                 # also fails on missing art / placeholders / missing sheets
manhwa.py check 1 --strict                # warnings fail the gate too
manhwa.py check 1 --json                  # machine readable
manhwa.py sheets 1                        # the three visual gates
```

Reports land in `output/epNNN/qc-report.md` (+ `.json`). Exit code is non-zero on failure, so it drops
straight into CI or a pre-upload habit.

---

## Gate 1 — Mechanical (errors: these break the upload)

| Code | Check | Why it matters |
|---|---|---|
| `L001` | export width == platform width | a wider strip gets silently resized and looks soft |
| `L002` | every tile ≤ platform max height | 1280px on WEBTOON Canvas |
| `L003` | every tile ≤ platform per-image MB | 2MB on Canvas; oversized tiles are rejected or crushed |
| `L004` | tile count ≤ platform max images | 100 on Canvas |
| `L005` | episode total ≤ platform episode MB | 20MB on Canvas |
| `L006` | tile format accepted | Canvas takes PNG/JPG only |
| `L007` | master ≥ export width, and ≥1080 | below 1080 you are upscaling on export and losing detail |
| `R002` | rendered type ≥20px **at export width** | unreadable dialogue is the #1 amateur tell |
| `L000` | a manifest exists at all | no `manifest.json` ⇒ `assemble` has not run |

## Gate 2 — Script and craft (warnings: editorial judgement)

### Pacing — `P`
| Code | Check | Fix |
|---|---|---|
| `P001` | gutters ≥ the floor for their pace (except deliberate `fast`) | panels read as one image below the floor |
| `P002` | `transition` panels have 600–1000px of air | a time/location jump needs room |
| `P003` | not 3 consecutive panels on the same shot | vary the camera |
| `P004` | no dialogue on an `action` panel | give the action its own panel |
| `P005` | note: a gutter was reserved for a balloon | confirms the spacing is deliberate, not a mistake |
| `P006` | panel ratio inside its shot's band | tall 1:2–1:3 · dialogue 4:5–1:1 · action 16:9–2:1 · detail 1:1–3:4 |

### Readability — `R`
| Code | Check | Fix |
|---|---|---|
| `R003` | balloon ≤55% of its panel area | shorten the line or re-anchor; the art needs air |
| `R004` | ≤2 lines per balloon | split or shorten |
| `R005` | balloon not over the face band | re-anchor, or recompose with clean space |
| `R006` | gutter balloon has a tail | the reader cannot tell who is speaking |

### Continuity — `C`
| Code | Check | Fix |
|---|---|---|
| `C001` | every speaker exists in the bible | add `characters/<id>.json`, or use `narration` |
| `C002` | LoRA or reference images exist for each appearing character | generate the sheets — earliest drift warning you get |
| `C003` | ≤2 outfits per character per chapter | costume changes confuse a weekly reader |
| `C004` | non-empty `prompt_block` | the consistency lock must exist |
| `C005` | faction effect languages not mixed in one scene | mixing them erases your visual grammar |
| `C006` | every on-screen character's design is **approved** | never lock a design the user has not seen |
| `C007` | `acting_rules` present | how they hold themselves is what keeps them recognisable |

### Disclosure and metadata — `A` / `T`
| Code | Check | Fix |
|---|---|---|
| `A001` | an AI-disclosure string exists | put it in `series.json` and paste it into every description |
| `A002` | a negative prompt block exists | half your consistency comes from what you exclude |
| `A003` | the negative block contains the anti-text terms | otherwise models letter the art for you |
| `A004` | `craft_rules` recorded | if you studied a reference chapter, its lessons must be written down |
| `T001` | read time ≤12 min | long episodes lose completion rate on mobile |
| `T002` | average panel height ≥220px (at 800) | a run of very short beats reads choppy |
| `T003` | a delivery PDF exists | the spec's deliverable is 1080×1920 pages |

### Production state — `F`
| Code | Check | Fix |
|---|---|---|
| `F001` | every panel has art on disk | otherwise it is a placeholder (error in `--final`) |
| `F002` | no placeholders in a `--final` build | don't ship storyboard frames by accident |
| `F004` | QC sheets exist | run `manhwa.py sheets <ep>` |
| `F005` | QC sheets are newer than the strip | re-run `sheets` after every re-assemble |

## Gate 3 — Script refinement (`refine`, run before any art)

`manhwa.py refine <ep> --source script.md` writes `refined/` + `CHANGES.md`.

### Dialogue quality — `D`
| Code | Check |
|---|---|
| `D001` | slop: banned word or puffery pattern (delve, leverage, tapestry, "it's not just X, it's Y"…) |
| `D002` | more than 20 words in one balloon |
| `D003` | a line repeats an earlier panel verbatim |
| `D004` | repetitive wording inside one balloon |

### Chapter architecture — `S`
| Code | Check | Fix |
|---|---|---|
| `S000` | the episode has panels at all | an empty sheet cannot be assembled |
| `S001` | panel count vs the selected density tier (`standard` ~55 / `dense` ~80 / `reference` ~120) | `refine --pad` proposes detail cuts |
| `S008` | **engine** beat in the first 5 panels | state the chapter's visual idea in images first |
| `S009` | at least one **introduction** beat | every chapter introduces or re-introduces someone |
| `S010` | at least one **past-life / villain** beat | the reference spec requires one per chapter |
| `S011` | the chapter **ends on a question** | the last panel must make the reader scroll |
| `S012` | ≤3 establishing/wide shots | close-ups and detail crops must dominate |
| `S013` | ≥25% close-up / detail-crop panels | the density comes from cuts |
| `S014` | action runs carry a technique scaffold (start pose → force → contact → result → cost) | legibility |
| `S015` | every bible character is used or acknowledged | an unused cast member is a planning smell |
| `S016` | panel count matches the `Panels: N` header in the script | keeps you honest about the sheet |

## The visual gates — `manhwa.py sheets <ep>`

Numbers cannot see drift. These three sheets can.

| Sheet | What to look for |
|---|---|
| `chNN/contact-sheet.png` | every panel in reading order with labels — drift, baked-in text, palette breaks, blind spots. Ships with a human checklist |
| `chNN/match-check-<char>.png` | the character's reference sheet **beside every panel they appear in** — the likeness gate |
| `chNN/lettering-qc.png` | the lettered strip annotated with balloon rects, tail endpoints, gutter balloons, SFX bounds and prop text |

`check --final` fails (`F004`/`F005`) if these are missing or older than `strip-master.png`, so they
cannot be quietly skipped.

## The manual gate (the toolkit cannot judge taste)

Run this on a real phone before every upload.

1. **Scroll it at reading speed without stopping.** Where are you bored? That is usually a *panel
   count* problem, not an art problem — merge, cut, or add cuts.
2. **Look at the first five panels only.** Would a stranger keep going? If not, the hook is the fix.
3. **Look at the last three.** Do you *need* the next episode? If not, raise the cliffhanger.
4. **40% zoom.** Every line effortless? Any balloon over a face or a key clue?
5. **Continuity sweep** (`references/04`): hair, mark side, outfit, palette, props, scene geography.
6. **Thumbnail check:** does the cover read at 100px wide?
7. **Metadata:** title, tags, description, **AI disclosure**, schedule — and ≥2 finished episodes in
   the buffer.

---

## Interpreting a report

```
2 errors, 5 warnings, 1 note
GATE: FAIL
```

- **Fix every ERROR.** They are objective.
- **Triage WARNINGS.** They are editorial: a `P003` shot-repetition warning on a deliberately static
  conversation is fine; the same warning on an action chapter is a real problem. Decide, and note why.
- **Show the user the warning list** and ask which they want to accept.
- **Ignore NOTES** unless they cluster — a run of `T002` notes means your rhythm is uniformly choppy.

A clean `--final` run with zero errors and a triaged warning list is the same standard a studio editor
applies before an episode ships.
