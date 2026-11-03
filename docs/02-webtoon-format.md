# 02 · The vertical scroll format

> The format is not a page that got taller. It is a continuous timeline with a camera, and the reader controls the playhead.

## Canvas specifications

| Platform | Width | Height | Notes |
| --- | --- | --- | --- |
| Naver Webtoon / Series | 690px | variable (no hard cap) | 72 dpi, sRGB. Heights of 20,000–60,000px per episode are normal. |
| KakaoPage | 690px | variable | Similar to Naver; wait-to-free monetisation. |
| WEBTOON (global) | 800px | 1,280px **per uploaded image** | English-first; 800px is the de-facto standard for international release. An episode is a stack of ≤1,280px-tall images, not one tall file. |
| Tapas | 940px | variable | Slightly wider; useful for detailed art. |
| Lezhin | 690px | variable | Paid/coin model; often higher panel counts. |
| Your own site | 1080px+ | variable | Only if you also serve a mobile view; these readers are mostly desktop. |

Practical master file: **800px wide, RGB, 72–150 dpi, PNG-24 or high-quality JPEG per panel.** Keep a layered master at 2× (1600px) if you can afford the disk — you will need it for print collections and for re-cropping a panel for social media.

### Safe areas

- **Side margins:** 24–40px at 800px width. Full-bleed art still needs its subject inside 80% of the width, because some readers view in a slightly cropped in-app viewer.
- **Top/bottom of each panel:** 20px of breathing room for balloon tails and caption boxes.
- **Balloon safe area:** 8–92% horizontally, 6–94% vertically. Anything outside is at risk of being clipped or of fighting the UI overlay some platforms place at the bottom of the screen.

## Scroll units: the real unit of composition

A **scroll unit** is roughly one phone screen — 700 to 1000px of vertical distance at 800px width. It is the smallest amount of story a reader consumes without a decision.

Rules of the unit:

1. **Every unit ends with a reason to continue.** A question, a threat, a reversal, an image too strange to leave. If the bottom of the unit is a talking head saying "we should go", you have lost the thumb.
2. **3–5 panels per unit** is the sustainable rhythm. One giant panel per unit is a splash and should be used 1–2 times per episode.
3. **A turn is a visual event, not a line.** The cheapest and most reliable way to end a unit is an image that changes the meaning of the previous panel — a lantern going out, a face appearing in the fog, a hand where there should not be one.
4. **A quiet unit belongs before the last one.** Release the tension so the cliff can hit. This is the *breather* beat; it is mandatory.

### Standard 8-unit episode skeleton

| Unit | Beat | Job | Ends on |
| --- | --- | --- | --- |
| 1 | Hook | An image the reader has not seen before + one rule of the world | Quiet (or a soft question) |
| 2 | Setup | The protagonist's daily procedure, done competently and badly | Quiet |
| 3 | Cast | The pressure character arrives; polite conflict | Scroll turn |
| 4 | Turn | The procedure fails in a way the rules forbid | Reveal |
| 5 | Escalate | The cost at scale; the world is bigger than the job | Quiet |
| 6 | Reveal | The problem becomes personal | Cliff |
| 7 | Breather | Silence, rain, one prop held too tightly | Quiet |
| 8 | Stinger | Physical contact; cut on it | Cliff |

Total: 35–50 panels. At Naver densities (45–70), split units 5 and 6 into two visual sequences each.

## Gutters are time

| Gutter | Reads as |
| --- | --- |
| 0–40px | Same instant, or a cut within a single action |
| 80–140px | Normal beat change; the default |
| 180–260px | A pause. The reader's eye rests; expectation builds |
| 280–500px | Deliberate silence, a location change, or the breath before a reveal |
| 600px+ | A hard chapter-break feeling; use once per episode at most |

Never use a uniform gutter for a whole episode. Rhythm lives in the difference between 90px and 240px. A scroll with identical gutters and identical heights is a metronome, and metronomes put readers to sleep.

## Panel height is a verb

| Height (× canvas width) | Reads as | Use for |
| --- | --- | --- |
| 0.45–0.6 | Snap, interruption | Inserts, single eyes, punch-ins on a reaction |
| 0.7–0.9 | Exchange | Conversation, close-ups, quick reversals |
| 0.95–1.15 | Standard | Medium shots, blocking, most action |
| 1.25–1.5 | Linger | Establishing shots, isolation, a held silence |
| 1.6–2.2 | Overwhelm | Splashes, reveals, catastrophe, single-image episodes |
| Full bleed, no frame | Breath or shock | Once or twice per episode, never more |

If 60% of your panels share a height, the episode is visually flat no matter how good the drawings are. This studio's QC engine flags it for exactly that reason.

## Page breaks do not exist — but "cuts" do

Because there is no page, you cannot rely on a page-turn reveal. The replacements:

- **The bottom edge of a tall panel** — the reader has to scroll to find out what is below. This is the closest thing to a page turn.
- **The gutter before a reveal** — a 240px pause tells the reader something is coming.
- **A panel that starts mid-action** — the next panel opens on the consequence, so the reader's brain fills the gap and feels clever.
- **The crop** — cutting a character mid-face at the bottom edge makes the next panel's reveal inevitable.

## Reading order and flow

- Down the strip, and **left-to-right inside a panel**.
- Balloons are read in the order they appear as you scroll: top before bottom, left before right.
- A balloon at the bottom of panel N never precedes a balloon at the top of panel N+1.
- Tails must point at the speaker. In a scene with more than two people, every balloon gets a tail.
- If the reader has to hunt for order, the panel is broken, even if it is beautiful.

## Thumbnail legibility

Every panel must survive being seen at 120px wide, because that is how it appears in a platform's episode list and in a reader's memory.

Test: blur the panel. Can you still tell (a) how many people are in it, (b) where they are looking, (c) what changed? If not, simplify the silhouette and raise the contrast between subject and background.

## Colour script

Webtoons are colour-first, and colour is a narrative instrument:

- Assign every location a dominant hue and a light source. Cheonan's river is blue-black with one warm lantern; the Bureau is green-lamp institutional; the tenements are sodium-orange.
- Shift the palette at emotional turns, not at location changes. A scene that suddenly warms up tells the reader something before a character says it.
- Keep skin tones consistent across characters within a scene — mixed lighting is a legitimate choice, but it must be a *decision*, not drift.
- Reduce saturation for flashbacks, increase contrast for violence, desaturate everything except one accent colour for shock.

## Upload sectioning (the part that surprises people)

A finished episode is usually **not** uploaded as one enormous PNG. WEBTOON Canvas stacks images of
bounded height, and the exact numbers matter more than any art decision:

| Spec | WEBTOON Canvas | Notes |
| --- | --- | --- |
| Image width | 800px | Wider images are accepted but silently sliced and re-encoded |
| Image height | ≤1,280px **each** | Taller strips are auto-sliced by the platform |
| Images per episode | up to 100 | Community norm lands around 60–80 panels |
| File size | ≤2 MB per image, ≤20 MB per episode | Both limits apply |
| Format / colour | JPG or PNG, RGB | Never CMYK; DPI is print metadata and does nothing on screen |
| Series thumbnail | 1080×1080 (<500 KB) or 1080×1920 (<700 KB) | Square for the grid, tall for the feature rail |
| Episode thumbnail | 202×142 | Rectangular |

Naver, Kakao and Lezhin sit around 690–720px; Tapas recommends 940px. Treat every non-WEBTOON number
as a community norm and re-check the creator dashboard before a release — platforms change their
handling without changing their help pages.

**Why sectioning is a craft decision, not a chore.** A section boundary is a hard cut the reader can
see if it lands badly: cutting through a face or a balloon looks like a rendering bug. Because the
studio authored every panel and gutter, it knows the exact pixel geometry of the strip and can cut
where the gutters already are, instead of letting the platform guess. That is what the **Upload plan**
in stage 8 computes: 800 × total-height, sliced every 1,280px, with a warning when a cut lands inside
the middle 40% of a panel.

**Nudge gutters, don't re-draw.** If a cut lands badly, adding 60–120px to the gutter above that
panel moves the boundary into empty space at zero art cost.

## Delivery checklist (format)

- [ ] Width matches the platform exactly.
- [ ] No panel wider than the canvas; full-bleed panels align to the canvas edge.
- [ ] Episode sliced into upload sections (WEBTOON: 800×1280, ≤2 MB each, ≤20 MB total, ≤100 files).
- [ ] No section boundary cuts through a face, a balloon or a key prop — move the gutter instead.
- [ ] Section files named in reading order (`ep01_01.png` …) so the platform stacks them correctly.
- [ ] Text at least 24px at 800px width for speech, 22px for captions.
- [ ] No critical content within 20px of any panel edge.
- [ ] File naming: `series-ep042-p07.png` — episode and panel always, because you will re-cut these.
- [ ] Thumbnail (platform-specific, usually 1080×1440 portrait) chosen from the strongest single panel of the episode.
