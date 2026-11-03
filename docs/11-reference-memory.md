# 11 · Character reference memory & continuity

> Prompt wording is a suggestion. A reference image is a fact.

Every AI manhwa project fails in the same place: panel 3 is the character you designed, panel 14 is
their slightly-off cousin. The jaw narrows, the coat changes trim, the scar moves to the other
cheek. Nobody notices in a single panel; everybody notices by episode three.

This chapter is the fix the studio actually implements: **characters are versions, versions are
backed by reference sheets, and panels bind to a version.** Nothing here is aesthetic preference —
it's the difference between a pipeline and a slot machine.

---

## 1. The three laws

**Law 1 — Face and outfit are different objects.**
A face is permanent identity: skull shape, eye design, brows, hair silhouette, skin marks, body
proportions. An outfit is a scene decision. If you keep both in one prompt string, then "he takes off
his coat" is a request the model satisfies by redesigning his face. The studio stores `faceAnchor`
(permanent, never contains clothing) and `outfit` (default wardrobe), plus a per-panel outfit
override for one-off changes.

**Law 2 — No reference, no render.**
A recurring character is not ready to render until their version owns at least a portrait and a
full-body sheet. Prompt-only consistency survives roughly four to six panels before drifting. QC
reports the gap instead of pretending it doesn't exist.

**Law 3 — Never overwrite the base.**
A costume change, an injury, a time skip, an awakening: each is a **new version** that descends from
its parent. The base design stays canonical forever, so episode 40 can still render the episode-1
look correctly, and every future design keeps a traceable lineage.

---

## 2. Version types

| Type | Use it for | Inherits | Must preserve |
| --- | --- | --- | --- |
| `base` | The canonical design. One per character, created once. | nothing | everything |
| `variant` | Costume, weather damage, injury that persists across panels, age shift, timelined self | the base or another variant | face + at least two lineage markers |
| `evolution` | Power-up, awakening, monster stage, cursed form | the base or a variant | the lineage markers that let the reader recognise the person inside the new form |

Rules of thumb:

- Ephemeral state does **not** need a version. Sweat, rain on the shoulders, a split lip for two
  panels: put it in the panel's action or outfit override. A version exists to be *reused*.
- An injury earns a version the moment it must survive a scene break. That's also when the reader
  will notice if you forget it.
- Evolutions need one thing that does **not** change. A hunter's awakened form is allowed new eyes,
  new armour and a new silhouette — but keep the hair part, the signature scar, the way the coat
  hangs. That preserved detail is what makes the reveal read as transformation instead of recast.

Each version carries:

- `name` and `slug` (stable, used in exports and filenames)
- `description` — the design state in one or two sentences ("same face; coat soaked black, shirt
  translucent at the collar, mud to mid-calf")
- `identityMarkers[]` — short, literal, checkable ("chipped jade badge, left lapel"). These get
  injected into every prompt that uses the version.
- `images{}` — the sheets below
- `approved` — an explicit human "this is the design" flag

---

## 3. The five sheets (and why each exists)

| Sheet | Framing | What it prevents |
| --- | --- | --- |
| **Portrait** | head and shoulders, neutral, front | Face drift on close-ups — the panel type readers scrutinise most. |
| **Full body** | standing, front, feet visible | Proportion drift and "the outfit only exists from the waist up". |
| **Turnaround** | front / three-quarter / profile / back | Off-model three-quarter and back views, which is where models improvise most. |
| **Expressions** | neutral, angry, shocked, smiling, determined, pained | Acting that quietly redesigns the face to emote. |
| **Poses** | standing, running, attacking, blocking, falling, reaching | Fight blocking that changes anatomy to fit the pose. |

Build order: portrait → full body → turnaround → expressions → poses. A version is *renderable* at
portrait + full body; the other three raise consistency with every panel type you add.

**Chapter snapshots (pinning).** Each version can be **pinned to an episode** ("Pin to this episode"
in Reference memory). A pin freezes the design as that chapter's snapshot, so later variants or
evolutions cannot silently rewrite an earlier episode's renders. QC warns when a panel uses a
version pinned to a *different* episode (`pin-mismatch`), reminds you when an episode has no pinned
version (`unpinned-episode`), and raises a **drift alarm** (`drift-risk`) when a character appears in
3+ panels of the episode with no image reference at all.

**Fast path — the master sheet (one image).** For a chapter where you want one reference to carry the
whole cast look, generate a single **Master** image: one clean sheet grid containing the portrait,
full body, four-view turnaround, six expressions and six poses of the same character in one picture.
Attach that one image to the version's *Master (one image)* slot and it is attached to every panel
render exactly like the individual sheets — and a version with only a master sheet already counts as
having a reference, so the "no reference, no render" rule passes.

Practical notes that save hours:

- Render sheets at the same aspect ratio family as your panels and against a **flat neutral
  background**. Busy backgrounds leak into renders as unwanted scenery.
- Keep one sheet per file. Cropped grids lose detail exactly where the model needs it.
- Re-render sheets when the *style lock* changes, not when the story does. A new version needs new
  sheets; a new look needs new sheets for every version in use.
- Generate expressions and poses as variations of the portrait, not as fresh illustrations from the
  text alone — that's how they stay on-model.

---

## 4. Binding versions to panels

A panel stores `versions: { characterId: versionId }`. No binding means the base version, which is
the correct default and keeps old projects valid.

Typical bindings in a 40-panel episode:

- Panels 1–12 (rain, night 1): base
- Panels 13–28 (second night, soaked): `ep01-rain` variant
- Panels 29–31 (awakening): `awakened` evolution
- Panels 32–40 (aftermath, torn coat): `post-fight` variant

The studio also resolves, per panel, **which reference images to attach**: every bound version's
available sheets, portrait and full body first, capped at four images per generation. More images is
not better — four clean sheets beat nine noisy ones.

---

## 5. Conditioning, not describing

Reference sheets only help if they reach the model as *images*. The studio does this per provider:

- **OpenAI `gpt-image-1`** — multipart `/v1/images/edits` call: the prompt plus the sheets as
  `image[]` parts. The prompt then says "use the attached reference sheets as the visual reference;
  keep face shape, eye design, hair silhouette and costume identical."
- **Google Gemini image models** — `generateContent` with the prompt and each sheet as an
  `inlineData` part.
- **Text-only providers** (storyboard engine, Pollinations) — the sheets are ignored. The Render
  stage shows reference counts as "(unused)" rather than implying conditioning that isn't happening.

Prompt-side rules that matter once images are attached:

1. State the reference explicitly. Don't assume the model knows what to do with a second image.
2. Enumerate the allowed changes: pose, expression, camera angle, lighting, damage, sweat, motion,
   temporary props. Everything else is locked.
3. Never merge two characters' features. With two sheets attached, models blend them — name each
   character and their markers separately in the prompt.
4. Keep the style lock first in the prompt, every time. References carry design; they do not carry
   your look.

---

## 6. Location continuity

Locations deserve the same discipline as faces, for the same reason. The studio treats each entry in
the world's location list as a **canonical description string** and offers it as a suggestion on
every panel's setting field, so the same place is described with the same words across an episode.

- Write each location once, self-contained: architecture, light source, ground texture, one recurring
  detail ("the ticket window with the missing pane").
- Reuse the wording verbatim while the scene stays put.
- On a location change, give the reader an establishing shot before the dialogue resumes. The
  transition is also when outfit overrides should change.
- Never describe a location by negation ("not the bridge"). Image models render the noun.

---

## 7. Editing a panel with words

A panel prompt is a draft, not scripture. The Render stage accepts a plain-language instruction
("move him left, add rain, lose the lantern glow") and rewrites **that one prompt**:

- With a model connected: the current prompt, the panel facts and the bound versions' markers are
  sent together, and only the new prompt comes back. The style lock and identity blocks are given as
  invariants, not suggestions.
- Offline: the instruction is appended to the existing prompt. Coarse, but deterministic, and it
  never destroys the compiled prompt — you can always reset to it.

Edits are per panel and reversible. If an instruction needs to apply to six panels, that's a version
or an outfit override, not six edits.

---

## 8. Continuity ledger

Cheap, unglamorous, and the single most professional habit in the list. Before rendering a scene,
answer four questions in the panel note or the episode log:

1. **Time** — how long since the last panel? Hair, stubble, wounds and weather all encode this.
2. **Injuries** — what is still broken, and which version carries it?
3. **Props** — who is holding what, in which hand, chipped where?
4. **Knowledge** — who knows what, as of this panel? (The most common continuity error is a
   character reacting to information they haven't received.)

The studio's QC pass checks the mechanical version of this: dangling version bindings (bound to a
deleted version), bound versions with no sheets, cast members with no reference memory at all, and
characters whose anchor still mixes face and wardrobe.

---

## 9. The checklist

Before you call a character ready:

- [ ] `faceAnchor` exists, is literal, and contains **no clothing**
- [ ] `outfit` exists as the default wardrobe
- [ ] A `base` version exists, approved
- [ ] Portrait + full body sheets attached
- [ ] Identity markers listed (2–5, each visually checkable)
- [ ] Any costume/injury/power state that outlives a scene has its own version, with lineage markers
- [ ] Panels using a variant or evolution are actually bound to it
- [ ] Location strings reused verbatim within a scene
- [ ] Continuity ledger updated for time, injuries, props, knowledge

---

## 10. Provenance

The version model, the five-sheet reference set and the "no reference, no render" rule in this chapter
were adapted from **RemiPelloux/agent-mangaka-forge** (MIT licensed), a Codex skill pack that stores
character memory under `img-memory/`. The face/outfit separation, dialogue-budget discipline and
natural-language panel editing were informed by **jays0606/mangstoon_ai** (no license — concepts
only, no code or text reused). The implementation here is original: browser-local, TypeScript, and
wired to the studio's own prompt compiler, QC engine and image providers.
