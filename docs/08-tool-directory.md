# 08 — The tool directory

You asked what tools can help you make a manhwa. This is the honest map: what exists, what each
thing is actually good at, what it costs, and — most importantly — **which stage of the pipeline it
belongs to**. Prices and policies were checked in September–October 2026; treat them as a snapshot,
not a contract.

Read this with one thing in mind: **no single tool does the job.** Every credible workflow is a
chain, and the chain has five links: *story → consistent cast → panel art → lettering/layout → QC and
delivery*. The toolkit in this repo (`skill/manhwa-studio/`) owns links 4 and 5 plus script refinement; a
generator owns link 3; you have to pick something for link 2 (consistency), because that is where
nearly every AI comic dies.

---

## The three stacks worth considering

### Stack A — Cloud only, no GPU (easiest, ~$10–25/month)

| Stage | Tool | Why |
|---|---|---|
| Script + bible | this repo's JSON + `manhwa.py refine` | free, and it is the part LLMs are genuinely good at |
| Reference sheets | Gemini / Nano Banana Pro (image editing, "face-lock") | the strongest *no-setup* character consistency in 2026 — it holds identity across edits better than a prompt ever will |
| Panel art | Nano Banana Pro, or Midjourney (`--sref`/`--cref`) for hero panels | Nano Banana for consistency, Midjourney for a single striking cover |
| Touch-ups | Photopea (free, browser) or Krita (free, desktop) | fix a hand, patch a background, remove a stray object |
| Lettering, layout, tiles, PDF, QC | **this repo** | deterministic, and the only part that never hallucinates |
| Fonts | Komika or VTC Letterer Pro (free, commercial use) | see the font table below |

Honest limit: you are renting consistency. The same prompt in a different session can come back with a
cousin of your character, so re-feed the approved sheet on every generation and re-run `match-check`.

### Stack B — Local, own GPU (free + electricity, most control)

| Stage | Tool | Why |
|---|---|---|
| Base model | Illustrious XL, NoobAI XL 1.1 (non-commercial licence), Animagine XL 4.0 (commercial-friendly) | the SDXL anime ecosystem is where LoRAs and ControlNets actually live |
| Generation | ComfyUI | node graph, reproducible, and this repo ships a template + `comfy_batch.py` |
| **Consistency** | character **LoRA** (10–25 curated refs, trained with kohya_ss) | still the only method that holds identity across hundreds of panels |
| Consistency, no training | IP-Adapter FaceID Plus V2 at weight **0.85**, or PuLID for a harder lock (more VRAM, stiffer expressions) | production default vs. maximum fidelity |
| Posing | ControlNet (openpose/depth), or a 3D mannequin (DAZ Studio, Poser, Sketchfab) | solves "she is always standing facing camera" |
| Backgrounds | SketchUp + **ACON3D** models, or Blender | this is what real Korean studios use — see notes below |
| Upscale | Real-ESRGAN / Upscayl (free, anime models) | generate at 1080 wide, upscale only if you go to print |
| Everything else | **this repo** | |

### Stack C — All-in-one AI webtoon platform (fastest, least ownership)

Dashtoon (~$12–20/mo), GenToon (free tier, $10–39/mo), TaleAtelier ($9.99/mo), LlamaGen, Comistitch,
Gootaku, AniComic, YarnSaga, AI Comic Factory (free, no signup, single pages). These give you
script-to-panel in one box, with panel editors, bubble tools and a character-lock system.

Use one **if you want to publish something this weekend and you do not care whose art style it is**.
Go in with your eyes open:

- the style is theirs, and so is the ceiling — your series will look like everyone else's on the same platform;
- you cannot fix a panel that is *nearly* right; you get what the box gives;
- you cannot move your project out, so a price change or a shutdown ends your series;
- serialisation quality (110+ panels, consistent across episodes) is exactly where they are weakest.

The platforms are genuinely good for a **first chapter to test whether you enjoy this**. They are a bad
place to build chapter 40. My recommendation: prototype in Stack C if you want, then move the series
to Stack A or B where you own the files.

---

## Directory by pipeline stage

### 1. Story, script, series bible
| Tool | What it's for | Cost |
|---|---|---|
| **this repo** (`manhwa.py refine`) | slop linter, 20-word balloon limits, density vs tier, the four mandatory chapter beats, panel-count verification | free |
| Notion / Airtable | series bible, episode tracker, buffer count | free tiers |
| Storyflow | arc, page grid and buffer in one view — a "how much runway do I have" tool | $7.99/mo |
| Any LLM | outlining, dialogue passes — but run the output through `refine`, not straight into art | — |

### 2. Character consistency — the make-or-break stage
| Method | Strength | Where it runs |
|---|---|---|
| **Character LoRA** (10–25 refs, kohya_ss, 15–60 min on a GPU) | strongest, reusable, consistent across poses and scenes | local (ComfyUI) or a LoRA-training service |
| **Nano Banana / Gemini image edit** | best no-setup option; latent identity lock survives edits | cloud |
| **IP-Adapter FaceID Plus V2, weight 0.85** | fast, flexible, stacks with style references | local |
| **PuLID** | hardest face lock; stiffer expressions, more VRAM | local |
| **InstantID** | between the two | local |
| Qwen-based "Consistent Character Creator" workflows (RunComfy etc.) | turnarounds + expression libraries from one reference | local |
| Midjourney `--cref` / DALL·E | convenient, weakest at maintaining identity over a long run | cloud |
| 3D mannequin renders (DAZ Studio, Poser, Sketchfab) as ControlNet input | fixes posing and body proportions | local |
| Face-swap pass at the end | rescues a good panel with a slightly wrong face | local |

**What I would do:** train one LoRA for your lead, and use FaceID at 0.85 for supporting cast you don't
want to train. Then run this repo's `match-check` sheet on every panel — it puts the reference sheet
beside each panel so drift is visible in one glance. That sheet is the cheapest quality control in the
whole workflow.

### 3. Panel art generation
| Tool | Best at | Notes |
|---|---|---|
| ComfyUI + SDXL-class models | volume, control, reproducibility | steep learning curve, unlimited free output |
| Illustrious XL / NoobAI XL 1.1 / Animagine XL 4.0 | anime-manhwa linework | NoobAI is non-commercial; Animagine is commercial-friendly — read the licences |
| Nano Banana Pro (Gemini) | consistency and editing | best per-image quality *and* identity for a no-GPU workflow |
| Midjourney | covers, hero panels, textures | weaker at holding a character across 60 panels |
| Leonardo / OpenArt | quick concept exploration | not a serialisation engine |
| Flux.2 / Qwen-Image-Edit | targeted edits of an existing panel | "change her jacket, keep everything else" |

### 4. Backgrounds and sets — the studio secret
Real manhwa studios do **not** hand-draw every background. They build or buy 3D sets and trace/render them.

| Tool | What it's for |
|---|---|
| **SketchUp + ACON3D** | the actual working standard: ACON3D sells webtoon-specific 3D models, and SketchUp `.skp` imports into Clip Studio. ABLER 3D is their viewer/editor |
| Blender | free, powerful, steeper; great for city and interior renders |
| Clip Studio 3D assets + perspective rulers | small props, phones, rooms where importing a set is slower than placing an asset |
| ibisPaint / Photoshop "photo → anime" filters | converting your own photos into background plates |
| Sketchfab / TurboSquid / Blend Swap | model libraries for reference and posing |

Pair this with this repo's `scenes` palette system so every location keeps its own colour identity.

### 5. Finishing, lettering, layout
| Tool | Lettering quality | Notes |
|---|---|---|
| **this repo** | full 16-style balloon vocabulary, three voices, gutter balloons, prop text, technique captions, colour-coded SFX, deterministic and repeatable | free; anything you change re-renders identically |
| Clip Studio Paint | the industry standard hand-lettering: balloons, tails, effect lines, WEBTOON preset, Export Webtoon | perpetual licence, often under $100 (~$4.49/mo subscription) |
| Krita | capable, free, weak lettering | best free drawing app |
| MediBang Paint / ibisPaint / FireAlpaca | free, panel tools, mobile-friendly | good zero-budget options |
| Photopea | free Photoshop in a browser | retouching, no install |
| BubbleText / YarnSaga / Jenova | AI-assisted balloon placement, speaker mapping, preflight checks | useful for a hand-drawn workflow; keep an eye on their export quality |
| Canva / Adobe Express | templates for **social posts** | not a serialisation tool; character consistency is poor and there is no scroll pacing |

### 6. Upscaling (only if you go to print)
Upscayl or Real-ESRGAN locally (free, anime-tuned models), Topaz Gigapixel (~$99, professional),
Magnific (~$39/mo, generative — can *invent* detail, be careful with line art), Photoshop Generative
Upscale (inside a CC subscription). Generate at 1080 master width first; upscale afterwards, never
instead.

### 7. Fonts — get one good one
| Font | Licence | Use |
|---|---|---|
| **Komika** (family) | free, personal **and commercial** | the safest all-round dialogue face; has lowercase |
| **VTC Letterer Pro** | free, commercial | bold all-caps dialogue |
| **Bangers** / Comic Neue | OFL (Google Fonts) | SFX/titles, and clean dialogue respectively |
| Anime Ace (Blambot) | free for indie/small press | the classic webtoon lettering face |
| Badaboom BB (Blambot) | free non-commercial | impact SFX |
| CC Wild Words (Comicraft) | ~$69 desktop licence | professional dialogue |

Two or three faces per series is the ceiling. Drop them in `assets/fonts/` and point
`series.json → lettering.fonts` at them.

### 8. Publishing, and the AI-policy trap
| Platform | Audience | AI policy as of late 2026 |
|---|---|---|
| **WEBTOON Canvas** | largest (tens of millions MAU) | Sources conflict: some report a mandatory "AI-assisted" tag since Feb 2026, others that Canvas terms and the uploader contain **no AI clause at all** as of Sept 2026. **Disclose anyway** — in the episode description. WEBTOON *contests* disqualify generative-AI entries outright |
| Tapas | mid | Sources conflict: one reports an outright prohibition on AI-generated content, another "allowed with a tag". Verify in their current terms before committing a schedule |
| GlobalComix | smaller | AI must be disclosed; **fully-AI visuals are not allowed** and AI work is not monetisable — but AI used as one tool in a human-led workflow is permitted |
| Tappytoon | mid | requires a human author; AI-assisted with a human writer only |
| MangaPlus | Shueisha official | no user uploads at all |
| Lezhin, KDP, Gumroad, Substack | varies | AI generally permitted with a tag or as direct sales |

Two more facts that matter more than any tool choice:

- **Korea's AI Basic Act** (effective 22 Jan 2026) requires disclosure for AI-generated content
  distributed commercially there.
- **US copyright does not protect wholly machine-generated images.** What *is* protectable: your
  script, direction, character design, lettering and edit. Keep your project files — they are the
  evidence of authorship.

Voluntary disclosure costs you almost nothing and protects you from the version of this where a
platform changes its mind after you have 40 chapters up.

---

## What I would actually do, in order

1. Write the chapter and run `manhwa.py refine` on it before spending a cent on art.
2. Build the bible and generate reference sheets; **get the sheets right** — everything downstream
   inherits them. Do not skip approval.
3. Pick your consistency method by budget: LoRA if you have a GPU, Nano Banana if you don't.
4. Generate, then `assemble` → `sheets` → `check --final` for every chapter. Read the contact sheet
   and the lettering sheet yourself; the numbers will not catch a face that drifted.
5. Use SketchUp/ACON3D or photo plates for backgrounds — it is the single biggest time saving in the
   whole craft, and it is what the studios do.
6. Publish to Canvas first, disclose, and keep two chapters in the buffer.

## What I would avoid

- **Generating lettering inside the art.** It is the one thing AI still cannot do, and it is the
  fastest way to look amateur. Text belongs in code.
- **Canva as a production tool.** Fine for a chapter-1 announcement post.
- **Trusting one platform's character lock for a 40-chapter series** without ever running a
  match-check. The drift is gradual and you will not notice until the reveal.
- **Claiming hand-drawn.** Besides being dishonest, it is the thing that ends careers when it surfaces.
- **Pasting an entire script into one prompt and accepting the first output.** Every tool here
  produces its best result when it is asked for one panel, one beat, one shot.

---

## Sources for this directory

- [7 Best AI Webtoon Creation Tools in 2026](https://anicomic.ai/blog/best-ai-webtoon-creation-tools) · [Best AI Tools for Webtoon Creators 2026](https://gootaku.com/blog/best-ai-tools-webtoon-creators-2026) · [AI Webtoon Generator](https://taleatelier.com/ai-webtoon-maker) · [AI Manhwa Generator](https://www.gentoon.ai/en/ai-manhwa) · [Best AI Manga Generators 2026](https://comistitch.com/blog/best-ai-manga-generators-2026/) · [Best AI Manga Generators](https://llamagen.ai/articles/best-ai-manga-generators-2026)
- [Comic bubble generator](https://www.jenova.ai/en/resources/comic-bubble-generator) · [Comic speech bubble generator](https://yarnsaga.com/tools/comic-speech-bubble-generator) · [BubbleText](https://bubbletext.app/)
- [ComfyUI: making comics](https://www.reddit.com/r/comfyui/comments/1pwfe4x/does_anyone_here_try_to_make_comics_using_these/) · [Best stack for consistent AI comics](https://www.reddit.com/r/comfyui/comments/1sdzb7x/best_workflowstack_for_consistent_animestyle_ai/) · [IPAdapter FaceID / PuLID / InstantID compared](https://lewdly.ai/blog/ipadapter-faceid-consistent-nsfw-characters) · [IP-Adapter tutorial 2026](https://aiofm.info/en/guides/ip-adapter-tutorial) · [Consistent Character Creator 3.0](https://www.runcomfy.com/comfyui-workflows/consistent-character-creator-3-0) · [Nano Banana consistency](https://www.nenobanana.com/blogs/how-nano-banana-maintains-character-consistency-across-edits)
- [11 best tools for webcomic creators](https://storyflow.so/blog/best-tools-webcomic-creators-2026) · [How to make a webtoon: 10 steps](https://www.comicpad.app/how-to-make-a-webtoon) · [Webtoon creator guide](https://taleatelier.com/webtoon-creator)
- [Webtoon backgrounds: what artists use](https://www.s-morishitastudio.com/what-do-webtoon-artists-use-for-backgrounds/) · [Clip Studio ASK: background programs](https://ask.clip-studio.com/en-us/detail?id=99317)
- [What font do comics use](https://www.designyourway.net/blog/what-font-do-comics-use/) · [royalty-free comic fonts](https://www.reddit.com/r/webtoons/comments/ojqhpw/need_royalty_free_comic_font/) · [Tapas forum: fonts](https://forums.tapas.io/t/what-font-do-you-use-for-your-comic-and-why/69189/10)
- [Top 5 AI upscalers](https://letsenhance.io/blog/all/best-upscalers-ai-art/) · [manhwa-hdfyer (Real-ESRGAN for webtoon)](https://github.com/Sidrawat11/manhwa-hdfyer)
- [GlobalComix vs WEBTOON 2026](https://comistitch.com/blog/globalcomix-vs-webtoon/) · [Canvas publishing guide](https://gootaku.com/blog/how-to-publish-on-webtoon-canvas) · [Where to publish an AI comic 2026](https://comistitch.com/blog/where-to-publish-ai-comic-2026-platform-decision-tree/)

**Confidence note:** the AI-policy rows are the least reliable thing in this document — the sources
genuinely contradict each other, and platforms change terms without announcements. Check the live
terms in the uploader before you build a release schedule on any of it.
