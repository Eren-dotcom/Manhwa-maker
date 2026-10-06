# 07 — QC gates

What `manhwa.py check <ep>` verifies, why each check exists, and what to do about it.

Reports land in `output/epNNN/qc-report.md` (+ `.json`). Exit code is non-zero on failure, so it drops
straight into CI or a pre-upload habit.

```bash
manhwa.py check 1                 # script + layout lint
manhwa.py check 1 --final         # also fails on missing art / leftover placeholders
manhwa.py check 1 --strict        # warnings fail the gate too
manhwa.py check 1 --json          # machine readable
```

---

## Mechanical gates (blocking — these break the upload)

| Code | Check | Why it matters |
|---|---|---|
| `L001` | strip width == platform width | a wider strip gets silently resized/re-encoded and looks soft |
| `L002` | every tile ≤ platform max height | 1280px on WEBTOON Canvas |
| `L003` | every tile ≤ platform per-image MB | 2MB on Canvas; a too-large tile is rejected or crushed |
| `L004` | tile count ≤ platform max images | 100 on Canvas |
| `L005` | episode total ≤ platform episode MB | 20MB on Canvas |
| `L006` | tile format accepted | Canvas takes PNG/JPG only |
| `R002` | rendered type ≥20px at output width | unreadable dialogue is the #1 amateur tell |
| `F001` | every panel has art on disk | otherwise it's a placeholder |
| `F002` | no placeholders in a `--final` build | don't accidentally ship storyboard frames |

## Editorial gates (warnings — these are judgement calls)

### Story structure
| Code | Check | Fix |
|---|---|---|
| `S001` | panel count vs budget | 40–80 panels; keep it stable episode to episode |
| `S002` | hook in the first 3 panels | open with an image or line that demands explanation |
| `S003` | ends on cliffhanger/reveal/sting | add a beat, or move the reveal to the last panel |
| `S004` | a `midpoint_hook` exists | 30–40% in is where you lose the most readers |
| `S005` | panels have descriptions | empty panels are undirected panels |
| `S006` | ≤3 bubbles per panel | split the beat across two panels |

### Pacing
| Code | Check | Fix |
|---|---|---|
| `P001` | gutters ≥200px (except deliberate `fast`) | panels read as one image below the floor |
| `P002` | `transition` panels have ≥600px of air | a time/location jump needs room |
| `P003` | not 3 consecutive panels on one shot | vary the camera |
| `P004` | no dialogue on an `action` panel | give the action its own panel |

### Readability
| Code | Check | Fix |
|---|---|---|
| `R001` | ≤30 words per bubble | split or cut |
| `R003` | no bubble covering >50% of a panel | shorten the line or re-anchor; the art needs air |

### Continuity
| Code | Check | Fix |
|---|---|---|
| `C001` | every speaker exists in the bible | add `characters/<id>.json` or use `narration` |
| `C002` | LoRA or reference images exist per appearing character | generate the sheets first (this is the earliest drift warning you get) |
| `C003` | ≤2 outfits per character per episode | too many costume changes confuse a weekly reader |
| `C004` | non-empty `prompt_block` | the consistency lock must exist |

### Disclosure & metadata
| Code | Check | Fix |
|---|---|---|
| `A001` | an AI disclosure string exists | put one in `series.json`, paste it into every episode description |
| `T001` | read time ≤12 min | long episodes lose completion rate on mobile |
| `T002` | average panel height ≥220px | very short panels read choppy |

---

## The manual gate (the toolkit can't judge taste)

Run this on a real phone before every upload.

1. **Scroll it at reading speed without stopping.** Where do you get bored? That's a *panel count*
   problem, not an art problem — merge or cut.
2. **Look at the first five panels only.** Would a stranger keep going? If not, the hook is the fix.
3. **Look at the last three.** Do you *need* the next episode? If not, raise the cliffhanger.
4. **40% zoom.** Every line of dialogue effortless? Any bubble over a face?
5. **Continuity sweep** (`references/04`): hair, mark side, outfit, palette, props, scene geography.
6. **Thumbnail check:** does your 1080×1080 cover read at 100px wide?
7. **Metadata:** title, tags, description, disclosure, schedule — and ≥2 finished episodes in buffer.

---

## Interpreting a report

```
2 errors, 5 warnings, 1 note
GATE: FAIL
```

- **Fix every ERROR.** They are objective.
- **Triage WARNINGS.** They're editorial: a `P003` shot-repetition warning on a deliberately static
  conversation is fine; the same warning on an action episode is a real problem. Decide, and note why.
- **Ignore NOTES** unless they cluster — a run of `T002` notes means your rhythm is uniformly choppy.

A clean `--final` run with zero errors and a triaged warning list is the same standard a studio editor
applies before an episode ships.
