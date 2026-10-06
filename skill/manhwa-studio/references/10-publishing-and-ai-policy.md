# 10 — Publishing, platform policy, and rights

Policy in this area changes month to month. **Verify on the platform's own page before every launch**
and before every contest entry. Dates below are when each source was published.

---

## Platform-by-platform (as of Oct 2026)

| Platform | AI-generated content | Notes |
|---|---|---|
| **WEBTOON Canvas** | **No published AI clause** — no platform-wide ban and no mandatory AI label, and no disclosure field in the uploader (verified against Canvas terms/community policy; latest policy update Jan 2026 contained none) | Silence is not permission. Canvas *terms* still require you to warrant you hold all rights to what you upload, and US copyright does not protect wholly machine-generated images — an untested tension |
| **WEBTOON contests** | **Prohibited.** Contest rules require entries "not be created using any form of generative artificial intelligence"; entries have been disqualified | A contest rule is not a Canvas rule, and vice versa |
| **WEBTOON Originals / ad-revenue tiers** | Not banned, but curated — AI use may affect selection; labelling is required on some monetised tiers | Read your contract |
| **Tapas** | **Prohibits AI-generated content outright** | Do not plan a Tapas launch around AI art |
| **GlobalComix** | **Banned fully-AI-generated art in March 2026**, while still allowing AI as one tool in a human-led workflow | The "human-led" distinction is the one most platforms are converging on |
| **Korea (any platform)** | Korea's **AI Basic Act** took effect **22 Jan 2026**: disclosure required for AI-generated content distributed in Korea. Machine-readable watermarks satisfy the rule for webtoons; one-year grace period for enforcement | Relevant because WEBTOON/Naver are Korean-headquartered |
| **Amazon KDP / print-on-demand** | Its own evolving AI-disclosure rules | Check before you upload a print edition |

**Practical stance:** disclose voluntarily, in every episode description. It costs nothing, it pre-empts
the reader backlash that followed the 2023 Naver AI-art incidents, and the regulatory direction is
toward mandatory labelling anyway. `series.json → ai_disclosure` exists for exactly this — the
`assemble` command prints it into `UPLOAD.md`.

Example wording:

> AI-assisted production. Story, character design, panel direction, lettering and editing by
> <name>; panel artwork generated with <models/tools> and retouched, composited and lettered by hand.

## Rights and copyright — the honest version

- **You own the script, the characters, the direction, the edit and the lettering.** Those are human
  authorship, and they're the part readers actually remember.
- **Wholly machine-generated images are not copyrightable in the US.** You cannot reliably stop
  someone from reusing your raw generated frames.
- **What to do about it:** keep the project files. `series.json`, `characters/*.json`,
  `episodes/*.json`, the prompt packs and the QC reports are a timestamped record of the creative
  decisions that produced the work — the strongest evidence of authorship you can hold. Keep them in
  version control (this repo's structure is designed for exactly that).
- **Never** train on or imitate a specific living artist's style, generate a real person's likeness,
  or reproduce another creator's characters. That's infringement/likeness exposure that no AI
  disclaimer covers.
- **Read every tool's ToS about ownership** before you commit to a hosted platform. Some publishers
  lock your series to their reader app on the free tier; some claim broad licences.

## Canvas vs Originals — what you're actually choosing

| | Canvas | Originals |
|---|---|---|
| Entry | upload, no approval | editorial invitation or contest win |
| Pay | ad revenue share after ~1,000 subs + ~40,000 monthly views | advance + per-episode fee |
| Editorial support | none | editor, art notes, schedule |
| Exclusivity | none — cross-post freely | exclusive worldwide digital rights for a term |
| AI policy | silent | per contract |
| Realistic timeline | immediate | 6–24 months of weekly Canvas uploads, if ever |

**Cross-post.** Canvas has no exclusivity: the same episode can live on WEBTOON, GlobalComix and your
own site. `assemble --width 940` gives you the Tapas-sized master from the same project (if and only
if the AI policy there allows it), and `--width 800` the WEBTOON one.

## The launch checklist

1. `manhwa.py check <ep> --final` → zero errors, warnings triaged.
2. Manual phone gate from `references/07-qc-gates.md`.
3. **3–4 finished episodes** in the buffer before episode 1 goes live.
4. Cover (1080×1080, <500KB) and episode thumbnail (202×142) ready.
5. Title, logline, tags, genre, schedule day fixed.
6. Disclosure line in the description and on your creator profile.
7. The next episode is already in progress. Weekly readers calibrate to your cadence — the gap is what
   kills a series, not a bad panel.
