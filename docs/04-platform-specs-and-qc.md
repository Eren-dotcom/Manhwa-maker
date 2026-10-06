# 04 — Platform specs and the QC gates

## 1. Platform specifications

Numbers verified against platform help pages and creator guides as of **October 2026**. Where sources
disagree the toolkit marks the row unverified and tells you to check your own dashboard.

| Platform | Upload width | Max per-image height | Per-image size | Episode cap | Formats |
|---|---|---|---|---|---|
| **WEBTOON Canvas** | **800px** | **1280px** | **2 MB** | 20 MB, max 100 images | PNG, JPG/JPEG |
| Naver Webtoon (KR app) | 720px (800 accepted) | 1280px | 2 MB | 20 MB | PNG, JPG |
| Tapas | 940px (800 accepted) | 4000px | 5 MB | — | PNG, JPG, GIF |
| GlobalComix | 800px | very tall ok | 25 MB | — | PNG, JPG, WEBP |
| Self-hosted | 800px | keep ≤4000px for mobile loading | — | — | PNG, JPG, WEBP |
| Print master | 1600px+ | — | — | — | PNG |

Other numbers you'll need:

| Asset | WEBTOON spec |
|---|---|
| Series thumbnail (square) | 1080×1080, under 500 KB |
| Series thumbnail (vertical) | 1080×1920, under 700 KB |
| Episode thumbnail | 202×142 recommended |
| Colour mode | RGB (never CMYK) |
| DPI | irrelevant for screen — it is print metadata |

**Draw bigger than you publish.** 800px is a *display* spec. Work at 1.5×–2.5× (1,200–2,000px wide)
and downscale on export: you keep detail, you can crop, and you can go to print later. The toolkit's
`--width` flag does the downscale, and every generation resolution it emits is chosen to be sharp at
the output size.

**Safe area:** keep faces, text and important detail inside the middle ~80% of the width — roughly
40px of breathing room per side at 800px. Readers skim the edges.

**Tiling:** WEBTOON's uploader accepts one long strip and slices it for you, but it re-encodes and
that's where visual quality dies. Slicing it yourself, deliberately, into ≤1280px tiles gives you
control over where the cuts land. `layout.py` looks for the emptiest row within 320px *above* the
cap — that's why its tiles come out at ~1000–1068px instead of a hard 1280.

## 2. Project specs

| Thing | Value used by the toolkit |
|---|---|
| Working width | platform width × 1.5–2.5 (`--width`, or draw big and `assemble --width 800`) |
| Draw/export DPI | 350–600 for masters; irrelevant for the web export |
| Panel gutter floors | 200px normal, 600–1000px scene transition, <100px rapid action |
| Episode scroll target | 6,000–12,000px (≈5–8 min read); the manifest reports yours |
| Episode panel count | 40–80, target ~55–60 weekly |
| Base dialogue size | 30px at 800px width (≈20–28px lowercase height is the readability floor) |
| Max words per bubble | ~30 |
| Bubble width | ≤62% of panel width |

## 3. The QC gates (`manhwa.py check`)

### Mechanical (blocking)
| Code | Checks |
|---|---|
| `L001` | strip width == platform width |
| `L002` | every tile ≤ platform max height |
| `L003` | every tile ≤ platform per-image MB |
| `L004` | tile count ≤ platform max images |
| `L005` | episode total ≤ platform episode MB |
| `L006` | tile format accepted by the platform |
| `R002` | rendered type ≥ 20px at output width (16–20px = warn) |
| `F001/F002` | no missing art, no placeholders left (with `--final`) |

### Editorial (warn — these are the ones that cost readership)
| Code | Checks |
|---|---|
| `S001` | panel count within ~40–150% of the episode budget |
| `S002` | hook present in the first 3 panels |
| `S003` | episode ends on cliffhanger / reveal / sting |
| `S004` | a `midpoint_hook` exists somewhere around 30–40% in |
| `S005` | every panel has an action/description |
| `S006` | ≤3 speech bubbles per panel |
| `P001` | gutters ≥ the 200px floor (unless the panel is deliberately `fast`) |
| `P002` | `transition` pacing has ≥600px of air |
| `P003` | not 3+ consecutive panels on the same shot |
| `P004` | no dialogue sitting on an action panel |
| `R001` | ≤30 words per bubble |
| `R003` | no bubble covering >50% of its panel |
| `C001` | every speaker exists in the character bible |
| `C002` | every appearing character has a LoRA or on-disk reference images |
| `C003` | ≤2 outfits per character per episode |
| `C004` | non-empty `prompt_block` (the consistency lock) |
| `A001` | an AI disclosure string exists |
| `T001/T002` | read time and average panel height sanity |

Reports are written to `output/epNNN/qc-report.md` (and `.json`). `--strict` fails the gate on
warnings too — useful as a pre-launch standard once the pipeline is bedded in.

## 4. Manual pre-upload checklist (the human gates)

The toolkit can't judge taste. Before you upload, on an actual phone:

1. Scroll the whole episode at reading speed without stopping. Where do you get bored? That's a panel
   count problem, not an art problem.
2. Look at the first five panels only. Would a stranger keep going?
3. Look at the last three. Do you *need* the next episode?
4. Check the strip at 40% zoom (≈ phone scale): is every line of dialogue effortless to read?
5. Scan for continuity: scar, fringe, outfit, palette, jewellery, injury side.
6. Confirm the disclosure line is in the description.
7. Confirm the thumbnail (1080×1080, <500 KB) reads at 100px wide.
8. Title, tags, description, publish time — all set, and you have a buffer of ≥2 finished episodes.
