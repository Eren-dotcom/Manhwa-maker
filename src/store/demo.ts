import type { Panel, Project, Bubble, Sfx } from './types';
import { uid } from './types';

// ---------------------------------------------------------------------------
// Demo project — a complete, hand-authored episode used as the studio's
// reference build. Every field here is what the studio would generate for you:
// beats, shots, prompts, lettering, QC-relevant metadata.
// ---------------------------------------------------------------------------

const bub = (
  kind: Bubble['kind'],
  speaker: string,
  text: string,
  x: number,
  y: number,
  tail: Bubble['tail'] = 'b',
  order = 0,
  size: Bubble['size'] = 'md',
): Bubble => ({ id: uid('bub'), kind, speaker, text, x, y, tail, order, size });

const sfx = (text: string, x: number, y: number, style: Sfx['style'], rotation = 0, scale = 1): Sfx => ({
  id: uid('sfx'),
  text,
  x,
  y,
  style,
  rotation,
  scale,
});

const p = (
  no: number,
  beatId: string,
  cfg: Partial<Panel> & Pick<Panel, 'shot' | 'angle' | 'composition' | 'height'>,
): Panel => ({
  id: `pnl_demo_${String(no).padStart(2, '0')}`,
  no,
  beatId,
  gutter: 130,
  fullBleed: false,
  setting: '',
  timeOfDay: 'night',
  characterIds: [],
  action: '',
  lighting: '',
  caption: '',
  bubbles: [],
  sfx: [],
  prompt: '',
  negative: '',
  seed: null,
  note: '',
  reviewed: false,
  ...cfg,
});

export const buildDemoProject = (): Project => {
  const beats = [
    {
      id: 'beat_1',
      unit: 1,
      fn: 'hook' as const,
      summary: 'A lantern drifts down the fogged river, alone. Caption states the rule of the world.',
      purpose: 'Give the reader one image + one rule in under eight seconds of scroll.',
      tension: 4 as const,
      scrollEnd: 'quiet' as const,
      panelTarget: 2,
    },
    {
      id: 'beat_2',
      unit: 2,
      fn: 'setup' as const,
      summary: 'The Lantern Bureau at night: ledgers, stamps, rows of waiting lanterns.',
      purpose: 'Establish institution, job and stakes before the protagonist speaks.',
      tension: 2 as const,
      scrollEnd: 'quiet' as const,
      panelTarget: 2,
    },
    {
      id: 'beat_3',
      unit: 3,
      fn: 'cast' as const,
      summary: 'Han Yuwol, disgraced ferryman, is handed his route by Inspector Baek Soryeong.',
      purpose: 'Introduce voice, conflict and the debt that defines him.',
      tension: 3 as const,
      scrollEnd: 'turn' as const,
      panelTarget: 3,
    },
    {
      id: 'beat_4',
      unit: 4,
      fn: 'reveal' as const,
      summary: 'Every lantern on the rack gutters out at once. Only his stays lit.',
      purpose: 'The inciting anomaly. End the scroll unit on a hard visual turn.',
      tension: 5 as const,
      scrollEnd: 'reveal' as const,
      panelTarget: 2,
    },
    {
      id: 'beat_5',
      unit: 5,
      fn: 'escalate' as const,
      summary: 'The dead arrive on the bank in silence — dozens of them, waiting to be escorted.',
      purpose: 'Scale and threat without exposition.',
      tension: 4 as const,
      scrollEnd: 'quiet' as const,
      panelTarget: 2,
    },
    {
      id: 'beat_6',
      unit: 6,
      fn: 'turn' as const,
      summary: 'A child among the dead holds a lantern that burns white and says his name.',
      purpose: 'Personal stake: the dead know him. Ends the unit on a question.',
      tension: 5 as const,
      scrollEnd: 'cliff' as const,
      panelTarget: 1,
    },
    {
      id: 'beat_7',
      unit: 7,
      fn: 'breather' as const,
      summary: 'Rain. Yuwol kneels, genuinely afraid for the first time in years.',
      purpose: 'Release the pressure so the final beat can hit.',
      tension: 2 as const,
      scrollEnd: 'quiet' as const,
      panelTarget: 1,
    },
    {
      id: 'beat_8',
      unit: 8,
      fn: 'stinger' as const,
      summary: 'A hand closes around his ankle from the river. The lantern goes under.',
      purpose: 'Cliffhanger on the last scroll of the episode — mandatory for weekly format.',
      tension: 5 as const,
      scrollEnd: 'cliff' as const,
      panelTarget: 1,
    },
  ];

  const panels: Panel[] = [
    p(1, 'beat_1', {
      shot: 'establishing',
      angle: 'low',
      composition: 'negative-space',
      height: 1.55,
      fullBleed: true,
      gutter: 0,
      setting: 'Cheonan, the lower river — fog over black water, stepped stone banks',
      timeOfDay: 'just after midnight',
      action:
        'Wide, low view down a fogged canal. A single paper lantern drifts mid-river, its light the only warm thing in the frame. City silhouettes dissolve into mist behind it.',
      lighting: 'single warm practical source, cold blue moonlight bounce, heavy atmospheric fog',
      caption: 'In Cheonan, the dead do not wander. They are escorted.',
      prompt:
        'wide low-angle establishing shot of a fogged canal at midnight, korean gothic city silhouettes dissolving into mist, one warm paper lantern drifting on black water, cold blue moonlight, ink wash fog, cinematic vertical composition, negative space upper half',
      note: 'Push the lantern to the lower third so the caption has clean air above it.',
      image: '/demo/p01.jpg',
      reviewed: true,
    }),
    p(2, 'beat_1', {
      shot: 'insert',
      angle: 'high',
      composition: 'center',
      height: 0.62,
      setting: 'the lantern, close',
      action:
        'Top-down insert: the lantern’s paper ribs, one brush-written name bleeding through the wet paper.',
      lighting: 'warm glow from inside the paper, reflected ripples',
      sfx: [sfx('fsss', 68, 30, 'ink', -8, 0.8)],
      prompt:
        'top-down insert of a wet paper lantern on black river water, visible bamboo ribs, a brush-written korean name bleeding through the paper, warm interior glow, ripples, high detail, vertical crop',
      note: 'Name must be legible: 유월 — his own name, planted early.',
      reviewed: true,
    }),
    p(3, 'beat_2', {
      shot: 'wide',
      angle: 'eye',
      composition: 'symmetry',
      height: 1.05,
      setting: 'The Lantern Bureau, intake hall — ledger desks, a rack of unlit lanterns',
      timeOfDay: 'night',
      characterIds: ['chr_yuwol'],
      action:
        'Symmetrical wide of the Bureau hall. Yuwol sits alone at a desk the size of a coffin, stamping a ledger. Rows of lanterns behind him, all unlit.',
      lighting: 'green-shaded desk lamp, cold hall beyond, long shadows',
      prompt:
        'symmetric wide shot interior of a korean fantasy bureaucratic hall at night, tall wooden ledger desks, a rack of hundreds of unlit paper lanterns, one man at a small desk with a green lamp, cold blue ambient light, graphic vertical webtoon composition',
      note: 'Institution should feel older than the city.',
      reviewed: true,
    }),
    p(4, 'beat_3', {
      shot: 'medium-close',
      angle: 'eye',
      composition: 'thirds',
      height: 0.9,
      setting: 'Bureau hall, Yuwol’s desk',
      characterIds: ['chr_yuwol'],
      action:
        'Yuwol, 34, tired, ink on his fingers, looks up from the ledger without lifting his head fully. Lantern light from below.',
      lighting: 'warm lantern uplight, cold rim from the hall',
      bubbles: [
        bub('speech', 'Baek Soryeong', 'Ferryman. You are late by four minutes.', 62, 20, 'br', 0, 'md'),
      ],
      prompt:
        'medium close-up of a 34-year-old korean man with tired eyes and ink-stained fingers looking up from a ledger, warm lantern uplight, cold blue rim light, dark uniform with a jade ferryman’s badge, clean cel shading, vertical webtoon panel',
      note: 'He does not stand. That is the character.',
      image: '/demo/p04.jpg',
      reviewed: true,
    }),
    p(5, 'beat_3', {
      shot: 'close-up',
      angle: 'low',
      composition: 'center',
      height: 0.8,
      setting: 'Bureau hall',
      characterIds: ['chr_soryeong'],
      action:
        'Inspector Baek Soryeong, tall and immaculate, looks down. Her eyes are the coldest thing in the building.',
      lighting: 'hard top light, lantern reflection in her eyes',
      bubbles: [bub('speech', 'Han Yuwol', 'The river keeps its own time.', 34, 16, 'bl', 0, 'sm')],
      prompt:
        'low-angle close-up of a tall severe korean woman inspector in a high-collared black bureau uniform, silver pin, cold hard top lighting, lantern reflection in her eyes, clean ink lineart, dark fantasy webtoon',
      note: 'Eye-line matches panel 4 — she is looking down at him.',
      reviewed: true,
    }),
    p(6, 'beat_3', {
      shot: 'over-shoulder',
      angle: 'high',
      composition: 'diagonal',
      height: 0.95,
      setting: 'Bureau hall',
      characterIds: ['chr_yuwol', 'chr_soryeong'],
      action:
        'Over Soryeong’s shoulder, high angle: Yuwol small at his desk, a route slip slid toward him across the wood.',
      lighting: 'desk lamp pool, hall falling into dark',
      bubbles: [
        bub('speech', 'Baek Soryeong', 'Forty-one souls. One lantern.', 70, 18, 'br', 0, 'md'),
        bub('speech', 'Han Yuwol', 'Forty-one.', 26, 74, 'tl', 1, 'sm'),
      ],
      prompt:
        'over-the-shoulder high-angle shot, a tall woman’s uniform shoulder in silhouette foreground, a small tired man at a desk beyond, a paper route slip on dark wood, single warm lamp pool, deep shadows, korean dark fantasy webtoon',
      note: 'Route slip is the visual prop that returns in episode 3.',
      reviewed: true,
    }),
    p(7, 'beat_4', {
      shot: 'wide',
      angle: 'eye',
      composition: 'leading-lines',
      height: 1.55,
      fullBleed: true,
      gutter: 200,
      setting: 'lantern rack, Bureau hall',
      action:
        'The rack of forty-one lanterns. Reading down the frame, each one gutters out in sequence — a wave of darkness travelling toward the last lit lantern on the right.',
      lighting: 'sequential warm pools dying to ember, cold blue after each',
      sfx: [sfx('phh', 40, 62, 'ink', -6, 1), sfx('phh', 62, 34, 'ink', 4, 0.9)],
      caption: 'Forty. Thirty-nine. Thirty-eight.',
      prompt:
        'wide shot of a long rack of paper lanterns in a dark hall, lit lanterns guttering out one by one down the frame, embers and smoke trails, one lantern still burning at the far right, dramatic falloff, korean dark fantasy webtoon, vertical',
      note: 'The counting caption is doing the pacing here — no dialogue.',
      image: '/demo/p07.jpg',
      reviewed: true,
    }),
    p(8, 'beat_4', {
      shot: 'close-up',
      angle: 'eye',
      composition: 'claustrophobic',
      height: 0.85,
      setting: 'his hands, desk',
      characterIds: ['chr_yuwol'],
      action:
        'Close on Yuwol’s hands: one holds the lantern, the other is shaking hard enough to rattle the ink pot.',
      lighting: 'single warm source, black falls off at the frame edge',
      sfx: [sfx('tok', 72, 74, 'hand', 8, 0.7)],
      bubbles: [bub('thought', 'Han Yuwol', 'They only go out when someone has already been taken.', 40, 24, 'none', 0, 'sm')],
      prompt:
        'extreme close-up of ink-stained hands gripping a burning paper lantern, one hand trembling, ink pot rattling on dark wood, warm light against deep black, high contrast korean webtoon panel',
      note: 'Tremble must read at thumbnail size — exaggerate.',
      reviewed: true,
    }),
    p(9, 'beat_5', {
      shot: 'silhouette',
      angle: 'worms',
      composition: 'diagonal',
      height: 1.25,
      setting: 'the stone bridge over the lower river',
      characterIds: ['chr_yuwol'],
      action:
        'Extreme low angle: Yuwol on the bridge with the lantern, a black silhouette against fog. Below him, the bank is filling with pale figures.',
      lighting: 'lantern key from below, fog backlight, no fill',
      prompt:
        'extreme low angle silhouette of a man holding a glowing lantern on an old stone bridge, dense fog, rows of pale figures gathering on the riverbank below, graphic black shapes, korean dark fantasy webtoon, vertical',
      note: 'Do not show faces yet. Faces are the unit-6 reveal.',
      image: '/demo/p09.jpg',
      reviewed: true,
    }),
    p(10, 'beat_5', {
      shot: 'wide',
      angle: 'high',
      composition: 'symmetry',
      height: 1.1,
      setting: 'riverbank, crowd of the dead',
      action:
        'High wide of the bank: forty pale figures in wet clothes, standing perfectly still, all facing the bridge. None of them cast a shadow.',
      lighting: 'flat cold moonlight, lantern light only on the nearest faces',
      bubbles: [bub('narration', '', 'Forty-one souls. Forty-one lanterns.', 18, 12, 'none', 0, 'sm')],
      prompt:
        'high angle wide shot of forty pale silent figures in wet clothes standing on a foggy riverbank at night, all facing the same direction, no shadows, cold moonlight, one warm lantern light in the foreground, eerie symmetry, korean webtoon',
      note: 'Symmetry + stillness = wrongness. Keep their posture identical.',
      reviewed: true,
    }),
    p(11, 'beat_6', {
      shot: 'medium',
      angle: 'eye',
      composition: 'center',
      height: 1.9,
      fullBleed: true,
      gutter: 220,
      setting: 'riverbank',
      characterIds: ['chr_child'],
      action:
        'Splash beat: a small girl among the dead steps forward, holding a lantern that burns white instead of amber. Her face is turned up toward him.',
      lighting: 'white lantern key, everything else falls to blue-black',
      bubbles: [bub('speech', 'The child', 'Han Yuwol. You promised you would come back for me.', 50, 78, 'b', 0, 'lg')],
      prompt:
        'emotional splash panel, a small ghost girl in a wet white hanbok standing on a foggy riverbank holding a lantern that burns pure white, upturned face, white key light against blue-black night, falling rain, korean dark fantasy webtoon, highly detailed vertical composition',
      note: 'The white lantern is the season’s visual motif — do not repeat it before ep. 4.',
      image: '/demo/p11.jpg',
      reviewed: true,
    }),
    p(12, 'beat_7', {
      shot: 'medium-close',
      angle: 'high',
      composition: 'negative-space',
      height: 0.95,
      setting: 'bridge, rain',
      characterIds: ['chr_yuwol'],
      action:
        'High angle down on Yuwol kneeling on the wet bridge, lantern held against his chest like something that might stop a wound.',
      lighting: 'lantern from below, rain streaks lit only where they cross the light',
      bubbles: [bub('thought', 'Han Yuwol', 'I have escorted four thousand souls. I have never once been recognised.', 66, 30, 'none', 0, 'sm')],
      prompt:
        'high angle medium close-up of a man kneeling on a wet stone bridge in heavy rain, clutching a paper lantern to his chest, rain visible only where it crosses the warm light, cold empty space around him, korean webtoon, vertical',
      note: 'Quiet panel. Give it air — no SFX, one short thought.',
      reviewed: true,
    }),
    p(13, 'beat_8', {
      shot: 'panel-less',
      angle: 'birds',
      composition: 'claustrophobic',
      height: 1.3,
      fullBleed: true,
      gutter: 240,
      setting: 'bridge edge, black water',
      action:
        'No frame. Bird’s-eye: a pale hand breaks the black water and closes around his ankle. The lantern is already tipping toward the surface.',
      lighting: 'lantern underlight on the water, everything else black',
      sfx: [sfx('GRAB', 62, 34, 'impact', -12, 1.25)],
      bubbles: [bub('narration', '', 'The river was not empty tonight.', 22, 74, 'none', 0, 'md', )],
      prompt:
        'bird’s-eye panel-less splash, a pale grey hand breaking black water and seizing a man’s ankle at a stone bridge edge, a paper lantern tipping toward the water, extreme high contrast, ink splatter, korean manhwa cliffhanger composition, vertical',
      note: 'End of episode. No resolution, no apology. Cut on the grab.',
      reviewed: true,
    }),
    p(14, 'beat_8', {
      shot: 'extreme-close',
      angle: 'low',
      composition: 'center',
      height: 0.7,
      setting: 'Yuwol’s face, last instant',
      characterIds: ['chr_yuwol'],
      action:
        'One last extreme close on his eye as the lantern goes under — the white lantern reflected in it.',
      lighting: 'light dying, one white reflection',
      bubbles: [bub('speech', 'Han Yuwol', '…Soryeong.', 50, 82, 'b', 0, 'sm')],
      prompt:
        'extreme close-up of a man’s eye at the instant a light goes out, a small white lantern reflected in the iris, rain on the lashes, near-black frame, korean webtoon, vertical',
      note: 'Next episode cold-open picks up 0.5 seconds later.',
      reviewed: false,
    }),
  ];

  const demo: Project = {
    id: 'prj_demo_lantern',
    version: 2,
    demo: true,
    meta: {
      title: 'The Lantern Bureau',
      altTitle: '등불청',
      genre: 'fantasy',
      subgenres: ['dark fantasy', 'supernatural mystery', 'bromide-free slow burn'],
      tone: 'Gothic, patient, merciless — dry humour only when the reader needs air',
      platform: 'webtoon',
      rating: 'Teen 13+ (blood, dread, no gore)',
      audience: '18–34, readers of Solo Leveling and Omniscient Reader who want a quieter myth',
      logline:
        'In a city where the dead must be escorted home by lantern light, a disgraced ferryman inherits the one lantern that cannot go out — and the dead start remembering his name.',
      hook: 'Every lantern in Cheonan has gone dark. Except the one in his hand.',
      theme: 'What we owe the dead — and what we are hiding from the living',
      comparisons: ['Omniscient Reader', 'Tower of God', 'Sweet Home'],
      createdAt: Date.now() - 1000 * 60 * 60 * 26,
      updatedAt: Date.now() - 1000 * 60 * 42,
    },
    style: {
      lookId: 'dark-fantasy',
      paletteId: 'jade-night',
      letteringStyle: 'manhwa',
      lineWeight: 'clean',
      shading: 'painterly',
      masterPrompt:
        'korean dark fantasy webtoon, intricate varied-weight ink lineart, painterly chiaroscuro shading, ember and moonlit rim lighting, gothic korean architecture, atmospheric depth haze, muted jewel palette of jade, ink-black and old gold, vertical 800x1280 panel, cinematic graphic composition',
      negativePrompt:
        'blurry lineart, extra fingers, extra limbs, watermark, signature, garbled text, latin lettering, photorealistic, 3d render, anime screencap, oversaturated pastel, chibi, cropped head, duplicate character, modern clothing',
      seed: 771027,
      width: 800,
    },
    world: {
      premise:
        'Cheonan is a city built on a river that does not always give its dead back. The Lantern Bureau — an institution older than the dynasty — assigns a ferryman to each district. The ferryman walks the dead home along the water using one lit lantern per soul. A lantern that goes out means a soul has been taken by something that is not the river.',
      rules: [
        'One lantern per soul. Light a second lantern for the same soul and both go out.',
        'The dead cannot cross running water on their own — they need a living guide and an open flame.',
        'A lantern only goes out for three reasons: a soul is taken, a promise is broken, or the ferryman lies.',
        'The dead remember what the living have agreed to forget. They cannot lie, but they can be lied to.',
        'A ferryman may never look back on the bridge. (Broken in ep. 1 — this is the season engine.)',
      ],
      locations: [
        'The lower river and its stepped stone banks',
        'Bureau intake hall — coffin-sized ledger desks, forty-one lantern hooks',
        'The old stone bridge (the only crossing where the dead can be counted)',
        'District 4 tenements, where Yuwol has a room he does not sleep in',
      ],
      glossary: [
        { term: '등불청 (Deungbulcheong)', meaning: 'Lantern Bureau — the office that assigns escorts to the dead.' },
        { term: 'Ferryman', meaning: 'A living guide licensed to walk souls home. Ranked by clean escorts, not by years.' },
        { term: 'Counting', meaning: 'The ritual of numbering souls aloud at the bridge. A miscount voids the escort.' },
        { term: 'White lantern', meaning: 'An unassigned flame. No soul owns it, which should be impossible.' },
      ],
      visualMotifs: [
        'Paper lanterns as the only warm light — every warmth in the comic is a person',
        'The counting caption, always in the upper third, never in a balloon',
        'Rain that is only visible where it crosses light',
        'Jade ferryman’s badge, chipped on the left corner',
      ],
    },
    cast: [
      {
        id: 'chr_yuwol',
        name: 'Han Yuwol',
        koreanName: '한유월',
        role: 'protagonist',
        age: '34',
        pronouns: 'he/him',
        want: 'To finish his forty-one clean escorts and get his rank restored.',
        need: 'To admit that the soul he lost seven years ago was his sister, and that he broke the rule on the bridge.',
        flaw: 'He treats care as procedure. He would rather be correct than present.',
        arc: 'From a man who escorts the dead so he does not have to look at the living, to a man who looks back.',
        silhouette:
          'Tall, narrow shoulders, long ink-stained coat cut like a uniform but worn open. Always carries one lantern low, at hip height.',
        outfit: 'Charcoal ferryman’s coat, jade badge (chipped left corner), white shirt gone grey, boots with river mud to the ankle',
        palette: 'charcoal, old gold, jade badge, warm amber lantern only',
        voice: 'Flat, economical, polite enough to be a weapon. Answers questions with corrections.',
        verbalTics: '“The river keeps its own time.” Counts things out loud when he is afraid.',
        faceAnchor:
          'Han Yuwol, 34-year-old korean man, tired narrow eyes with faint dark circles, straight black hair slightly too long at the nape, high cheekbones, thin mouth, tall lean build, ink-stained fingers',
        promptFragment:
          'Han Yuwol, 34-year-old korean man, tired narrow eyes with faint dark circles, straight black hair slightly too long at the nape, tall lean build, charcoal ferryman’s long coat worn open, chipped jade badge on the left lapel, ink-stained fingers, carries a warm paper lantern at hip height',
        refPrompt:
          'character reference sheet, front / three-quarter / profile, Han Yuwol, 34-year-old korean man, tired narrow eyes, straight black hair, tall lean, charcoal long coat worn open, chipped jade badge, ink-stained hands, warm paper lantern, neutral grey background, clean korean webtoon lineart, painterly shading',
      },
      {
        id: 'chr_soryeong',
        name: 'Baek Soryeong',
        koreanName: '백소령',
        role: 'deuteragonist',
        age: '31',
        pronouns: 'she/her',
        want: 'To close District 4 without a scandal and be promoted out of it.',
        need: 'To stop measuring people by their record and start measuring them by their choices.',
        flaw: 'She enforces rules she has already decided are wrong.',
        arc: 'From auditor to accomplice — the only promotion available to her.',
        silhouette:
          'Tall and immaculate, high collar, hands always gloved. Reads as a verdict before she speaks.',
        outfit: 'Black high-collared Bureau uniform, silver pin, white gloves, hair pinned severely',
        palette: 'black, silver, cold blue, one warm reflection when she is lying',
        voice: 'Clipped, exact, never raises her volume. Uses his full name when she is losing.',
        verbalTics: 'States the time. “Four minutes.” “Eleven seconds.”',
        faceAnchor:
          'Baek Soryeong, 31-year-old korean woman, sharp cold eyes, straight brows, narrow jaw, straight black hair pinned back severely, tall immaculate posture',
        promptFragment:
          'Baek Soryeong, 31-year-old korean woman, tall immaculate posture, severe black high-collared bureau uniform, silver pin, white gloves, black hair pinned back severely, sharp cold eyes, clean ink lineart, cold blue palette',
        refPrompt:
          'character reference sheet, front / three-quarter / profile, Baek Soryeong, 31-year-old korean woman, severe black high-collared uniform with silver pin, white gloves, hair pinned back, cold sharp eyes, neutral grey background, korean webtoon lineart, painterly shading',
      },
      {
        id: 'chr_child',
        name: 'The Child',
        koreanName: '아이',
        role: 'antagonist',
        age: 'appears 9',
        pronouns: 'she/her',
        want: 'To be walked home by the man who promised.',
        need: 'Unknown — she may not know what she is any more.',
        flaw: 'She tells the truth exactly, which is worse.',
        arc: 'Season engine: the reader should not be sure whether she is a victim or a trap.',
        silhouette: 'Small, still, wet white hanbok too long for her, holds a white lantern with both hands.',
        outfit: 'Wet white hanbok, bare feet, hair loose, no shadow',
        palette: 'white, wet grey, one impossible white light',
        voice: 'A child’s register used with adult patience. Never shouts.',
        verbalTics: 'Repeats his full name before every sentence.',
        faceAnchor:
          'a small ghost girl appearing 9 years old, round flat face, pale grey eyes, loose black hair past her shoulders, no shadow, unnaturally still posture',
        promptFragment:
          'a small ghost girl appearing 9 years old, wet white hanbok too long for her, loose black hair, bare feet, no shadow, holding a lantern that burns pure white, still posture, korean dark fantasy webtoon',
        refPrompt:
          'character reference sheet, front / three-quarter / profile, a small ghost girl appearing nine years old, wet white hanbok, loose black hair, bare feet, holding a white lantern, no shadow, neutral grey background, korean webtoon lineart',
      },
    ],
    versions: [
      {
        id: 'ver_yuwol_base',
        characterId: 'chr_yuwol',
        slug: 'base',
        name: 'Ferryman (base)',
        type: 'base',
        inheritsFrom: null,
        description: 'Canonical design: charcoal coat worn open, jade badge chipped on the left corner, lantern always at hip height.',
        identityMarkers: ['tired narrow eyes', 'black hair at the nape', 'chipped jade badge, left lapel', 'ink-stained fingers'],
        images: {
          portrait: '/demo/refs/yuwol-portrait.jpg',
          fullBody: '/demo/refs/yuwol-fullbody.jpg',
          turnaround: '/demo/refs/yuwol-turnaround.jpg',
        },
        approved: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 30,
      },
      {
        id: 'ver_yuwol_rain',
        characterId: 'chr_yuwol',
        slug: 'ep01-rain',
        name: 'Ep.1 rain-soaked',
        type: 'variant',
        inheritsFrom: 'ver_yuwol_base',
        description: 'Same man, second night of rain: coat soaked to black, white shirt translucent at the collar, river mud to mid-calf, hair flattened.',
        identityMarkers: ['tired narrow eyes', 'chipped jade badge, left lapel', 'ink-stained fingers'],
        images: {},
        approved: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 20,
      },
      {
        id: 'ver_soryeong_base',
        characterId: 'chr_soryeong',
        slug: 'base',
        name: 'Auditor (base)',
        type: 'base',
        inheritsFrom: null,
        description: 'Black high-collared uniform, silver pin, white gloves. Gloves never come off on-page.',
        identityMarkers: ['sharp cold eyes', 'hair pinned back severely', 'white gloves', 'silver pin, right collar'],
        images: {},
        approved: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 30,
      },
      {
        id: 'ver_child_base',
        characterId: 'chr_child',
        slug: 'base',
        name: 'The Child (base)',
        type: 'base',
        inheritsFrom: null,
        description: 'Wet white hanbok too long for her, bare feet, white lantern held in both hands, casts no shadow.',
        identityMarkers: ['loose black hair', 'bare feet', 'no shadow', 'white lantern, both hands'],
        images: {},
        approved: false,
        createdAt: Date.now() - 1000 * 60 * 60 * 30,
      },
    ],
    episodes: [
      {
        id: 'ep_demo_1',
        no: 1,
        title: 'The Last Lantern',
        logline:
          'Yuwol is assigned forty-one souls and one lantern. One by one the lanterns of Cheonan go out — and the dead start calling him by name.',
        hook: 'A lantern floats down the river with his sister’s name on it.',
        cliffhanger: 'A hand from the river takes his ankle as the last lantern goes under.',
        targetPanels: 45,
        beats,
        panels,
      },
    ],
    activeEpisodeId: 'ep_demo_1',
    ai: {
      provider: 'offline',
      model: 'gpt-4o-mini',
      baseUrl: '',
      apiKey: '',
      temperature: 0.8,
      imageProvider: 'placeholder',
      imageModel: 'gpt-image-1',
    },
    gates: {
      concept: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      bible: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      beats: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      panels: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      prompts: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      render: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      lettering: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
  };

  // Bind the rain-soaked variant to every wet bridge panel, so the demo shows
  // version binding rather than telling you about it.
  demo.episodes.forEach((ep) =>
    ep.panels.forEach((p) => {
      const wet = /rain|wet|soaked/i.test(`${p.setting} ${p.lighting} ${p.action} ${p.prompt ?? ''}`);
      if (wet && p.characterIds.includes('chr_yuwol')) {
        p.versions = { ...(p.versions ?? {}), chr_yuwol: 'ver_yuwol_rain' };
      }
    }),
  );

  return demo;
};
