import type { Bubble, Panel, Sfx } from '../store/types';
import { BUBBLE_KINDS } from '../store/constants';

// ---------------------------------------------------------------------------
// Lettering engine. Balloons are placed on a percentage grid over the panel,
// so the engine reasons in % units. It estimates each balloon's bounding box
// from its kind, text length and size, then lays panels out in reading order
// (top-to-bottom, left-to-right) without overlaps and inside the safe area.
// ---------------------------------------------------------------------------

export const SAFE = { x0: 8, x1: 92, y0: 6, y1: 94 } as const;

const kindLimit = (kind: Bubble['kind']) => BUBBLE_KINDS.find((k) => k.id === kind)?.limit ?? 90;

const SIZE_FACTOR: Record<Bubble['size'], number> = { sm: 0.78, md: 1, lg: 1.28 };

/** Pick a type size from how full the balloon is against its kind's ceiling. */
export function autoSize(b: Bubble): Bubble['size'] {
  const ratio = b.text.length / kindLimit(b.kind);
  if (ratio > 0.75) return 'lg';
  if (ratio < 0.35) return 'sm';
  return 'md';
}

export interface BubbleBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Estimated bounding box of a balloon, in panel percentage units. */
export function bubbleBox(b: Bubble): BubbleBox {
  const f = SIZE_FACTOR[b.size] ?? 1;
  const limit = kindLimit(b.kind);
  const lines = Math.max(1, Math.ceil(b.text.length / Math.max(10, limit * 0.55)));
  const w = Math.min(64, Math.max(18, 14 + b.text.length * 0.42 * f));
  const h = Math.min(34, Math.max(7, 5 + lines * 5.2 * f));
  return { x: b.x - w / 2, y: b.y - h / 2, w, h };
}

const overlaps = (a: BubbleBox, b: BubbleBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** True when any two balloons' estimated boxes intersect. */
export function hasOverlap(bubbles: Bubble[]): boolean {
  const boxes = bubbles.map(bubbleBox);
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i], boxes[j])) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Dialogue space engine: minimum breathing room between balloons and from the
// safe-area edge, in panel percentage units. Webtoon balloons need air — a
// 4% gutter between boxes is the floor, 6% is comfortable.
// ---------------------------------------------------------------------------

export const MIN_BUBBLE_GAP = 4;
export const MIN_EDGE_GAP = 2;

export interface SpacingReport {
  /** smallest gap between any two balloon boxes */
  minPairGap: number;
  /** smallest distance from any balloon box to the safe-area edge */
  minEdgeGap: number;
  pairs: { a: number; b: number; gap: number }[];
  ok: boolean;
}

const pairGap = (a: BubbleBox, b: BubbleBox) => {
  const dx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), 0);
  const dy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h), 0);
  // Euclidean clearance between boxes (0 when touching/overlapping).
  return Math.hypot(dx, dy);
};

/** Measure the dialogue space of one panel's balloons. */
export function spacingReport(bubbles: Bubble[]): SpacingReport {
  const boxes = bubbles.map(bubbleBox);
  const pairs: SpacingReport['pairs'] = [];
  let minPairGap = Infinity;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const gap = pairGap(boxes[i], boxes[j]);
      pairs.push({ a: i, b: j, gap });
      minPairGap = Math.min(minPairGap, gap);
    }
  }
  const minEdgeGap = boxes.length
    ? Math.min(
        ...boxes.flatMap((b) => [
          b.x - SAFE.x0 + 0, // distance from box left edge to safe left
          SAFE.x1 - (b.x + b.w),
          b.y - SAFE.y0,
          SAFE.y1 - (b.y + b.h),
        ]),
      )
    : Infinity;
  if (!boxes.length) minPairGap = Infinity;
  return {
    minPairGap,
    minEdgeGap,
    pairs,
    ok: minPairGap >= MIN_BUBBLE_GAP && minEdgeGap >= MIN_EDGE_GAP,
  };
}

/**
 * Smart layout for one panel's balloons: reading order first, then a
 * non-overlapping stack inside the safe area, tails chosen by position,
 * type size matched to line length. Returns a new bubble array.
 */
export function layoutBubbles(bubbles: Bubble[]): Bubble[] {
  const sorted = [...bubbles].sort((a, b) => a.order - b.order || a.y - b.y || a.x - b.x);
  const placed: BubbleBox[] = [];
  return sorted.map((b, i) => {
    const size = autoSize(b);
    const next: Bubble = {
      ...b,
      size,
      order: i + 1,
      x: sorted.length === 1 ? 50 : i % 2 === 0 ? 30 : 70,
      y: 14,
      tail: b.kind === 'narration' || b.kind === 'thought' ? 'none' : b.tail || 'b',
    };
    // Drop the box until it clears every placed balloon by MIN_BUBBLE_GAP.
    let box = bubbleBox(next);
    let guard = 0;
    while (placed.some((p) => pairGap(box, p) < MIN_BUBBLE_GAP) && guard++ < 40) {
      next.y = clamp(box.y + box.h / 2 + MIN_BUBBLE_GAP + (guard % 2) * 2, SAFE.y0 + box.h / 2, SAFE.y1 - box.h / 2);
      box = bubbleBox(next);
    }
    next.x = clamp(next.x, SAFE.x0 + MIN_EDGE_GAP + box.w / 2, SAFE.x1 - MIN_EDGE_GAP - box.w / 2);
    next.y = clamp(next.y, SAFE.y0 + MIN_EDGE_GAP + box.h / 2, SAFE.y1 - MIN_EDGE_GAP - box.h / 2);
    if (next.kind === 'speech') next.tail = next.y > 55 ? 't' : 'b';
    placed.push(bubbleBox(next));
    return next;
  });
}

/** Run the engine over a whole panel: bubbles laid out, caption kept. */
export function letterPanel(panel: Panel): Panel {
  return { ...panel, bubbles: layoutBubbles(panel.bubbles) };
}

/** Keep SFX clear of balloons: nudge any SFX whose box hits a balloon box. */
export function clearSfx(bubbles: Bubble[], sfx: Sfx[]): Sfx[] {
  const boxes = bubbles.map(bubbleBox);
  return sfx.map((s) => {
    const box: BubbleBox = { x: s.x - 10 * s.scale, y: s.y - 6 * s.scale, w: 20 * s.scale, h: 12 * s.scale };
    let out = { ...s };
    let guard = 0;
    while (boxes.some((b) => overlaps(box, b)) && guard++ < 20) {
      out = { ...out, y: clamp(out.y + 8, 8, 92) };
      box.y = out.y - 6 * out.scale;
    }
    return out;
  });
}

/** Pipeline: letter every panel of an episode. Returns the new panel array. */
export function letterEpisode(panels: Panel[]): Panel[] {
  return panels.map((p) => {
    const lettered = letterPanel(p);
    return { ...lettered, sfx: clearSfx(lettered.bubbles, p.sfx) };
  });
}
