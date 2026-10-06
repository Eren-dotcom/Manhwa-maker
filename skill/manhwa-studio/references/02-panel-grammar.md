# 02 — Panel grammar, pacing, and scroll rhythm

The vocabulary the pipeline understands. Use these exact strings in `episodes/*.json`.

---

## 1. Shot presets

Each preset expands into a camera fragment for the prompt, a suggested aspect ratio, and a default
bubble position.

| `shot` | Camera fragment | AR | Reads as |
|---|---|---|---|
| `establishing_wide` | extreme wide, environment dominant, tiny human for scale, deep DOF | 2.2 | place + scale |
| `wide` | wide, full body, subject on the right third, environment visible | 1.8 | action in context |
| `medium` | waist up, centred, shallow DOF | 1.3 | dialogue |
| `cowboy` | mid-thigh up, three-quarter view | 1.2 | dialogue + stance |
| `medium_low` | low angle looking up, subject looming | 1.3 | power, threat |
| `medium_high` | high angle looking down, subject small | 1.3 | exposure, defeat |
| `close` | face and shoulders, eyes in focus, background blurred | 1.0 | emotional beat |
| `extreme_close` | eyes only, macro, iris reflection | 1.0 | shock, revelation |
| `ots` | over-the-shoulder, foreground blurred, listener in focus | 1.5 | two-hander dialogue |
| `insert` | detail of a prop in hand, tight | 1.4 | the object the plot hangs on |
| `pov` | first person, hands in lower frame, wide angle | 1.6 | immersion |
| `silhouette` | backlit, rim light, face unreadable | 1.6 | mystery, menace |
| `action` | extreme foreshortening, motion blur, diagonal | 1.7 | impact (**never put dialogue here**) |
| `crowd` | many background figures, foreground subject in focus | 1.9 | scale of people |
| `top_down` | bird's-eye of the scene | 1.9 | geography, defeat |
| `environment` | empty scene, no characters, mood only | 2.0 | the "breath" panel |

**Camera variety rule:** never use the same shot 3 panels in a row. The QC tool flags it. A reliable
conversation pattern is `medium → ots → close → medium_high → extreme_close`.

## 2. Beats and the lighting they imply

`beat` selects a lighting/mood fragment so the episode is graded as a unit.

| `beat` | Lighting fragment | Typical position |
|---|---|---|
| `hook` | cold ambient, high contrast, ominous calm | panels 1–5 |
| `establish` | wide ambient, soft haze | scene openers |
| `setup` | neutral soft light, readable | early |
| `inciting` | warmer, something off-centre | ~10–20% |
| `turn` | hard side light, half the face shadowed | 20–30% |
| `build` | gradually brighter, tightening | rising action |
| `midpoint_hook` | colour-temperature break (sudden red/cyan) | **30–40%** |
| `conflict` | hot key light, deep blacks | middle |
| `reveal` | strong rim light, deep shadows, colour accent | ~2/3 |
| `comedown` | low contrast, dim, quiet | after a peak |
| `impact` | blown-out highlight, motion streaks | climax |
| `action` | high key + motion blur + speed lines | climax |
| `reaction` | single soft key on the eyes | after impact |
| `cliffhanger` | hard backlight, silhouette edge, unanswered | final 2–3 |
| `sting` | single hard light, everything else crushed to black | last panel |

## 3. Pacing: gutters carry time

| `pace` | Gap after the panel (at 800px width) | Use for |
|---|---|---|
| `fast` | 80px | rapid dialogue, action beats, comedy timing |
| `normal` | 200px | default (the WEBTOON floor) |
| `dramatic` | 600px | a beat landing before a reveal |
| `transition` | 700px | location/time change (600–1000px per platform guidance) |
| `silent` | 1000px | the scroll-scroll-scroll before a big image |

**Reveal recipe** (works every time): small panel → small panel → 600–1000px of white → full-width
panel. The empty scroll *is* the tension.

**Emotional beat recipe:** tight gutters *into* the beat, then one wide gutter *out* of it.

## 4. Panel height and vertical composition

At 800px width:

- A **full-screen beat** is 1100–1400px tall (≈ one phone screen).
- A standard dialogue panel is 340–460px tall.
- An insert or short beat is 260–340px.
- An establishing panel is 380–520px and often `bleed: true` (full width, no side margins).
- Keep the average panel height ≥220px; below that the scroll reads choppy (the QC notes it).

The compositor derives heights from the art's aspect ratio when you don't set `height`. Set it
explicitly when you want the rhythm to be deliberate — e.g. `height: 1300` for the reveal panel.

**Composition inside the panel:** leave clean negative space where the bubble goes. The toolkit adds a
"leave clean negative space in the X area" instruction to the prompt whenever a panel has dialogue,
then verifies with an edge-energy scan and moves the bubble if the model ignored you.

## 5. Episode architecture (the load-bearing structure)

```
panels 1–5      HOOK            a stranger decides whether to keep scrolling. Start in motion.
panels 6–10     re-establish    weekly readers have forgotten. Remind them without a recap dump.
~15%            inciting        the thing that starts the episode's engine
~30–40%         MIDPOINT HOOK   the biggest reader drop-off point. Place a surprise/question here.
~55%            build
~66%            CLIMAX          the largest event, deliberately NOT at the end
~75%            comedown        let it land. One breath panel is allowed here.
last 2–3        CLIFFHANGER     a reveal, a sting, or an unanswered question. End on an image.
```

Additional rules from working creators:

- **One action per panel.** A scene that would be 4 page-comic panels is 20 webtoon panels.
- **Re-establish in 3–5 panels**, not with a text recap.
- **End on an image.** Dialogue in the last panel usually weakens the cliffhanger — give the line its
  own panel just before it.
- **Never dump backstory in episode 1.** Backstory lands from episode 3–5 once the reader is invested.
- **Episode length discipline:** 40–80 panels (~55–60 typical). Readers calibrate to your length;
  changing it abruptly costs completion rate.

## 6. Sound effects and silence

- SFX are typography, not dialogue: `style: "sfx"`, big, outlined, rotated slightly.
- One SFX per panel maximum, and never the same word twice in a row.
- A **silent panel** (no dialogue, no SFX, environment only) after a big event is one of the most
  effective tools in the form — and the cheapest panel you will ever produce. Use it after reveals.
