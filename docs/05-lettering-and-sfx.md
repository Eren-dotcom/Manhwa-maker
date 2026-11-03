# 05 · Lettering, balloons & sound

> Lettering is where most AI-assisted webtoons fall apart. The art can be gorgeous and the page still unreadable if the balloons fight the faces, the tails lie, or the order is guesswork.

## Balloon types

| Type | Shape | Use | Budget |
| --- | --- | --- | --- |
| **Speech** | Solid rounded oval, tail to mouth | Normal dialogue | ≤ 12 words |
| **Thought** | Cloud or dashed oval, no tail, small trailing bubbles | Interior voice | ≤ 12 words |
| **Shout** | Spiky burst, bold caps, thick tail | Panic, attack, command | ≤ 6 words |
| **Whisper** | Dashed outline, small italic type, close to speaker | Secrecy, intimacy | ≤ 10 words |
| **Caption / narration** | Square-cornered box, upper third | Time, place, interior summary | ≤ 20 words |
| **Off-panel** | Balloon enters from the frame edge with a long tail that exits | Someone not visible | ≤ 10 words |
| **System / HUD** | Glowing rectangle or monospace panel | Game windows, status text | ≤ 10 words |

Never use a caption where a balloon belongs, and never use a balloon for narration. The shape is a promise about where the voice comes from.

## Tails

- A tail points at the **mouth**, or at the chest for thought.
- In a panel with two or more characters, every speech balloon gets a tail. Ambiguity is a bug.
- Never let a tail cross another balloon or a face.
- A tail that points at the back of a head is a reader-trust error: it says the person is speaking into the wall.
- Off-panel balloons may have a tail that leaves the frame entirely — this is the only tail allowed to cross a border.

## Reading order

1. Down the scroll.
2. Within a panel: **top to bottom, then left to right** (Korean and global manhwa read left-to-right — do not mirror).
3. A balloon at the bottom of a panel never precedes one at the top of the next.
4. Assign explicit order numbers in the file (this studio does) so a later editor cannot accidentally invert a scene.
5. If two balloons are at the same height, the left one speaks first.

## Placement

- **Safe area:** 8–92% horizontally, 6–94% vertically.
- **Never cover:** faces, eyes, hands that are acting, key props, the point where two characters connect.
- **Keep the speaker's eyeline clear.** Place balloons opposite the direction the character is looking, so the tail can point into open space.
- **Stack ascending.** In a vertical panel, put the first line highest. The eye travels down with the scroll.
- **One balloon per corner, maximum.** Two balloons in the same corner will collide on a phone.
- **Captions live in the upper third** and are left-aligned. They must never share a lane with a speech balloon.

## Typography

- **Speech:** a clean humanist sans (Noto Sans, Inter, or a Korean face like Noto Sans KR). 24–30px at 800px width. Line height 1.3.
- **Shout:** the same family, heavier and slightly larger, caps or wide tracking. Do not switch to a novelty font for a shout.
- **Whisper:** italic, 85% size, lighter weight.
- **Caption:** 22–26px, sentence case, letter-spacing +0.01em.
- **System/HUD:** monospace or a geometric sans, with a glow or a 1px border.
- **SFX:** a display or hand-lettered face (Bangers, a brush font, or custom). Never the same font as dialogue.

Korean-specific: Hangul needs slightly larger size and more line height than Latin at the same optical weight. Avoid all-caps styling for Korean — it does not exist. Do not break a Korean word across lines; break at spaces or after a particle.

## Sound effects

- SFX are **drawn**, not typed: they follow the motion, distort with the impact, and are part of the art layer.
- One SFX per panel, two maximum. The reader's eye must not compete with the action.
- Place SFX **outside the reading order** of the balloons — at the edges, over background, never over a face.
- Types: impact (`BAM`, `KRK`), friction (`shhk`), ambience (`fsss`), dramatic silence (a single dot or nothing at all).
- Use romaji/Korean onomatopoeia if the tone is native; use English if the release is global. Be consistent across the series.

## What bilingual release changes

- Keep Korean honorifics that carry information: `-ssi`, `-nim`, `sunbae`, `hyung/oppa`. Translate the rest.
- Fonts must cover Hangul *and* Latin in the same line if names are mixed. Noto Sans KR is the safe default.
- Text expansion: Korean → English grows 10–20%. Leave 15% slack in every balloon box.
- Right-to-left scripts (Arabic, Hebrew) require mirrored panels — a separate production pass, not a batch flip, because every SFX and every prop with text must be redrawn.

## Accessibility

- Minimum contrast 4.5:1 between text and balloon fill. Black on white is correct; grey on cream is not.
- Never encode information in colour alone (a red name, a green stat).
- Provide alt text or a captioned summary of each panel for platform accessibility features.
- Avoid motion-sickness effects — flashing, extreme speed lines on consecutive panels — in sequences longer than three panels.

## The lettering engine (studio automation)

Stage 07 runs a small deterministic engine (`src/lib/lettering.ts`) over every panel:

1. **Auto-size** — each balloon's type size is derived from its fill ratio against its kind's character ceiling (sm < 35%, md 35–75%, lg > 75%).
2. **Reading-order layout** — balloons are renumbered top-to-bottom, left-to-right, then stacked so estimated bounding boxes never intersect and everything stays inside the safe area.
3. **Tail logic** — speech balloons above the panel midpoint get an upward tail, below get a downward tail; narration and thought balloons get none.
4. **SFX clearance** — sound effects are nudged off any balloon box.

**Dialogue space engine.** Balloons need air: the engine measures the clearance between every pair of
balloon boxes and from each box to the safe-area edge, and enforces a floor of **4% panel gap between
boxes** and **2% edge clearance** (`MIN_BUBBLE_GAP` / `MIN_EDGE_GAP` in `src/lib/lettering.ts`,
exposed as `spacingReport`). QC raises `balloon-spacing` when a panel is cramped and the fix re-runs
the layouter.

Pipeline: **Auto-place** fixes one panel; **Letter whole episode** runs the engine over every panel. In QC, `balloon-overlap` and `balloon-size` are raised automatically and are one-click repairable.

## Lettering QC checklist

- [ ] Every balloon has a tail, or an explicit reason not to.
- [ ] Every tail points at a mouth (or a chest, for thought).
- [ ] No balloon covers a face, hands that are acting, or a key prop.
- [ ] All balloons inside 8–92% / 6–94%.
- [ ] ≤3 balloons per panel; ≤12 words per balloon.
- [ ] Reading order is unique and matches top-to-bottom, left-to-right.
- [ ] Captions in the upper third, left-aligned, never sharing a lane with a balloon.
- [ ] SFX drawn, not typed; never over a face.
- [ ] Font sizes consistent across the episode (one size per balloon type).
- [ ] Each balloon legible with the panel scaled to 360px wide.
