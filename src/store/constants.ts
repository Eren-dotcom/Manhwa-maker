import type { CameraAngle, Composition, Genre, Platform, ShotType } from './types';

// ---------------------------------------------------------------------------
// Style looks. Each look is a *style lock*: a fixed recipe of prompt language,
// palette and rendering rules that keeps 200 panels looking like one artist.
// ---------------------------------------------------------------------------

export interface Look {
  id: string;
  name: string;
  tagline: string;
  line: string;
  shading: string;
  promptFragment: string;
  palette: string[];
  /** storyboard gradient used before a real render lands. */
  gradient: string;
  ink: string;
  paper: string;
  best: Genre[];
}

export const LOOKS: Look[] = [
  {
    id: 'clean-cel',
    name: 'Clean Cel Webtoon',
    tagline: 'Flat cel shading, crisp inked line, saturated key light',
    line: 'crisp uniform ink line, 2px, closed contours',
    shading: 'flat cel shading with one shadow tone and one rim light',
    promptFragment:
      'korean webtoon style, clean crisp inked lineart with uniform line weight, flat cel shading, two-tone shadows, bright saturated key lighting, sharp graphic silhouettes, no rendering noise, panel-art finish',
    palette: ['#f4efe6', '#1b1d24', '#ff5a3c', '#f7b267', '#4d7ea8'],
    gradient: 'linear-gradient(160deg,#22303f 0%,#3d5068 45%,#8fb3c9 100%)',
    ink: '#14161c',
    paper: '#f4efe6',
    best: ['action', 'school', 'comedy'],
  },
  {
    id: 'painterly-romance',
    name: 'Painterly Romance',
    tagline: 'Soft gradients, airbrushed skin, bloom light, delicate line',
    line: 'fine tapered line, hairline at extremities',
    shading: 'soft airbrushed gradients with bloom and pastel bounce light',
    promptFragment:
      'korean romance webtoon style, delicate tapered lineart, soft painterly airbrushed shading, pastel gradient bloom lighting, luminous skin, glossy eyes with catchlights, dreamy shallow depth of field, elegant composition',
    palette: ['#fdf2f0', '#3a2c3f', '#e58fa6', '#f6c9b4', '#9d7bb8'],
    gradient: 'linear-gradient(170deg,#f6dbe2 0%,#e7bfd0 40%,#9d7bb8 100%)',
    ink: '#3a2c3f',
    paper: '#fdf2f0',
    best: ['romance', 'drama', 'school'],
  },
  {
    id: 'ink-noir',
    name: 'Ink Noir',
    tagline: 'Hatched shadows, limited palette, brutal negative space',
    line: 'brushy ink line with dry-brush tails',
    shading: 'heavy hatching and solid black spotting, single accent colour',
    promptFragment:
      'korean noir webtoon style, brushy ink lineart, heavy cross-hatching, high-contrast chiaroscuro, solid black spotting, muted desaturated palette with a single vermilion accent, rain and smoke in the air, graphic shadow shapes',
    palette: ['#0b0c10', '#1c1f26', '#5c6470', '#e8e3d9', '#c0392b'],
    gradient: 'linear-gradient(155deg,#0b0c10 0%,#23272f 55%,#4b525c 100%)',
    ink: '#08090b',
    paper: '#e8e3d9',
    best: ['thriller', 'mystery', 'horror'],
  },
  {
    id: 'dark-fantasy',
    name: 'Dark Fantasy',
    tagline: 'Runic detail, ember light, monumental scale',
    line: 'varied-weight ink with sharp serif accents',
    shading: 'painterly chiaroscuro with ember rim light and atmospheric haze',
    promptFragment:
      'korean dark fantasy webtoon style, intricate varied-weight ink lineart, painterly chiaroscuro shading, ember and moonlit rim lighting, gothic ornamental detail, atmospheric depth haze, monumental scale, muted jewel palette',
    palette: ['#10161a', '#1d2a2f', '#7a5c3e', '#c9a227', '#6f8f7c'],
    gradient: 'linear-gradient(165deg,#0d1416 0%,#1f3034 50%,#7a5c3e 100%)',
    ink: '#0a0f11',
    paper: '#e6ddc9',
    best: ['fantasy', 'isekai', 'historical', 'horror'],
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    tagline: 'Chrome, magenta edge light, hard digital bloom',
    line: 'clean technical line with glowing accents',
    shading: 'hard digital bloom, chrome specular, two-light setup',
    promptFragment:
      'korean cyberpunk webtoon style, clean technical lineart, chrome and glass materials, hard magenta and cyan edge lighting, digital bloom, reflective wet surfaces, dense urban detail, high-key neon palette',
    palette: ['#080b16', '#111a2e', '#ff2d7a', '#2de1ff', '#a48bff'],
    gradient: 'linear-gradient(150deg,#080b16 0%,#141f3a 40%,#3a1f52 75%,#ff2d7a 130%)',
    ink: '#05070f',
    paper: '#eaf2ff',
    best: ['action', 'thriller', 'isekai'],
  },
  {
    id: 'pastel-slice',
    name: 'Pastel Slice',
    tagline: 'Warm paper, soft wobbly line, gentle colour',
    line: 'soft slightly wobbly line, rounded corners',
    shading: 'flat pastel fills with watercolour grain and paper texture',
    promptFragment:
      'korean slice-of-life webtoon style, soft slightly wobbly lineart, flat pastel colour fills, watercolour grain texture, warm paper tone, gentle ambient lighting, cosy rounded shapes, minimal detail',
    palette: ['#fbf3e4', '#2f2a26', '#f2a65a', '#8fbf9f', '#d97a7a'],
    gradient: 'linear-gradient(160deg,#fbf3e4 0%,#f7ddc3 45%,#8fbf9f 100%)',
    ink: '#2f2a26',
    paper: '#fbf3e4',
    best: ['drama', 'comedy', 'school', 'romance'],
  },
  {
    id: 'manhwa-action',
    name: 'Manhwa Action',
    tagline: 'Impact frames, speed lines, bone-crunch ink',
    line: 'bold aggressive ink with tapered speed strokes',
    shading: 'high-contrast cel with radial impact flash and heavy spotting',
    promptFragment:
      'korean action manhwa style, bold aggressive ink lineart, dynamic perspective foreshortening, radial speed lines, impact flash whites, heavy black spotting, muscular anatomy, motion blur on extremities, motion in every silhouette',
    palette: ['#0e0e12', '#242833', '#e63946', '#f1c40f', '#f2f2f2'],
    gradient: 'linear-gradient(140deg,#0e0e12 0%,#2b3040 45%,#e63946 120%)',
    ink: '#0b0b0f',
    paper: '#f2f2f2',
    best: ['action', 'sports', 'thriller'],
  },
];

export const PALETTES = [
  { id: 'ink-vermilion', name: 'Ink + Vermilion', colors: ['#0b0c10', '#e8e3d9', '#ff5a3c', '#7f8794', '#f7b267'] },
  { id: 'seoul-dusk', name: 'Seoul Dusk', colors: ['#1b1d24', '#f4efe6', '#e58fa6', '#6f7bb8', '#ffd166'] },
  { id: 'jade-night', name: 'Jade Night', colors: ['#0f1a1c', '#e6ddc9', '#6f8f7c', '#c9a227', '#3a5a63'] },
  { id: 'hanji-warm', name: 'Hanji Warm', colors: ['#fbf3e4', '#2f2a26', '#f2a65a', '#d97a7a', '#8fbf9f'] },
  { id: 'neon-magenta', name: 'Neon Magenta', colors: ['#080b16', '#eaf2ff', '#ff2d7a', '#2de1ff', '#a48bff'] },
  { id: 'blood-ochre', name: 'Blood & Ochre', colors: ['#14100e', '#efe4d0', '#9e2b25', '#c98f4a', '#5a5148'] },
];

export const SHOTS: { id: ShotType; label: string; use: string; height: number }[] = [
  { id: 'establishing', label: 'Establishing', use: 'Place, scale, time. Opens a sequence or a location change.', height: 1.35 },
  { id: 'wide', label: 'Wide', use: 'Full bodies in space. Blocking and geography.', height: 1.1 },
  { id: 'full', label: 'Full', use: 'One body, full height. Action readability.', height: 1.15 },
  { id: 'medium', label: 'Medium', use: 'Waist up. Default conversation and business.', height: 0.95 },
  { id: 'medium-close', label: 'Medium close', use: 'Chest up. Emotional exchange, hands visible.', height: 0.85 },
  { id: 'close-up', label: 'Close-up', use: 'Face. Reaction beats, the moment a line lands.', height: 0.75 },
  { id: 'extreme-close', label: 'Extreme close', use: 'Eyes, lips, a trembling hand. Use once per episode.', height: 0.6 },
  { id: 'insert', label: 'Insert', use: 'Object detail that carries information or foreshadowing.', height: 0.55 },
  { id: 'over-shoulder', label: 'Over-shoulder', use: 'Power imbalance between two characters.', height: 0.9 },
  { id: 'silhouette', label: 'Silhouette', use: 'Conceal identity, promise threat, look iconic.', height: 1.0 },
  { id: 'panel-less', label: 'Panel-less', use: 'Bleed art with no frame — a breath or a shock.', height: 1.6 },
];

export const ANGLES: { id: CameraAngle; label: string; effect: string }[] = [
  { id: 'eye', label: 'Eye level', effect: 'Neutral, equal footing.' },
  { id: 'low', label: 'Low angle', effect: 'Power, threat, heroism.' },
  { id: 'high', label: 'High angle', effect: 'Vulnerability, judgement.' },
  { id: 'birds', label: 'Bird’s eye', effect: 'Isolation, strategy, scale.' },
  { id: 'worms', label: 'Worm’s eye', effect: 'Monumental scale, awe.' },
  { id: 'dutch', label: 'Dutch tilt', effect: 'Instability, wrongness.' },
  { id: 'top-down', label: 'Straight down', effect: 'Tableau, evidence, ritual.' },
];

export const COMPOSITIONS: { id: Composition; label: string; note: string }[] = [
  { id: 'center', label: 'Centre', note: 'Confrontation and icon frames.' },
  { id: 'thirds', label: 'Rule of thirds', note: 'Safe default for conversation.' },
  { id: 'diagonal', label: 'Diagonal', note: 'Motion and urgency in a still frame.' },
  { id: 'symmetry', label: 'Symmetry', note: 'Order, ritual, authority, dread.' },
  { id: 'negative-space', label: 'Negative space', note: 'Loneliness; scroll breathing room.' },
  { id: 'frame-within', label: 'Frame within frame', note: 'Surveillance, entrapment.' },
  { id: 'claustrophobic', label: 'Claustrophobic', note: 'Pressure; crop bodies at edges.' },
  { id: 'leading-lines', label: 'Leading lines', note: 'Point the eye down the scroll.' },
];

/** Release cadence + canvas rules per platform — this is what writers actually get paid against. */
export const PLATFORMS: { id: Platform; name: string; canvas: string; cadence: string; panels: string }[] = [
  { id: 'naver', name: 'Naver Series', canvas: '690 × variable, 72 dpi', cadence: 'weekly', panels: '45–70 per episode' },
  { id: 'kakao', name: 'KakaoPage', canvas: '690 × variable, 72 dpi', cadence: 'weekly', panels: '40–60 per episode' },
  { id: 'webtoon', name: 'WEBTOON (Global)', canvas: '800 × variable, 72 dpi', cadence: 'weekly', panels: '30–50 per episode' },
  { id: 'tapas', name: 'Tapas', canvas: '940 × variable', cadence: 'weekly / 2×', panels: '25–45 per episode' },
  { id: 'lezhin', name: 'Lezhin', canvas: '690 × variable', cadence: 'weekly', panels: '40–60 per episode' },
  { id: 'own-site', name: 'Your own site', canvas: '1080 × variable', cadence: 'you decide', panels: 'flexible' },
];

export const GENRE_PRESETS: {
  genre: Genre;
  label: string;
  provisionalTitle: string;
  logline: string;
  hook: string;
  tone: string;
  theme: string;
  motifs: string[];
  cast: string[];
  compare: string[];
}[] = [
  {
    genre: 'action',
    label: 'Action / Hunter',
    provisionalTitle: 'The Last Awakened Clerk',
    logline:
      'A rank-F office clerk is the only person who can see the monsters’ reset timer — and it is counting down inside his own building.',
    hook: 'He can read the countdown above every human head. His own says three days.',
    tone: 'Kinetic, dry-funny, brutal when it matters',
    theme: 'Competence is a moral choice, not a stat',
    motifs: ['stairwells', 'broken fluorescent light', 'countdown numbers', 'blood on a lanyard'],
    cast: ['deadpan rank-F clerk', 'rival ace hunter with a fake smile', 'monster that learns'],
    compare: ['Solo Leveling', 'Omniscient Reader'],
  },
  {
    genre: 'romance',
    label: 'Romance / Office',
    provisionalTitle: 'Overtime, Off the Record',
    logline:
      'Two rival producers are forced to fake a relationship for a hit show — while the real one grows in the edit bay.',
    hook: 'She has three months to make him fall in love on camera. He has already started.',
    tone: 'Warm, sharp-tongued, quietly aching',
    theme: 'Being wanted for the person you actually are',
    motifs: ['rain on glass', 'monitor glow', 'two coffee cups', 'unread messages'],
    cast: ['over-prepared producer', 'cold editor with soft edges', 'chaotic best friend / writer'],
    compare: ['Business Proposal', 'Yumi’s Cells'],
  },
  {
    genre: 'fantasy',
    label: 'Dark Fantasy',
    provisionalTitle: 'The Lantern Bureau',
    logline:
      'In a city where the dead must be escorted home by lantern light, a disgraced ferryman inherits the one lantern that cannot go out.',
    hook: 'Every lantern in the city has gone dark. Except hers.',
    tone: 'Gothic, patient, merciless',
    theme: 'What we owe the dead — and the living',
    motifs: ['paper lanterns', 'river fog', 'sealed ledgers', 'broken jade'],
    cast: ['disgraced ferryman', 'bureau inspector who hates him', 'ghost child who remembers'],
    compare: ['Tower of God', 'Omniscient Reader'],
  },
  {
    genre: 'thriller',
    label: 'Thriller / Noir',
    provisionalTitle: 'The Midnight Ledger',
    logline:
      'A night-shift accountant discovers her company has been billing the dead — and someone is paying in her name.',
    hook: 'The ledger has her signature on a payment dated tomorrow.',
    tone: 'Cold, precise, quietly paranoid',
    theme: 'Invisible systems and the people erased by them',
    motifs: ['rain-slick alley', 'fluorescent office', 'cash in a freezer', 'redacted documents'],
    cast: ['meticulous accountant', 'corrupt middle manager', 'fixer with a conscience'],
    compare: ['Strangers from Hell', 'Bastard'],
  },
  {
    genre: 'school',
    label: 'School / Comedy',
    provisionalTitle: 'Class 2-B Has a Demon',
    logline:
      'A transfer student realises her new classmates are all in a blood pact — and the seating chart is the contract.',
    hook: 'The empty seat at the back has her name on it. She has never been to this school.',
    tone: 'Witty, escalating, suddenly sincere',
    theme: 'Belonging costs something',
    motifs: ['chalk dust', 'seating chart', 'vending machine glow', 'school bell'],
    cast: ['new transfer girl with a plan', 'class president who knows', 'the demon in seat 13'],
    compare: ['The God of High School', 'Study Group'],
  },
  {
    genre: 'sports',
    label: 'Sports',
    provisionalTitle: 'Four Seconds Left',
    logline:
      'A washed-up point guard gets four seconds of perfect foresight — enough to win one game, never enough to save himself.',
    hook: 'He sees the play before it happens. He has already lost it twice.',
    tone: 'Pulse-pounding, disciplined, tender',
    theme: 'Talent vs. the work nobody sees',
    motifs: ['squeaking shoes', 'sweat on the boards', 'scoreboard red', 'empty gym'],
    cast: ['veteran bench guard', 'prodigy who cannot pass', 'coach with one good eye'],
    compare: ['Wind Breaker', 'The Boxer'],
  },
  {
    genre: 'isekai',
    label: 'Isekai / System',
    provisionalTitle: 'Reincarnated as the Tutorial NPC',
    logline:
      'A player is reborn as the tutorial NPC who dies in chapter one — and he has opinions about the script.',
    hook: 'He knows every death in the game. He is scheduled for the first one.',
    tone: 'Playful, meta, with a hidden knife',
    theme: 'Agency inside someone else’s story',
    motifs: ['HUD windows', 'starting village', 'loading screen', 'NPC name tags'],
    cast: ['doomed tutorial NPC', 'hero who skips dialogue', 'gm with a grudge'],
    compare: ['The Lone Necromancer', 'Solo Leveling'],
  },
  {
    genre: 'horror',
    label: 'Horror',
    provisionalTitle: 'The Tenant Below',
    logline:
      'A woman starts receiving noise complaints from the flat beneath hers — a flat that has been sealed for fourteen years.',
    hook: 'The knocking is in the pattern of her morning alarm.',
    tone: 'Slow dread, domestic, escalating',
    theme: 'Homes as places we cannot leave',
    motifs: ['hairline cracks', 'door chain', 'steam', 'teeth marks in wood'],
    cast: ['exhausted tenant', 'landlord who never looks up', 'neighbour who is not one'],
    compare: ['Sweet Home', 'Strangers from Hell'],
  },
  {
    genre: 'mystery',
    label: 'Mystery',
    provisionalTitle: 'Nine Names in a Drawer',
    logline:
      'A retired profiler receives nine old case files and a note: “One of these people never existed.”',
    hook: 'The ninth file contains her own school photograph.',
    tone: 'Measured, investigative, unsettling',
    theme: 'The stories we accept to stay comfortable',
    motifs: ['paper files', 'magnifier', 'empty chair', 'frost on glass'],
    cast: ['retired profiler', 'young detective who idolises her', 'the ninth name'],
    compare: ['Signal', 'Bastard'],
  },
  {
    genre: 'comedy',
    label: 'Comedy',
    provisionalTitle: 'My Landlord Is a Sword Saint',
    logline:
      'The strongest swordsman in the world is hiding from his fans in a rooftop flat — and his new tenant will not stop asking questions.',
    hook: 'The rent is absurdly low. The reason is standing behind her.',
    tone: 'Snappy, escalating, heartfelt',
    theme: 'Legends are just tired people',
    motifs: ['bent umbrella', 'ramen steam', 'chalk marks on the roof', 'signature sword'],
    cast: ['nosy tenant', 'retired sword saint landlord', 'rival who found him'],
    compare: ['The Greatest Estate Developer', 'Return of the Blossoming Blade'],
  },
  {
    genre: 'historical',
    label: 'Historical',
    provisionalTitle: 'The Court Painter’s Daughter',
    logline:
      'A painter’s daughter can put real memories into portraits — and the queen has just commissioned a lie.',
    hook: 'Every portrait she paints reveals a crime. The new commission is her father’s.',
    tone: 'Courtly, tense, beautifully cruel',
    theme: 'Truth as a weapon in a beautiful room',
    motifs: ['silk', 'ground pigment', 'paper screens', 'rain on tiles'],
    cast: ['painter’s daughter', 'queen with two faces', 'court censor'],
    compare: ['Raeliana', 'The Remarried Empress'],
  },
  {
    genre: 'drama',
    label: 'Drama',
    provisionalTitle: 'Everything We Did Not Say',
    logline:
      'Three siblings return to their mother’s shuttered restaurant and find her unfinished voice memos to a stranger.',
    hook: 'The recordings are addressed to someone who is not their father.',
    tone: 'Intimate, restrained, warm',
    theme: 'Inheritance is unfinished sentences',
    motifs: ['cold stove', 'voice memos', 'rainy market street', 'old receipts'],
    cast: ['eldest daughter', 'middle son', 'youngest who never left'],
    compare: ['Yumi’s Cells', 'Nevertheless'],
  },
];

export const BUBBLE_KINDS: { id: string; label: string; limit: number; hint: string }[] = [
  { id: 'speech', label: 'Speech', limit: 90, hint: 'Solid oval, tail points at the mouth' },
  { id: 'thought', label: 'Thought', limit: 90, hint: 'Cloud bubble, no tail, bubbles lead to thinker' },
  { id: 'shout', label: 'Shout', limit: 55, hint: 'Spiky burst, bold lettering, tail thick' },
  { id: 'whisper', label: 'Whisper', limit: 90, hint: 'Dashed outline, small type, close to speaker' },
  { id: 'narration', label: 'Caption', limit: 140, hint: 'Square edge box, top-left, never battles a ballon' },
  { id: 'offpanel', label: 'Off-panel', limit: 90, hint: 'Balloon enters from edge with a long tail off-frame' },
  { id: 'system', label: 'System / SFX UI', limit: 80, hint: 'Glowing box for HUD or game-window dialogue' },
];

export const SAMPLE_BUBBLE_LIMITS: Record<string, number> = {
  speech: 90,
  thought: 90,
  shout: 55,
  whisper: 90,
  narration: 140,
  offpanel: 90,
  system: 80,
};

export const STAGES = [
  { id: 'concept', n: 1, label: 'Concept', short: 'Concept', desc: 'Genre, hook, logline, platform, style lock' },
  { id: 'bible', n: 2, label: 'Story Bible', short: 'Bible', desc: 'World, rules, cast, visual grammar' },
  { id: 'beats', n: 3, label: 'Beat Sheet', short: 'Beats', desc: 'Episode rhythm, scroll units, cliffhanger' },
  { id: 'panels', n: 4, label: 'Panel Director', short: 'Panels', desc: 'Shot, angle, staging, scroll weight' },
  { id: 'prompts', n: 5, label: 'Prompt Compiler', short: 'Prompts', desc: 'Consistent per-panel render briefs' },
  { id: 'render', n: 6, label: 'Render', short: 'Render', desc: 'Image generation or storyboard art' },
  { id: 'lettering', n: 7, label: 'Lettering', short: 'Lettering', desc: 'Balloons, tails, SFX, reading order' },
  { id: 'qc', n: 8, label: 'QC & Export', short: 'QC', desc: 'Continuity audit, publish pack, reader' },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  protagonist: 'Protagonist',
  antagonist: 'Antagonist',
  deuteragonist: 'Deuteragonist',
  mentor: 'Mentor',
  ally: 'Ally',
  rival: 'Rival',
  support: 'Support',
  cameo: 'Cameo',
};
