import type { Episode, Panel, Project } from '../store/types';
import { PLATFORMS, type UploadSpec } from '../store/constants';

// ---------------------------------------------------------------------------
// Upload plan. A webtoon is not one tall image — platforms stack many images of
// bounded height. Because the studio authored every panel and gutter, it knows
// the exact pixel geometry, so it can cut the strip at the right places instead
// of letting the platform slice through a face.
//
// Geometry must match the reader: panel height = canvasWidth × height weight,
// gutter = gutter px at canvas scale.
// ---------------------------------------------------------------------------

export interface StripPanel {
  id: string;
  no: number;
  /** top of the panel in the flattened strip */
  top: number;
  height: number;
  /** gap above this panel */
  gap: number;
  hasArt: boolean;
}

export interface UploadSection {
  index: number;
  filename: string;
  /** strip y-range */
  from: number;
  to: number;
  height: number;
  panels: number[];
  /** a panel continues past this boundary */
  cutsPanel: boolean;
  /** the cut lands inside the middle 40% of a panel — the "sliced face" zone */
  cutsFocus: boolean;
}

export interface UploadPlan {
  width: number;
  spec: UploadSpec;
  specLabel: string;
  totalHeight: number;
  strip: StripPanel[];
  sections: UploadSection[];
  /** every panel has real art, so the sections can be rasterised */
  artComplete: boolean;
  warnings: { level: 'error' | 'warn' | 'info'; text: string }[];
}

export const uploadSpecFor = (project: Project): { spec: UploadSpec; label: string } => {
  const platform = PLATFORMS.find((p) => p.id === project.meta.platform) ?? PLATFORMS[2];
  const spec: UploadSpec =
    platform.upload ??
    { width: project.style.width, maxSectionHeight: 1280, maxFileMB: 2, maxEpisodeMB: 20, maxImages: 100, approximate: true };
  return { spec, label: platform.name };
};

/** Flattened strip geometry, in native canvas pixels. */
export function stripGeometry(project: Project, episode: Episode, width = project.style.width): StripPanel[] {
  let y = 0;
  return episode.panels.map((p: Panel, i) => {
    const gap = i === 0 ? 0 : Math.max(0, p.gutter);
    y += gap;
    const height = Math.round(width * p.height);
    const row: StripPanel = { id: p.id, no: p.no, top: y, height, gap, hasArt: !!p.image };
    y += height;
    return row;
  });
}

export function planUpload(project: Project, episode: Episode): UploadPlan {
  const { spec, label } = uploadSpecFor(project);
  const width = spec.width;
  const strip = stripGeometry(project, episode, width);
  const totalHeight = strip.length ? strip[strip.length - 1].top + strip[strip.length - 1].height : 0;
  const sections: UploadSection[] = [];
  const warnings: UploadPlan['warnings'] = [];

  for (let from = 0; from < totalHeight; from += spec.maxSectionHeight) {
    const to = Math.min(totalHeight, from + spec.maxSectionHeight);
    const touched = strip.filter((s) => s.top < to && s.top + s.height > from);
    const cutsPanel = touched.some((s) => s.top < from || s.top + s.height > to);
    const cutsFocus = touched.some((s) => {
      if (!(s.top < from || s.top + s.height > to)) return false;
      const cutInPanel = from > s.top ? from - s.top : to - s.top;
      const ratio = cutInPanel / s.height;
      return ratio > 0.3 && ratio < 0.7;
    });
    sections.push({
      index: sections.length + 1,
      filename: `ep${String(episode.no).padStart(2, '0')}_${String(sections.length + 1).padStart(2, '0')}.png`,
      from,
      to,
      height: to - from,
      panels: touched.map((s) => s.no),
      cutsPanel,
      cutsFocus,
    });
  }

  if (sections.length > spec.maxImages)
    warnings.push({
      level: 'error',
      text: `${sections.length} sections exceeds ${label}'s ${spec.maxImages}-image ceiling. Split the episode or widen the panels.`,
    });
  if (sections.some((s) => s.cutsFocus))
    warnings.push({
      level: 'warn',
      text: `${sections.filter((s) => s.cutsFocus).length} section break(s) land in the middle of a panel — consider nudging the gutters around P${sections
        .filter((s) => s.cutsFocus)
        .flatMap((s) => s.panels)
        .slice(0, 4)
        .join(', P')}.`,
    });
  if (strip.some((s) => !s.hasArt))
    warnings.push({
      level: 'info',
      text: 'Some panels are still storyboard placeholders, so the plan is exact but the PNG export is disabled until every panel has art.',
    });
  if (spec.approximate)
    warnings.push({
      level: 'info',
      text: `Upload limits for ${label} are a community norm here, not a published spec — confirm against the current creator dashboard.`,
    });

  return {
    width,
    spec,
    specLabel: label,
    totalHeight,
    strip,
    sections,
    artComplete: strip.length > 0 && strip.every((s) => s.hasArt),
    warnings,
  };
}

/** Human-readable delivery manifest — the thing you attach to a release. */
export function buildUploadManifest(project: Project, episode: Episode): string {
  const plan = planUpload(project, episode);
  const L: string[] = [];
  L.push(`# Upload plan — ${project.meta.title} · EP${episode.no}`);
  L.push('');
  L.push(`**Platform:** ${plan.specLabel}${plan.spec.approximate ? ' *(limits approximate — verify)*' : ''}`);
  L.push(
    `**Spec:** ${plan.width}px wide · max ${plan.spec.maxSectionHeight}px per image · ≤${plan.spec.maxFileMB} MB per file · ≤${plan.spec.maxEpisodeMB} MB per episode · ≤${plan.spec.maxImages} images`,
  );
  L.push(`**Strip:** ${plan.width} × ${plan.totalHeight}px across ${plan.sections.length} image(s)`);
  L.push('');
  L.push('| File | Size | Covers (y) | Panels | Cut note |');
  L.push('| --- | --- | --- | --- | --- |');
  plan.sections.forEach((s) => {
    L.push(
      `| \`${s.filename}\` | ${plan.width} × ${s.height} | ${s.from}–${s.to} | ${s.panels.join(', ')} | ${s.cutsFocus ? 'cuts a panel centre' : s.cutsPanel ? 'cuts a panel' : 'clean edge'} |`,
    );
  });
  L.push('');
  if (plan.warnings.length) {
    L.push('## Notes');
    plan.warnings.forEach((w) => L.push(`- **${w.level}** — ${w.text}`));
    L.push('');
  }
  L.push('## Panels in strip order');
  L.push('| P | y | height | gutter above | art |');
  L.push('| --- | --- | --- | --- | --- |');
  plan.strip.forEach((s) => L.push(`| ${s.no} | ${s.top} | ${s.height} | ${s.gap} | ${s.hasArt ? 'rendered' : 'storyboard'} |`));
  L.push('');
  L.push(`Generated by Manhwa Maker Studio · ${new Date().toLocaleString()}`);
  return L.join('\n');
}

// ---------------------------------------------------------------------------
// Rasterising. Only possible when every panel has real art; the plan above is
// always available. Each section is drawn at exactly its own height, so seams
// are pixel-exact.
// ---------------------------------------------------------------------------

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load a panel image'));
    img.src = src;
  });

export async function composeUploadSections(
  project: Project,
  episode: Episode,
  resolveAsset: (ref?: string) => string | undefined,
): Promise<{ filename: string; dataUrl: string; bytes: number }[]> {
  const plan = planUpload(project, episode);
  if (!plan.artComplete) throw new Error('Every panel needs art before the strip can be rasterised.');

  const sources = new Map<string, HTMLImageElement>();
  for (const p of episode.panels) {
    const src = resolveAsset(p.image);
    if (!src) throw new Error(`P${p.no} has no resolvable art.`);
    sources.set(p.id, await loadImage(src));
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser will not give the studio a 2D canvas.');

  const out: { filename: string; dataUrl: string; bytes: number }[] = [];
  for (const section of plan.sections) {
    canvas.width = plan.width;
    canvas.height = section.height;
    ctx.fillStyle = '#08090c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    plan.strip.forEach((s) => {
      const img = sources.get(s.id);
      if (!img) return;
      if (s.top + s.height <= section.from || s.top >= section.to) return;
      const slotTop = s.top - section.from;
      // match the reader exactly: object-fit cover, centred, clipped to the slot
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, slotTop, plan.width, s.height);
      ctx.clip();
      const scale = Math.max(plan.width / img.naturalWidth, s.height / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (plan.width - dw) / 2, slotTop + (s.height - dh) / 2, dw, dh);
      ctx.restore();
    });
    const dataUrl = canvas.toDataURL('image/png');
    // base64 payload → approximate byte size
    const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    out.push({ filename: section.filename, dataUrl, bytes });
  }
  return out;
}
