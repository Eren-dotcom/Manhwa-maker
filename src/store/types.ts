// ---------------------------------------------------------------------------
// Manhwa Maker Studio — domain model
// Everything the studio does flows through these types. They mirror the
// machine-readable stage contracts in /protocols so an AI can read + write them.
// ---------------------------------------------------------------------------

export type StageId =
  | 'concept'
  | 'bible'
  | 'beats'
  | 'panels'
  | 'prompts'
  | 'render'
  | 'lettering'
  | 'qc';

export type Platform =
  | 'naver'
  | 'kakao'
  | 'tapas'
  | 'webtoon'
  | 'lezhin'
  | 'own-site';

export type Genre =
  | 'action'
  | 'romance'
  | 'fantasy'
  | 'thriller'
  | 'horror'
  | 'comedy'
  | 'drama'
  | 'sports'
  | 'isekai'
  | 'historical'
  | 'school'
  | 'mystery';

export type ShotType =
  | 'establishing'
  | 'wide'
  | 'full'
  | 'medium'
  | 'medium-close'
  | 'close-up'
  | 'extreme-close'
  | 'insert'
  | 'over-shoulder'
  | 'silhouette'
  | 'panel-less';

export type CameraAngle =
  | 'eye'
  | 'low'
  | 'high'
  | 'birds'
  | 'worms'
  | 'dutch'
  | 'top-down';

export type Composition =
  | 'center'
  | 'thirds'
  | 'diagonal'
  | 'symmetry'
  | 'negative-space'
  | 'frame-within'
  | 'claustrophobic'
  | 'leading-lines';

export type VersionType = 'base' | 'variant' | 'evolution';

export type SheetKind = 'portrait' | 'fullBody' | 'turnaround' | 'expressions' | 'poses';

/** Visual reference memory for one character design state. */
export interface CharacterVersion {
  id: string;
  characterId: string;
  slug: string;
  name: string;
  type: VersionType;
  /** earlier version this one descends from (lineage). */
  inheritsFrom?: string | null;
  description: string;
  identityMarkers: string[];
  images: Partial<Record<SheetKind, string>>;
  approved: boolean;
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  koreanName: string;
  role: 'protagonist' | 'antagonist' | 'deuteragonist' | 'mentor' | 'ally' | 'rival' | 'support' | 'cameo';
  age: string;
  pronouns: string;
  want: string;
  need: string;
  flaw: string;
  arc: string;
  silhouette: string;
  outfit: string;
  palette: string;
  voice: string;
  verbalTics: string;
  /** Permanent identity only — bone structure, eyes, hair, marks. Never outfit, never emotion. */
  faceAnchor: string;
  /** Stable visual slug injected into every image prompt for consistency. */
  promptFragment: string;
  /** Reference-sheet prompt the art team (or image model) should render first. */
  refPrompt: string;
}

export interface Bubble {
  id: string;
  kind: 'speech' | 'thought' | 'shout' | 'whisper' | 'narration' | 'offpanel' | 'system';
  speaker: string;
  text: string;
  /** % of panel width / height for the bubble anchor point. */
  x: number;
  y: number;
  tail:
    | 'none'
    | 'b'
    | 'bl'
    | 'br'
    | 'l'
    | 'r'
    | 'tl'
    | 't'
    | 'tr';
  order: number;
  size: 'sm' | 'md' | 'lg';
}

export interface Sfx {
  id: string;
  text: string;
  x: number;
  y: number;
  style: 'impact' | 'whoosh' | 'ink' | 'neon' | 'hand';
  rotation: number;
  scale: number;
}

export interface Panel {
  id: string;
  no: number;
  beatId: string | null;
  /** height as a multiple of the 800px canvas width — webtoons breathe vertically. */
  height: number;
  /** vertical whitespace before this panel, in px at 800 wide. */
  gutter: number;
  fullBleed: boolean;
  shot: ShotType;
  angle: CameraAngle;
  composition: Composition;
  setting: string;
  timeOfDay: string;
  characterIds: string[];
  /** characterId -> versionId. Missing = that character's base version. */
  versions?: Record<string, string>;
  /** characterId -> outfit worn in THIS panel (overrides the character's default). */
  outfits?: Record<string, string>;
  action: string;
  lighting: string;
  caption: string;
  bubbles: Bubble[];
  sfx: Sfx[];
  /** manual prompt override; otherwise compiled from the style lock + cast. */
  prompt: string;
  negative: string;
  seed: number | null;
  /** storyboard note for the human artist. */
  note: string;
  reviewed: boolean;
  /** render: bundled URL, remote URL, or data URL (data URLs are offloaded to IndexedDB). */
  image?: string;
}

export interface Beat {
  id: string;
  unit: number;
  fn: 'hook' | 'setup' | 'cast' | 'turn' | 'escalate' | 'reveal' | 'breather' | 'stinger';
  summary: string;
  purpose: string;
  tension: 1 | 2 | 3 | 4 | 5;
  scrollEnd: 'quiet' | 'turn' | 'reveal' | 'cliff';
  panelTarget: number;
}

export interface Episode {
  id: string;
  no: number;
  title: string;
  logline: string;
  hook: string;
  cliffhanger: string;
  targetPanels: number;
  beats: Beat[];
  panels: Panel[];
}

export interface StyleLock {
  lookId: string;
  paletteId: string;
  letteringStyle: 'manhwa' | 'webtoon-clean' | 'hand-ink' | 'noir';
  lineWeight: 'hairline' | 'clean' | 'bold' | 'brush';
  shading: 'flat' | 'cel' | 'soft-gradient' | 'painterly' | 'hatched';
  /** the single paragraph that anchors every render. */
  masterPrompt: string;
  negativePrompt: string;
  seed: number;
  width: number;
}

export interface AiConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'custom' | 'offline';
  model: string;
  baseUrl: string;
  apiKey: string;
  temperature: number;
  imageProvider: 'placeholder' | 'openai' | 'gemini' | 'flux' | 'pollinations' | 'upload';
  imageModel: string;
}

export interface Project {
  id: string;
  version: number;
  meta: {
    title: string;
    altTitle: string;
    genre: Genre;
    subgenres: string[];
    tone: string;
    platform: Platform;
    rating: string;
    audience: string;
    logline: string;
    hook: string;
    theme: string;
    comparisons: string[];
    updatedAt: number;
    createdAt: number;
  };
  style: StyleLock;
  world: {
    premise: string;
    rules: string[];
    locations: string[];
    glossary: { term: string; meaning: string }[];
    visualMotifs: string[];
  };
  cast: Character[];
  /** Reference memory: every character design state across the series. */
  versions: CharacterVersion[];
  episodes: Episode[];
  activeEpisodeId: string;
  ai: AiConfig;
  /** stage id -> ISO timestamp of last completion. */
  gates: Partial<Record<StageId, string>>;
  demo?: boolean;
}

export interface QcIssue {
  id: string;
  stage: StageId;
  level: 'error' | 'warn' | 'info';
  title: string;
  detail: string;
  fix: string;
  panelNo?: number;
  /** Stable rule key — lets the studio offer a real, one-click repair. */
  code?: string;
}

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const emptyBubble = (order = 0): Bubble => ({
  id: uid('bub'),
  kind: 'speech',
  speaker: '',
  text: '',
  x: 50,
  y: 22,
  tail: 'b',
  order,
  size: 'md',
});

export const emptyPanel = (no: number): Panel => ({
  id: uid('pnl'),
  no,
  beatId: null,
  height: 1,
  gutter: 120,
  fullBleed: false,
  shot: 'medium',
  angle: 'eye',
  composition: 'thirds',
  setting: '',
  timeOfDay: 'day',
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
});

export const emptyEpisode = (no: number): Episode => ({
  id: uid('ep'),
  no,
  title: `Episode ${no}`,
  logline: '',
  hook: '',
  cliffhanger: '',
  targetPanels: 32,
  beats: [],
  panels: [],
});

export const emptyProject = (): Project => {
  const now = Date.now();
  return {
    id: uid('prj'),
    version: 2,
    meta: {
      title: 'Untitled Manhwa',
      altTitle: '',
      genre: 'action',
      subgenres: [],
      tone: '',
      platform: 'webtoon',
      rating: 'Teen',
      audience: '',
      logline: '',
      hook: '',
      theme: '',
      comparisons: [],
      createdAt: now,
      updatedAt: now,
    },
    style: {
      lookId: 'clean-cel',
      paletteId: 'ink-vermilion',
      letteringStyle: 'manhwa',
      lineWeight: 'clean',
      shading: 'cel',
      masterPrompt: '',
      negativePrompt:
        'blurry lineart, extra fingers, watermark, signature, garbled text, latin text overlay, cropped face, inconsistent eye colour, photorealism, 3d render, jpeg artifacts',
      seed: 771027,
      width: 800,
    },
    world: { premise: '', rules: [], locations: [], glossary: [], visualMotifs: [] },
    cast: [],
    versions: [],
    episodes: [emptyEpisode(1)],
    activeEpisodeId: '',
    ai: {
      provider: 'offline',
      model: 'gpt-4o-mini',
      baseUrl: '',
      apiKey: '',
      temperature: 0.8,
      imageProvider: 'placeholder',
      imageModel: 'gpt-image-1',
    },
    gates: {},
  };
};

// ---------------------------------------------------------------------------
// Shape migration. Projects saved before reference memory existed still load;
// they simply have no versions and fall back to promptFragment as the face.
// ---------------------------------------------------------------------------

export function migrateProject(p: Project): Project {
  const anyP = p as Project & { versions?: unknown };
  if (!Array.isArray(anyP.versions)) anyP.versions = [];
  (p.cast ?? []).forEach((c) => {
    if (typeof c.faceAnchor !== 'string') c.faceAnchor = '';
  });
  (p.episodes ?? []).forEach((ep) => {
    (ep.panels ?? []).forEach((pn) => {
      if (!pn.versions) pn.versions = {};
      if (!pn.outfits) pn.outfits = {};
    });
  });
  if (!p.version || p.version < 2) p.version = 2;
  return p;
}
