# 08 · QC and continuity

> QC is not taste. Taste is what you argue about on Saturday. QC is the list of things that are *objectively wrong* and will be caught by a reader, a platform reviewer, or a licensor.

## The five continuity axes

1. **Character** — hair length, eye colour, scars, jewellery, outfit, injuries, weight of the silhouette.
2. **Object** — props, weapons, letters, phones, food. If a prop changed hands, show the hand.
3. **Space** — where the door is, which side the river is on, how far the bridge is from the Bureau.
4. **Time** — time of day, weather, season, how much time passed since the last scene.
5. **Knowledge** — who knows what, and when they learned it. The most common plot error in serials.

Maintain a **continuity ledger** per series: one line per fact, with the episode it was established. This studio's bible export is designed to be that ledger.

## Blocking (must-fix) errors

- Missing logline, cast, or beat sheet.
- A panel with no staging at all.
- Balloons outside the safe area, or duplicate reading order.
- Empty balloons.
- A speech balloon with no tail in a multi-character panel.
- No cliffhanger on a serialised episode.
- Text that overflows its balloon at phone size.
- A character in a panel who is not in the cast.
- Contradicted continuity from the ledger.

## Notes (fix before shipping, but not fatal)

- More than 3 balloons on a panel.
- More than 35 words on a panel.
- 3+ silent panels in a row without progression.
- Uniform panel heights across a whole episode.
- An establishing shot carrying dialogue.
- A repeated shot type back to back.
- No full-bleed panel in the episode.

## Detecting versus repairing

A checklist that only describes the problem is a nag. This studio splits its checks into two kinds,
and says which is which:

**Repairable, mechanically.** The audit names a defect that has exactly one correct correction, so the
studio performs it — style lock unfrozen (derive it from the look, line weight, shading and palette),
character with no anchor (scaffold one from name, age, silhouette and outfit), character with no visual
memory (create the base version), panel bound to a deleted version (clear the binding), panel not tied
to a beat (assign it to the beat its position falls into), uniform panel heights (re-stretch them into a
rhythm), balloon inside the trim margin (clamp it into the safe area), speech balloon with no tail
(add one when more than one figure is on panel), empty balloon (delete it), duplicate reading order
(renumber top-to-bottom, left-to-right). Each is one click, all of them are a single "Fix
automatically" pass, and every repair goes through undo.

**Not repairable, by design.** Loglines, hooks, cliffhangers, dialogue that overflows, crowded
establishing shots, sheetless variants, empty panels. Anything that requires inventing story or art
stays with the author — the studio offers a link to the right stage instead of a plausible-looking
lie.

The rule of thumb: **if a fix would change what the story says, a human decides. If it only changes
whether the file is well-formed, the studio decides.**

## Measured checks (on the rendered pixels)

The audit engine reads the project. The **Render QA** pass reads the actual images, locally, with no
model call — because a prompt can promise contrast and a PNG can fail to deliver it:

| Measure | How | Fails when |
| --- | --- | --- |
| Resolution vs canvas | intrinsic width vs project width | render is narrower than the canvas → upscaled and soft |
| Aspect vs plan | image ratio vs the panel's planned ratio | more than ~8% off → cropping or letterboxing is inevitable |
| Exposure | mean luminance of a downscaled frame | below ~18 → crushed darks; above ~242 → no blacks to anchor |
| Contrast | standard deviation of luminance | below ~18 → flat, reads as fog on a phone |
| Dead border | outer ~2% band is uniform *and* differs from the interior | letterboxed render or a baked-in margin → visible seam |
| 120px survival | edge energy after downscaling to 120px wide | below the floor → the silhouette dissolves in a feed |

None of this judges whether a panel is good. It judges whether the panel survives a phone, which is
where it will actually be read. The report is text and portable — send it to an artist who never opens
the app.

## Readability audit

Do this at 360px physical width, one hand, in daylight:

- [ ] Every speech balloon readable without zooming.
- [ ] Every tail unambiguous.
- [ ] Faces distinguishable between characters.
- [ ] Captions distinguishable from speech.
- [ ] No text over a busy background.
- [ ] No key information within 20px of an edge.
- [ ] Contrast ≥ 4.5:1 on all text.

## Continuity audit (per episode)

- [ ] Who is present in every scene, and is it consistent with where they were?
- [ ] What time is it? Does the lighting agree?
- [ ] Wounds, wet clothes, dirt — carried forward?
- [ ] Props: count them at the start, count them at the end.
- [ ] Doors, windows, exits — same side as last episode?
- [ ] Names, titles and honorifics consistent in every balloon.
- [ ] Hair/clothing change only when a story reason exists.
- [ ] Flashbacks visually distinct (desaturation, border treatment, different line weight).

## Platform review: common rejection reasons

- Dimensions or file size outside spec.
- Text unreadable on mobile.
- Copyrighted characters, logos, or a living artist's style named in metadata.
- Excessive gore or sexual content outside the declared rating.
- Undisclosed AI generation where the platform requires disclosure.
- Broken reading order or missing panels.
- Titles/thumbnails that misrepresent the genre (a romance thumbnail on a horror series).

## Accessibility

- Alt text for every panel (one line: who, where, what changed).
- No information conveyed by colour alone.
- Avoid rapid strobing sequences; no more than three high-contrast impact panels in a row.
- Captions should also exist as a text summary per episode for screen-reader users.
- Use a dyslexia-friendly option in your own site's reader if you host one.

## The final read

Print the storyboard. Read it away from the screen, out loud, at speaking pace. You will catch:

- dialogue that cannot be said in one breath,
- panels that exist only because the script had a line,
- a cliffhanger that explains itself,
- and the exact place where you got bored.

That last one is the only QC finding that matters more than all the others.
