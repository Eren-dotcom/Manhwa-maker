import type { Panel, Project } from '../store/types';

// ---------------------------------------------------------------------------
// Render QA. Deterministic, local, no model calls: decode each rendered panel
// and measure the things a reader experiences but a prompt cannot guarantee —
// resolution against the canvas, aspect against the plan, contrast, crushed or
// blown exposure, dead borders, and whether the silhouette survives at
// thumbnail size (the 120px test the protocol keeps talking about).
// ---------------------------------------------------------------------------

export interface QaIssue {
  level: 'warn' | 'info';
  text: string;
}

export interface PanelQa {
  panelId: string;
  panelNo: number;
  width: number;
  height: number;
  plannedAspect: number;
  actualAspect: number;
  meanLuma: number;
  contrast: number;
  edge: number;
  thumbEdge: number;
  letterboxed: boolean;
  issues: QaIssue[];
}

export interface RenderQaReport {
  panels: PanelQa[];
  analysed: number;
  skipped: number;
  warned: number;
}

const THUMB_W = 120;
/** e.g. edge energy below this on a 120px-wide thumbnail: the figure dissolves. */
const THUMB_EDGE_FLOOR = 6;
const CONTRAST_FLOOR = 18;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load a rendered panel'));
    img.src = src;
  });

function drawScaled(img: HTMLImageElement, width: number): { data: Uint8ClampedArray; w: number; h: number } | null {
  const canvas = document.createElement('canvas');
  const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * width));
  canvas.width = width;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, h);
  return { data: ctx.getImageData(0, 0, width, h).data, w: width, h };
}

const luma = (d: Uint8ClampedArray, i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

function stats(px: { data: Uint8ClampedArray; w: number; h: number }) {
  const { data, w, h } = px;
  let sum = 0;
  let sumSq = 0;
  let edge = 0;
  const n = w * h;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const l = luma(data, i);
      sum += l;
      sumSq += l * l;
      if (x > 0 && y > 0) {
        const left = luma(data, i - 4);
        const up = luma(data, i - w * 4);
        edge += Math.abs(l - left) + Math.abs(l - up);
      }
    }
  }
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  return { mean, contrast: Math.sqrt(variance), edge: edge / (n * 2) / 255 * 100 };
}

/** Uniform bars at the edges: a panel that was letterboxed or exported with a margin. */
function hasDeadBorder(px: { data: Uint8ClampedArray; w: number; h: number }): boolean {
  const { data, w, h } = px;
  const band = Math.max(2, Math.round(h * 0.02));
  let borderSum = 0;
  let borderSq = 0;
  let borderN = 0;
  for (let y = 0; y < band; y += 1) {
    for (let x = 0; x < w; x += 1) {
      [y, h - 1 - y].forEach((yy) => {
        const i = (yy * w + x) * 4;
        const l = luma(data, i);
        borderSum += l;
        borderSq += l * l;
        borderN += 1;
      });
    }
  }
  const borderMean = borderSum / borderN;
  const borderStd = Math.sqrt(Math.max(0, borderSq / borderN - borderMean * borderMean));
  let innerSum = 0;
  let innerN = 0;
  for (let y = band * 2; y < h - band * 2; y += 3) {
    for (let x = 0; x < w; x += 3) {
      innerSum += luma(data, (y * w + x) * 4);
      innerN += 1;
    }
  }
  const innerMean = innerN ? innerSum / innerN : borderMean;
  return borderStd < 3 && Math.abs(borderMean - innerMean) > 14;
}

export async function analyzeRenders(
  project: Project,
  panels: Panel[],
  resolveAsset: (ref?: string) => string | undefined,
): Promise<RenderQaReport> {
  const rendered = panels.filter((p) => !!resolveAsset(p.image));
  const out: PanelQa[] = [];
  let skipped = 0;

  for (const panel of rendered) {
    const src = resolveAsset(panel.image);
    if (!src) {
      skipped += 1;
      continue;
    }
    try {
      const img = await loadImage(src);
      const plannedAspect = panel.height || 1;
      const actualAspect = img.naturalHeight / img.naturalWidth;
      const full = drawScaled(img, Math.min(480, img.naturalWidth));
      const thumb = drawScaled(img, THUMB_W);
      if (!full || !thumb) {
        skipped += 1;
        continue;
      }
      const s = stats(full);
      const t = stats(thumb);
      const letterboxed = hasDeadBorder(full);
      const issues: QaIssue[] = [];

      if (img.naturalWidth < project.style.width * 0.95)
        issues.push({
          level: 'info',
          text: `Rendered ${img.naturalWidth}px wide against a ${project.style.width}px canvas — it will be upscaled and go soft.`,
        });
      if (Math.abs(actualAspect / plannedAspect - 1) > 0.08)
        issues.push({
          level: 'warn',
          text: `Aspect ${actualAspect.toFixed(2)}:1 vs the planned ${plannedAspect.toFixed(2)}:1 — cropping or letterboxing is inevitable.`,
        });
      if (s.contrast < CONTRAST_FLOOR)
        issues.push({ level: 'warn', text: `Flat render (contrast ${s.contrast.toFixed(0)}/100) — it will read as fog on a phone.` });
      if (s.mean < 18) issues.push({ level: 'warn', text: `Crushed exposure (mean luma ${s.mean.toFixed(0)}/255) — detail is gone in the darks.` });
      if (s.mean > 242) issues.push({ level: 'info', text: `Blown exposure (mean luma ${s.mean.toFixed(0)}/255) — the panel has no blacks to anchor it.` });
      if (letterboxed)
        issues.push({ level: 'warn', text: 'Dead uniform border detected — the panel will show a seam or a bar in the scroll.' });
      if (t.edge < THUMB_EDGE_FLOOR)
        issues.push({ level: 'info', text: `Silhouette is weak at 120px (edge energy ${t.edge.toFixed(1)}) — the panel may vanish in a feed.` });

      out.push({
        panelId: panel.id,
        panelNo: panel.no,
        width: img.naturalWidth,
        height: img.naturalHeight,
        plannedAspect,
        actualAspect,
        meanLuma: s.mean,
        contrast: s.contrast,
        edge: s.edge,
        thumbEdge: t.edge,
        letterboxed,
        issues,
      });
    } catch {
      skipped += 1;
    }
  }

  return {
    panels: out.sort((a, b) => a.panelNo - b.panelNo),
    analysed: out.length,
    skipped,
    warned: out.filter((p) => p.issues.some((i) => i.level === 'warn')).length,
  };
}

/** Plain-text report for a producer, a client, or an artist who never opens the app. */
export function buildRenderQaReport(project: Project, report: RenderQaReport): string {
  const L: string[] = [];
  L.push(`# Render QA — ${project.meta.title}`);
  L.push('');
  L.push(
    `${report.analysed} rendered panel(s) analysed · ${report.warned} need a look · ${report.skipped} unreadable · canvas ${project.style.width}px`,
  );
  L.push('');
  L.push('| P | px | aspect (actual/planned) | mean | contrast | 120px edge | verdict |');
  L.push('| --- | --- | --- | --- | --- | --- | --- |');
  report.panels.forEach((p) => {
    L.push(
      `| ${p.panelNo} | ${p.width}×${p.height} | ${p.actualAspect.toFixed(2)} / ${p.plannedAspect.toFixed(2)} | ${p.meanLuma.toFixed(0)} | ${p.contrast.toFixed(0)} | ${p.thumbEdge.toFixed(1)} | ${p.issues.length ? p.issues.map((i) => i.level).join(', ') : 'pass'} |`,
    );
  });
  L.push('');
  const flagged = report.panels.filter((p) => p.issues.length);
  if (flagged.length) {
    L.push('## Findings');
    flagged.forEach((p) => {
      L.push(`### P${p.panelNo}`);
      p.issues.forEach((i) => L.push(`- **${i.level}** — ${i.text}`));
      L.push('');
    });
  } else {
    L.push('Every analysed panel passes the mechanical checks. Composition and taste are still yours.');
  }
  return L.join('\n');
}
