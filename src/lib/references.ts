import type { Character, CharacterVersion, Panel, Project, SheetKind, VersionType } from '../store/types';

// ---------------------------------------------------------------------------
// Reference memory. Every recurring character owns one or more *versions*
// (base / variant / evolution), and every version owns a small set of reference
// images. Panels bind to a version, so a character can change clothes, get hurt
// or awaken without the base design ever being overwritten.
// ---------------------------------------------------------------------------

export const VERSION_LABEL: Record<VersionType, string> = {
  base: 'Base',
  variant: 'Variant',
  evolution: 'Evolution',
};

export const VERSION_RULE: Record<VersionType, string> = {
  base: 'Locked canonical design. Never overwrite it — every new look descends from it.',
  variant: 'Costume, injury, age or timeline change. Same face, new presentation.',
  evolution: 'Power-up, awakening or monster stage. Must keep its parent’s lineage markers.',
};

export interface SheetSpec {
  kind: SheetKind;
  label: string;
  shot: string;
  why: string;
}

/** The five sheets every version should eventually own, in build order. */
export const SHEETS: SheetSpec[] = [
  { kind: 'portrait', label: 'Portrait', shot: 'head and shoulders, neutral expression, front view', why: 'Face identity for every close-up.' },
  { kind: 'fullBody', label: 'Full body', shot: 'full body, front view, neutral stance, feet visible', why: 'Proportions and the default outfit.' },
  { kind: 'turnaround', label: 'Turnaround', shot: 'front, three-quarter, profile and back views side by side', why: 'Holds the design from any camera angle.' },
  { kind: 'expressions', label: 'Expressions', shot: 'six small heads: neutral, angry, shocked, smiling, determined, pained', why: 'Acting range without redesigning the face.' },
  { kind: 'poses', label: 'Poses', shot: 'six full-body poses: standing, running, attacking, blocking, falling, reaching', why: 'Fight blocking that stays on-model.' },
];

/** Without these two a version is not renderable. */
export const REQUIRED_SHEETS: SheetKind[] = ['portrait', 'fullBody'];

export const versionsFor = (project: Project, characterId: string): CharacterVersion[] =>
  (project.versions ?? [])
    .filter((v) => v.characterId === characterId)
    .sort((a, b) => Number(b.type === 'base') - Number(a.type === 'base') || a.createdAt - b.createdAt);

export const baseVersion = (project: Project, characterId: string): CharacterVersion | undefined =>
  versionsFor(project, characterId).find((v) => v.type === 'base');

export const versionById = (project: Project, id?: string | null): CharacterVersion | undefined =>
  id ? (project.versions ?? []).find((v) => v.id === id) : undefined;

/** The version actually in force for a character in a panel: bound version, else base. */
export function resolvedVersion(project: Project, panel: Panel | undefined, characterId: string): CharacterVersion | undefined {
  const bound = versionById(project, panel?.versions?.[characterId]);
  if (bound && bound.characterId === characterId) return bound;
  return baseVersion(project, characterId);
}

export const sheetOf = (kind: SheetKind): SheetSpec => SHEETS.find((s) => s.kind === kind) ?? SHEETS[0];

export const refImages = (v?: CharacterVersion): string[] =>
  v ? SHEETS.map((s) => v.images[s.kind]).filter((x): x is string => !!x) : [];

/**
 * Reference images to attach when rendering one panel, portrait/full-body first.
 * The provider decides the real ceiling (see REF_CAP in ai/providers): FLUX 10,
 * Gemini 14, gpt-image 16. Ten is the practical cap here so a cast of three
 * cannot bury the prompt under sheets.
 */
export function refsForPanel(project: Project, panel: Panel): string[] {
  const out: string[] = [];
  for (const id of panel.characterIds) {
    const v = resolvedVersion(project, panel, id);
    for (const src of refImages(v)) {
      if (!out.includes(src) && out.length < 10) out.push(src);
    }
  }
  return out;
}

export interface RefStatus {
  total: number;
  sheets: SheetKind[];
  missing: SheetKind[];
  approved: boolean;
}

export function refStatus(project: Project, characterId: string, versionId?: string): RefStatus {
  const v = versionId ? versionById(project, versionId) : baseVersion(project, characterId);
  const sheets = v ? SHEETS.filter((s) => !!v.images[s.kind]).map((s) => s.kind) : [];
  return {
    total: sheets.length,
    sheets,
    missing: SHEETS.filter((s) => !sheets.includes(s.kind)).map((s) => s.kind),
    approved: !!v?.approved,
  };
}

/** True when at least one version has a usable portrait or full-body sheet. */
export function hasReference(project: Project, characterId: string): boolean {
  return versionsFor(project, characterId).some((v) => REQUIRED_SHEETS.some((k) => !!v.images[k]));
}

/** Recurring cast with no reference image at all — the "no reference, no render" rule. */
export function castWithoutReferences(project: Project): Character[] {
  return project.cast.filter((c) => !hasReference(project, c.id));
}

export interface DanglingBinding {
  panel: Panel;
  characterId: string;
  versionId: string;
}

/** Panel → version bindings pointing at a version that no longer exists. */
export function danglingBindings(project: Project, panels: Panel[]): DanglingBinding[] {
  const out: DanglingBinding[] = [];
  panels.forEach((panel) => {
    Object.entries(panel.versions ?? {}).forEach(([characterId, versionId]) => {
      const v = versionById(project, versionId);
      if (!v || v.characterId !== characterId) out.push({ panel, characterId, versionId });
    });
  });
  return out;
}

/** Versions referenced by a panel list, for exports and prompt packs. */
export function versionsUsed(project: Project, panels: Panel[]): CharacterVersion[] {
  const seen = new Map<string, CharacterVersion>();
  panels.forEach((panel) => {
    panel.characterIds.forEach((id) => {
      const v = resolvedVersion(project, panel, id);
      if (v && !seen.has(v.id)) seen.set(v.id, v);
    });
  });
  return [...seen.values()];
}

const uid = () => `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const versionSlug = (name: string, fallback = 'version') =>
  (name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || fallback;

/** Create a version that inherits from a parent (new designs never fork in place). */
export function makeVersion(
  project: Project,
  characterId: string,
  parent: CharacterVersion | undefined,
  type: VersionType,
  name: string,
): CharacterVersion {
  const slug = versionSlug(name, type === 'base' ? 'base' : 'v');
  const clash = versionsFor(project, characterId).some((v) => v.slug === slug);
  return {
    id: uid(),
    characterId,
    slug: clash ? `${slug}-${Math.random().toString(36).slice(2, 5)}` : slug,
    name: name || VERSION_LABEL[type],
    type,
    inheritsFrom: parent?.id ?? null,
    description: '',
    identityMarkers: parent?.identityMarkers?.slice(0, 4) ?? [],
    images: {},
    approved: false,
    createdAt: Date.now(),
  };
}

/** Guarantee every cast member owns a base version (idempotent, mutates). */
export function ensureBaseVersions(project: Project): void {
  if (!Array.isArray(project.versions)) project.versions = [];
  project.cast.forEach((c) => {
    if (project.versions.some((v) => v.characterId === c.id && v.type === 'base')) return;
    project.versions.push({
      id: `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      characterId: c.id,
      slug: 'base',
      name: 'Base design',
      type: 'base',
      inheritsFrom: null,
      description: '',
      identityMarkers: [],
      images: {},
      approved: false,
      createdAt: Date.now(),
    });
  });
}
