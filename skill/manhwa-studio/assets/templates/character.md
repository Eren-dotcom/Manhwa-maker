# Character sheet template — the consistency lock

Fill this in **before** any panel is generated, then convert it to `characters/<id>.json`.
`manhwa.py prompts <ep>` turns the `prompt_block` into the per-panel character clause, so every word
here is reused on every cut of the whole series. Vagueness here is drift later.

**Never lock a design until the user has explicitly approved the reference sheet.**
Record the approval: `manhwa.py approve character <id>:sheet --note "..."`.

---

## Identity

| Field | Value |
|---|---|
| id | `sera` |
| name | Sera Vane |
| role | lead / protagonist |
| age read | 26 |
| one identifying mark | a small pale scar through the LEFT eyebrow |

That mark is the single most important line on this page: it is what the reader's eye uses to confirm
identity in a 2-second glance, and what your QC match-check checks first.

## prompt_block (frozen — never paraphrase, never reword per panel)

> 26-year-old woman, sharp narrow dark eyes with amber flecks, black hair in a wet low ponytail with a
> blunt fringe, small pale scar through the left eyebrow, grey technical rain jacket with the collar
> up, black high-neck top, silver dog-tag necklace, black courier satchel strap across the chest,
> heavy boots, tired expression

Rules for this block: front-load the identifying features, one clause per feature, no adjectives that
another artist could interpret differently ("cool", "stylish" are noise), and never add plot
information ("looking guilty") — that belongs in the panel's `action`.

## Costume sets

| Outfit | When | Description |
|---|---|---|
| `courier_wet` | most of ch1 | the jacket above, soaked, collar up |
| `courier_dry` | flashback | same, dry, satchel off |

Max 2 per chapter (`C003`). Changing costume is a scene change, not a mood.

## Acting rules

How they hold themselves — what keeps them recognisable in a close-up with no costume visible.

- stands square, weight even, hands out of pockets only when moving
- looks at people, not past them; blinks slowly when she is lying
- never raises her voice; goes quieter when she is angry

## Faction, effect language and props

| Field | Value |
|---|---|
| faction | `courier_guild` |
| effect language | pale blue rim light, thin vertical motion streaks (`fx_faction: courier`) |
| props | data shard, dog tags, satchel |

Effect languages must stay distinct between factions and are never mixed in one scene (`C005`).

## Injury and continuity

- left-brow scar: always visible, same side, every panel, both in the sheets and the art
- ch1: right forearm scraped from p013 onward — same arm, same stage
- hair is wet from p001 to p017, dry only in the memory panel

## Do / don't

**Do:** keep the fringe length, the jacket collar up, the scar on the left.
**Don't:** give her a bun or topknot, no makeup, no earrings, no visible logos, no text on her gear
(prop text is added by the letterer, never generated).

## Reference images

- `reference_sheets/sera_turnaround.png` — front / 3-4 / profile / back, approved by the user
- `reference_sheets/sera_faces.png` — six expressions
- `reference_sheets/sera_portrait.png` — cover-grade portrait
- `assets/refs/*` — anything attached as conditioning for img2img / FaceID / LoRA training

Then lock the seed and the LoRA (see `references/04-continuity.md`).
