# 05 — Hard rules

If you read one file in this skill, read this one. These are the rules that, when broken, are the
reason AI comics look like AI comics.

---

## Storytelling

1. **Hook in panels 1–5.** ~8 seconds, roughly 5 panels, before a stranger decides to leave. Start in
   motion; never open with setup.
2. **One action per panel.** "She turns *and* the door opens" is two panels.
3. **A second hook at 30–40%.** That's where completion drops hardest. Without it you lose 30–40% of
   starters; with it, 5–15%.
4. **Climax at ~2/3, cliffhanger at the end.** The last 2–3 panels are a revelation, a sting, or an
   unanswered question.
5. **End on an image, not a line.** If a character has a final line, give it its own panel before the
   sting image.
6. **Re-establish in 3–5 panels** every episode. Weekly readers forget.
7. **No backstory in episode 1.** It lands at episodes 3–5.
8. **≤3 speech bubbles per panel, ≤30 words per bubble.** Beyond that, split the beat.
9. **Never put dialogue on an action panel.** Give the action its own panel.
10. **Vary the camera.** Never three consecutive panels on the same shot.
11. **Keep the episode length stable** (40–80 panels, ~55–60 target). Readers calibrate.

## Layout

12. **Gutters carry time.** 200px floor, 600–1000px for scene transitions, <100px only for deliberate
    speed. The empty scroll before a reveal *is* the tension.
13. **Safe area:** faces, text and key detail inside the middle 80% of the width (~40px each side at
    800px).
14. **Average panel height ≥220px.** Shorter reads choppy.
15. **Draw bigger than you publish** (1.5–2.5×) and downscale on export.

## Art production

16. **Never let a model draw text, bubbles, borders or gutters.** Composite them.
17. **One frozen `prompt_block` per character**, verbatim, forever.
18. **One frozen style block** for the whole series.
19. **A character LoRA or a reference image for every recurring character.** Prompt-only consistency
    fails by panel 20.
20. **Character sheets before panels.** Always. Approve them first.
21. **One identifying mark per character** in the description — the thing you can verify in one glance
    during the continuity pass.
22. **4-colour palette, locked.** Palette drift reads as a different artist faster than face drift.
23. **Generate at a model-friendly size** (multiple of 64, ~1.15MP) matching the panel's aspect — never
    generate square and crop to a vertical strip.
24. **Fix by inpaint > img2img > re-roll > redraw.** Re-rolling a hand 20 times is the classic rookie
    time sink.

## Publishing

25. **Disclose AI use** in every episode description. Voluntary, cheap, and the regulatory direction
    is toward mandatory.
26. **Check the platform's AI policy** before you promise a launch, and check contest rules before you
    enter one (Tapas prohibits AI content; WEBTOON contests disqualify it; GlobalComix banned
    fully-AI art in March 2026).
27. **Never ship with a FAIL** in `check --final`. Zero errors is the floor, not the goal.
28. **Buffer 3–4 finished episodes** before episode 1 goes live.
29. **Never miss the weekly ship.** Cadence beats quality in reader retention — a great episode three
    days late costs more than a good one on time.
30. **Keep the project files.** They're your authorship record, and they're the only reason you can
    fix episode 3 in episode 40.

## Anti-patterns (instant tells of an amateur AI comic)

- misspelled or inconsistent lettering → you let the model draw text
- a face that changes shape between panels → no consistency lock
- panels touching with no gutter → geometry guessed instead of computed
- every panel the same height and shot → no panel grammar
- 15-panel episodes that dump lore → no hook
- a "widescreen" strip sliced straight through a character's head → tiles cut by pixel count instead
  of by calm rows
- a warm-lit panel in a cold-lit episode → palette not locked
- real people's faces, or a recognisable living artist's style → a rights problem, not a style choice
