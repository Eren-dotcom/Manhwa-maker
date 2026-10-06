# 05 — Research sources

What was looked up, what it contributed, and how much weight it carries. Anything marked
*verify* was reported by a single secondary source or varies between sources.

## Studio process and craft

| Source | Used for |
|---|---|
| r/MangakaStudio — "How are Manhwa made?" (artist answers, incl. *My S-Class Hunters* afterword summary) | the 5-stage episode loop: storyboard → lineart → flats → backgrounds/effects → lighting/refinement; use of CSP assets and 3D backgrounds (Acon3D, SketchUp) |
| CLIP STUDIO TIPS — "Full Guide on Making a Webtoon" (O_kids) | pre-production / production / publishing split; 3D model → lineart conversion; close-and-fill colouring |
| CLIP STUDIO TIPS — "Making a Webtoon from start to finish" (dddogdog5500) | canvas 800×30,000 @600dpi workflow; **place dialogue before drawing**; base-colour clipping; blend modes for shading |
| CLIP STUDIO TIPS — "Work Like a Real Webtoon Studio" (SIENNAMI) | studio role list (writers → storyboarders → character artists → background → render → editors → VFX); **per-character colour sets**; study-the-face-parts technique |
| CLIP STUDIO TIPS — "Starting Your Own WEBTOON" (BeeberryMuffin) | 800×1280 tile limit; draw at 2× (1600×2560) and downscale; export/slicing controls |
| WEBTOON Canvas TIPS — "Getting Started on WEBTOON CANVAS" | **minimum 200px between panels; 600–1000px for a location/scene transition**; 800×1280 per image; thumbnails 1080×1080 (<500KB) and 1080×1920 (<700KB) |
| aaagameartstudio — "Webtoon Art Style Secrets" | storyboard artist's role; **fix problems in storyboard, not finished art**; batch-by-stage production; outsourcing studio cadence (one episode per 3–5 days) |
| studio.lemoon.io — "5 essential steps to create a webtoon episode" | the 5-stage episode model; narration/panel pacing; colour-layer organisation |
| s-morishitastudio.com — process and format guides | solo creator workflow; traditional-format reformatting; tapas/webtoon size comparison |
| Clip Studio — "Creating a Hand-Crafted Style Webtoon" | 3D material → LT conversion → paint-over pipeline; SFX/balloon folder discipline |
| comicory.com — episode length, canvas size, "How to make a webtoon" guides | 40–80 panel range, ~60 average; 6,000–12,000px scroll; **30–40% reader drop-off point and the mid-episode hook**; climax at 2/3; 3–5 panel re-establishment; gutter-size semantics; draw at 1600–2000px |
| comicpad.app — 10-step beginner guide and webtoon-creator guide | **5-panel hook rule**; climax placement; read-time estimates (5–8 min); team-based studio numbers (6–12 people, 150–300 person-hours per episode) |
| buildtoon.com, taleatelier.com, gootaku.com, multic.com | format/size cross-checks; 800px as the universal safe width; 940px Tapas; safe margins (~80px/side); lettering size guidance |

## Industry, labour and money (Korea)

| Source | Used for |
|---|---|
| KILSH (Korean Institute of Labor Safety and Health) 2022 webtoon-writers survey, presented at a 2023 National Assembly forum — via kdeepcut.com and kilsh.or.kr | **average 68 cuts / median 70 per episode**; **63% publish weekly**; artists report 9.9 h/day, **11.8 h the day before deadline**; writers consider ~50–52 cuts appropriate; independent-contractor classification |
| Korea JoongAng Daily (2022) — "[WHY] The rise of webtoons means fat pay checks, but only for a few" | 60–70 frames per episode weekly; Naver creators averaging ~₩280M/yr (₩150M first year); the long tail |
| webtoonish.com — "The Korean Indie Webtoon Industry is Shifting" | top-tier schedule: **~1 month per episode, each department ~1 week, staggered so one ships weekly**; Canvas Creator Rewards phase-out (2023) |
| Creatrip — "All About Korean Webtoons" | 80 cuts/week as the perceived requirement; staff-based production; the editor shortage |
| pixivision — LOCKER ROOM studio interview | actual studio job titles: art director, line-art illustrator, **webtoon designer (storyboard)**, colourist, background |
| Kidscreen feature (2025) | webtoon market size (~$10.8B in 2025 → $31.2B by 2029 projected); real studio cadence of 3–4 weeks per episode |
| kpcomicsstudios.com (outsourcing studio) | service decomposition (script / storyboard / layout / line art / colour / typesetting) and 15–70+ episode contracts |

## AI tooling and consistency

| Source | Used for |
|---|---|
| r/comfyui threads on consistent characters (Jan 2025, Apr 2026) | the practical consensus: **custom LoRA is the only reliable character lock**; reference-only ControlNet for pose; fixed seed + prompt template; IP-Adapter weakness on anime style |
| r/generativeAI — "How are these AI manhwa story videos made?" (2026) | the "three-layer lock": character sheet → LoRA (or IP-Adapter FaceID) → generation; ComfyUI as the engine; workflow JSON + Python driver for scale |
| comfyui.org — anime character consistency workflow | SDXL + LoRA + PromptGenerator structure; fixed seed and CLIP skip advice; VRAM fallbacks |
| localaimaster.com — Illustrious vs NoobAI vs Animagine (Sept 2026) | model selection: Animagine XL 4.0 for commercial rights, Illustrious XL v1.0 for the LoRA ecosystem and native 1536², NoobAI XL 1.1 for booru coverage (non-commercial licence) |
| civitai.com — Illustrious ecosystem page | 199K+ LoRAs for Illustrious; tagging practice; negative-prompt conventions |
| r/StableDiffusion — consistent anime character cards (May 2026) | checkpoint + IP-Adapter + ControlNet (+ small face LoRA) as the standard local combo |
| aimagicx.com — AI comic generator guide (2026) | LoRA training recipe: 15–25 refs → curate 10–20 → train 15–60 min → use everywhere; tool comparison |
| github.com/ahmet360/manga-studio | prior art: parse script → ComfyUI per panel → PIL lettering → page assembly; **"diffusion never draws the text"**; bubbles placed over the least-detailed region; `smart_auto` placement; layered background + character cutouts |
| ComicCraft / Comic Studio AI (GitHub) | prior art for the multi-stage AI pipeline and bubble compositing; the shared lesson that lettering is composited, never generated |

## Platform policy and AI disclosure

| Source | Used for |
|---|---|
| comistitch.com — "Canvas vs Originals — Pay, Rights & AI Rules" (Sept 2026) | Canvas has **no AI clause** and no disclosure field; contests prohibit generative AI; revenue thresholds (~1,000 subs / 40,000 monthly views); payout minimum |
| comicpad.app — webtoon creator guide (Jul 2026) | Canvas: no global AI ban as of Jan 2026 policy update; **Korea's AI Basic Act effective 22 Jan 2026** requires disclosure for content distributed in Korea; machine-readable watermarks accepted; voluntary disclosure recommended |
| taleatelier.com — CANVAS specs and career guide (Sept 2026) | the sharpest summary: WEBTOON is *silent* but **Tapas prohibits AI-generated content outright**; **GlobalComix banned fully-AI art (March 2026)** while allowing AI in a human-led workflow; Canvas terms require you to warrant you hold all rights; US copyright does not protect wholly machine-generated images |
| multic.com, comicory.com format guides | the platform spec table (800/1280/2MB/100 images; Tapas 940/4000/5MB), RGB, 72dpi-irrelevant, safe margins |
| Font/lettering sources (multic.com bubble design guide, r/comic_crits, Harvard-hosted type notes) | 14–20px minimum on mobile, ~20–28px lowercase height at 800px width; 110–130% leading; bubble padding ≈ one letter width; all-caps convention; 3:2 bubble proportions |

## Confidence notes

- **High confidence** (multiple independent sources + platform docs): panel/gutter conventions,
  800px width, 1280px tiles, 2MB tile cap, the 5-stage art pipeline, LoRA-based consistency.
- **Medium** (consistent across secondary sources, no primary doc read): exact episode-length norms,
  the 30–40% drop-off figure, mid-episode-hook framing, panel-count industry averages.
- **Verify before you rely on it:** Naver KR app width (690 vs 720 vs 800), Tapas's exact limits,
  the current Canvas AI clause (policy in this area is changing month to month), and every contest's
  AI rules at time of entry.
