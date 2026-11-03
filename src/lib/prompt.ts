import type { Character, CharacterVersion, Panel, Project, SheetKind } from '../store/types';
import { LOOKS, PALETTES } from '../store/constants';
import { baseVersion, resolvedVersion, sheetOf, VERSION_LABEL } from './references';

// ---------------------------------------------------------------------------
// Prompt compiler. One style lock, many panels: every prompt is the same fixed
// head (look + line + shading + palette), then the shot block, then the cast
// block (face anchor + outfit + version markers), then the moment.
//
// Face and outfit are deliberately separate. The face is permanent identity;
// the outfit belongs to the scene. Mixing them is what makes a model redesign
// a character's jaw when it changes their coat.
// ---------------------------------------------------------------------------

export const lookOf = (project: Project) =>
  LOOKS.find((l) => l.id === project.style.lookId) ?? LOOKS[0];

export const paletteOf = (project: Project) =>
  PALETTES.find((p) => p.id === project.style.paletteId) ?? PALETTES[0];

const LINE_WORD: Record<string, string> = {
  hairline: 'hairline ink weight, delicate',
  clean: 'clean uniform ink weight',
  bold: 'heavy bold ink weight',
  brush: 'brushy tapered ink weight',
};

const SHADE_WORD: Record<string, string> = {
  flat: 'flat colour with no gradients',
  cel: 'two-tone cel shading',
  'soft-gradient': 'soft gradient shading',
  painterly: 'painterly rendered shading',
  hatched: 'cross-hatched shadow',
};

/** The paragraph that must appear, unchanged, in every single render. */
export function buildStyleLock(project: Project): string {
  const look = lookOf(project);
  const pal = paletteOf(project);
  return [
    look.promptFragment,
    LINE_WORD[project.style.lineWeight] ?? project.style.lineWeight,
    SHADE_WORD[project.style.shading] ?? project.style.shading,
    `palette anchored on ${pal.colors.slice(1).join(', ')} over ${pal.colors[0]}`,
    'korean webtoon panel, vertical composition, clean readable silhouette, no text, no lettering, no speech bubbles, no watermark',
  ].join(', ');
}

export const SHOT_WORD: Record<string, string> = {
  establishing: 'establishing shot, environment dominant, figure small in frame',
  wide: 'wide shot, full bodies, clear blocking and spatial geography',
  full: 'full-body shot, figure fills the vertical frame',
  medium: 'medium shot, waist up',
  'medium-close': 'medium close-up, chest up, hands visible',
  'close-up': 'close-up on the face, emotion legible at thumbnail size',
  'extreme-close': 'extreme close-up, single detail fills the frame',
  insert: 'insert shot, object detail, shallow depth of field',
  'over-shoulder': 'over-the-shoulder shot, foreground shoulder in silhouette',
  silhouette: 'silhouette shot, subject backlit and unreadable',
  'panel-less': 'panel-less bleeding art, no frame border, full-bleed composition',
};

export const ANGLE_WORD: Record<string, string> = {
  eye: 'eye-level camera',
  low: 'low-angle camera looking up, subject powerful',
  high: 'high-angle camera looking down, subject vulnerable',
  birds: "bird's-eye camera, flat overhead",
  worms: "worm's-eye camera, extreme upward tilt",
  dutch: 'dutch tilt, canted horizon',
  'top-down': 'straight top-down camera',
};

export const COMP_WORD: Record<string, string> = {
  center: 'centred symmetrical composition',
  thirds: 'rule-of-thirds composition, subject off-centre',
  diagonal: 'strong diagonal composition',
  symmetry: 'rigid symmetrical composition',
  'negative-space': 'generous negative space, subject pushed to one edge',
  'frame-within': 'frame-within-a-frame composition',
  claustrophobic: 'claustrophobic crop, subject pressed against the frame edges',
  'leading-lines': 'leading lines pulling the eye down the page',
};

/** Permanent identity string for one character — never contains outfit or mood. */
export const faceOf = (c: Character) => c.faceAnchor?.trim() || c.promptFragment;

/** Outfit in force for this panel: panel override, else the character's default. */
export function outfitOf(project: Project, panel: Panel, c: Character): string {
  return panel.outfits?.[c.id]?.trim() || c.outfit;
}

/** Human-readable label for a version in prompts/exports. */
export function versionLabel(v?: CharacterVersion): string {
  if (!v) return '';
  return v.type === 'base' ? v.name : `${VERSION_LABEL[v.type]} · ${v.name}`;
}

export function characterBlock(project: Project, panel: Panel): string {
  const parts = panel.characterIds
    .map((id) => {
      const c = project.cast.find((x) => x.id === id);
      if (!c) return '';
      const v = resolvedVersion(project, panel, id);
      const bits: string[] = [faceOf(c)];
      const outfit = outfitOf(project, panel, c);
      if (outfit) bits.push(`wearing ${outfit}`);
      if (v && v.type !== 'base') {
        bits.push(`${v.type === 'evolution' ? 'evolved form' : 'variant'} "${v.name}"`);
        if (v.identityMarkers.length) bits.push(`preserve ${v.identityMarkers.join(', ')}`);
        if (v.description) bits.push(v.description);
      }
      return bits.filter(Boolean).join(', ');
    })
    .filter(Boolean);
  return parts.join(' | ');
}

export interface CompiledPrompt {
  prompt: string;
  negative: string;
  seed: number;
  aspect: string;
  characters: Character[];
  styleLock: string;
  /** Versions in force in this panel (for display + export). */
  versions: CharacterVersion[];
}

export function compilePanel(project: Project, panel: Panel): CompiledPrompt {
  const styleLock = project.style.masterPrompt?.trim() || buildStyleLock(project);
  const pal = paletteOf(project);
  const characters = panel.characterIds
    .map((id) => project.cast.find((c) => c.id === id))
    .filter(Boolean) as Character[];
  const versions = panel.characterIds
    .map((id) => resolvedVersion(project, panel, id))
    .filter(Boolean) as CharacterVersion[];
  const hasRefs = versions.some((v) => Object.keys(v.images ?? {}).length > 0);

  const parts: string[] = [styleLock];
  parts.push(SHOT_WORD[panel.shot], ANGLE_WORD[panel.angle], COMP_WORD[panel.composition]);
  if (panel.setting) parts.push(panel.setting);
  if (panel.action) parts.push(panel.action);
  const cast = characterBlock(project, panel);
  if (cast) parts.push(cast);
  if (panel.lighting) parts.push(panel.lighting);
  if (panel.timeOfDay) parts.push(`${panel.timeOfDay} lighting`);
  parts.push(`${pal.name.toLowerCase()} colour script`);
  if (panel.fullBleed) parts.push('full-bleed, no border, art runs to the panel edge');
  if (cast) {
    parts.push(
      hasRefs
        ? 'use the attached reference sheets as the visual reference; keep face shape, eye design, hair silhouette and costume identical'
        : 'identical facial structure and outfit to the character reference sheet',
    );
  }

  const base = panel.prompt?.trim();
  const prompt = base || parts.filter(Boolean).join(', ');

  const negative =
    panel.negative?.trim() ||
    project.style.negativePrompt ||
    'blurry, watermark, text, speech bubble, extra fingers, deformed hands, inconsistent character design';

  return {
    prompt,
    negative,
    seed: panel.seed ?? project.style.seed,
    aspect: `${project.style.width}x${Math.round(project.style.width * (panel.height || 1))}`,
    characters,
    styleLock,
    versions,
  };
}

/** Prompt for one reference sheet of one character version. */
export function sheetPrompt(
  project: Project,
  c: Character,
  version: CharacterVersion | undefined,
  kind: SheetKind = 'turnaround',
): string {
  const styleLock = project.style.masterPrompt?.trim() || buildStyleLock(project);
  const sheet = sheetOf(kind);
  const v = version ?? baseVersion(project, c.id);
  const markers = v?.identityMarkers?.length ? `identity markers that must survive: ${v.identityMarkers.join(', ')}` : '';
  const lineage = v && v.type !== 'base' && v.description ? `${VERSION_LABEL[v.type]} design state — ${v.name}: ${v.description}` : '';
  return [
    styleLock,
    `character reference sheet of ${c.name}${v && v.type !== 'base' ? ` (${v.name})` : ''}`,
    sheet.shot,
    faceOf(c),
    c.outfit ? `wearing ${c.outfit}` : '',
    markers,
    lineage,
    'even neutral lighting, plain flat grey background, no text, no labels, no watermark, on-model in every view',
  ]
    .filter(Boolean)
    .join(', ');
}

/** Legacy single-sheet helper used by the Bible and the prompt pack. */
export function characterSheetPrompt(project: Project, c: Character): string {
  return c.refPrompt?.trim() || sheetPrompt(project, c, baseVersion(project, c.id), 'turnaround');
}

/** Everything the studio hands to an image model for one episode. */
export function buildPromptPack(project: Project, panels: Panel[]): string {
  const styleLock = project.style.masterPrompt?.trim() || buildStyleLock(project);
  const lines: string[] = [];
  lines.push(`# Render pack — ${project.meta.title}`);
  lines.push('');
  lines.push('## Style lock (paste this into every generation, unchanged)');
  lines.push('```');
  lines.push(styleLock);
  lines.push('```');
  lines.push('');
  lines.push(`**Negative prompt:** ${project.style.negativePrompt}`);
  lines.push(`**Seed:** ${project.style.seed} (keep fixed; only character sheets may re-roll)`);
  lines.push('');
  lines.push('## Reference memory (render these first, then attach them as image references)');
  lines.push('');
  project.cast.forEach((c) => {
    lines.push(`### ${c.name} ${c.koreanName ? `(${c.koreanName})` : ''}`);
    lines.push(`- **Face anchor:** ${faceOf(c)}`);
    lines.push(`- **Default outfit:** ${c.outfit}`);
    const versions = (project.versions ?? []).filter((v) => v.characterId === c.id);
    if (!versions.length) {
      lines.push('- **No version registered yet** — create a base version before rendering this character.');
      lines.push('');
      return;
    }
    versions.forEach((v) => {
      const missing = Object.keys(v.images ?? {}).length;
      lines.push(
        `- **${VERSION_LABEL[v.type]} · ${v.name}** (${v.slug})${v.inheritsFrom ? ` ← inherits ${versions.find((x) => x.id === v.inheritsFrom)?.slug ?? 'parent'}` : ''} — ${missing}/5 sheets${v.approved ? ', approved' : ', unapproved'}`,
      );
      if (v.identityMarkers.length) lines.push(`  - Lineage markers: ${v.identityMarkers.join(', ')}`);
      if (v.description) lines.push(`  - Design state: ${v.description}`);
      lines.push(`  - Sheet prompt: ${sheetPrompt(project, c, v, 'turnaround')}`);
    });
    lines.push('');
  });
  lines.push('## Panels');
  panels.forEach((p) => {
    const c = compilePanel(project, p);
    lines.push(`### P${String(p.no).padStart(2, '0')} · ${p.shot} / ${p.angle} / ${p.composition}`);
    lines.push(`- **Aspect:** ${c.aspect} · **Seed:** ${c.seed}`);
    if (c.characters.length) lines.push(`- **Cast:** ${c.characters.map((x) => x.name).join(', ')}`);
    if (c.versions.length) lines.push(`- **Versions:** ${c.versions.map((v) => `${v.name} (${v.slug})`).join(', ')}`);
    if (Object.values(p.outfits ?? {}).length) {
      lines.push(`- **Outfits:** ${Object.entries(p.outfits ?? {}).map(([id, o]) => `${project.cast.find((x) => x.id === id)?.name ?? id}: ${o}`).join('; ')}`);
    }
    lines.push('```');
    lines.push(c.prompt);
    lines.push('```');
    lines.push(`- **Negative:** ${c.negative}`);
    if (p.bubbles.length || p.caption) {
      lines.push('- **Lettering:**');
      if (p.caption) lines.push(`  - CAPTION: ${p.caption}`);
      p.bubbles.forEach((b) => lines.push(`  - ${b.kind.toUpperCase()}${b.speaker ? ` (${b.speaker})` : ''}: ${b.text}`));
    }
    if (p.note) lines.push(`- **Note:** ${p.note}`);
    lines.push('');
  });
  return lines.join('\n');
}
