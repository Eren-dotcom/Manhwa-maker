# Script template — chapter script in the format `refine` can read

Write the script in prose + cut list, then convert it to `episodes/epNNN.json`. `manhwa.py refine`
parses **this file** (`--source`) to check two things:

1. the panel count in the header against the panel sheet you actually built (`S016`)
2. the dialogue for slop, length and repetition (`D001`–`D004`)

So the header line matters: keep a single `Panels: N` (or `Cuts: N`) near the top.

---

SERIES: NEON ARCHIVE
CHAPTER: 1 — THE SHARD
Panels: 18
Tier: reference          ← standard ~55 · dense ~80 · reference ~110–130
Target read time: 8–10 min
Beats required: engine · introduction · past-life/villain · end question

## Premise (one paragraph)

Sera, a courier in a flooded sector, is handed a data shard that holds a memory of a night she does
not remember living. Playing it turns her own face against her.

## Cast this chapter

- SERA VANE — lead, appears in 11 cuts, outfit: courier jacket (wet). Voice: clean_bold
- KAEL — antagonist, appears in 3 cuts, outfit: long coat. Voice: clean_bold

## Cut list

Each cut is ONE image and ONE beat. If a line contains "and then", split it.

| # | Beat | Shot | Pace | Scene | Who | What the camera sees | Dialogue (≤20 words, 1–2 lines) |
|---|---|---|---|---|---|---|---|
| 001 | engine | opener_tall | normal | street_night | — | rain-drowned towers, empty arcade far below | SFX: KRRRSH |
| 002 | introduction | hero_backlit | normal | street_night | sera | low angle, rim light, collar up | nar: The rain in Sector 9 doesn't stop. It just changes hands. |
| 003 | setup | detail_eyes | fast | street_night | sera | eyes only, rain on skin | sera: One more delivery. |
| 004 | inciting | ots | normal | street_night | sera, kael | over her shoulder, Kael under a dead light | kael: Play it before sunrise. |
| 005 | inciting | detail_prop | normal | street_night | sera | gloved hand, shard glowing warm | nar: It was warm. Memories shouldn't be. · prop: JOB 77-C |
| … | | | | | | | |

## The four mandatory beats (check these before writing art prompts)

- **Engine** — cuts 1–5 state the chapter's visual idea in images, before anyone explains it.
- **Introductions** — someone is introduced or re-introduced with a hero shot (backlit / low angle /
  name balloon in an empty gutter).
- **Past life / villain** — one beat that reframes the present.
- **End question** — the last panel asks something the reader has to scroll to answer.

## Density

At `reference` tier you need ~110–130 cuts, but you do **not** need more plot. When the chapter feels
thin, add cuts: break a medium into detail crops (eyes, mouth, hands, prop, boots, fist), hold a
reaction one beat longer, cut to the thing being looked at. Run `manhwa.py refine <ep> --pad` and it
will propose them from the panels you already have.

## Rules that bite here

- 20 words max per balloon, 1–2 lines per balloon.
- No dialogue on an action panel — give the action its own cut.
- ≤2–3 establishing shots per chapter; close-ups and detail crops carry the rhythm.
- Never write text into an image prompt. Signage, screens and props are **blank** in art, and labelled
  later by the letterer (`style: "prop"`).
- No slop: no *delve, leverage, tapestry, realm, testament*, no "it's not just X, it's Y".
