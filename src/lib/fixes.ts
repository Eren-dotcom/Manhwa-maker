import type { Panel, Project, QcIssue } from '../store/types';
import { buildStyleLock } from './prompt';
import { ensureBaseVersions, versionById } from './references';

// ---------------------------------------------------------------------------
// Repairs. QC can name a problem; these functions actually fix it.
//
// Everything here is deterministic, conservative and undoable: it only touches
// fields the audit proved wrong, it never invents story, and it never invents
// art. Issues that need a human decision stay human — those get a "go to stage"
// link instead of a fake fix.
// ---------------------------------------------------------------------------

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const HEIGHT_PATTERN = [1.45, 0.8, 1.0, 0.7, 1.6, 0.85, 1.15, 0.75];

export interface FixResult {
  applied: number;
  note: string;
}

const panelList = (project: Project): Panel[] => {
  const ep = project.episodes.find((e) => e.id === project.activeEpisodeId) ?? project.episodes[0];
  return ep?.panels ?? [];
};

/** Which rule codes the studio can repair on its own. */
export const AUTOMATIC_FIXES = [
  'style-lock',
  'char-anchor',
  'no-refs',
  'dangling-version',
  'orphan-panels',
  'uniform-heights',
  'balloon-trim',
  'balloon-tail',
  'empty-balloon',
  'order-duplicate',
] as const;

export type FixCode = (typeof AUTOMATIC_FIXES)[number];

export const canAutoFix = (issue: QcIssue): boolean =>
  !!issue.code && (AUTOMATIC_FIXES as readonly string[]).includes(issue.code);

/** Apply one repair. Returns how many small defects were corrected. */
export function applyFix(project: Project, code: string): FixResult {
  const panels = panelList(project);

  switch (code) {
    case 'style-lock': {
      if (project.style.masterPrompt.trim()) return { applied: 0, note: 'Style lock is already frozen' };
      project.style.masterPrompt = buildStyleLock(project);
      return { applied: 1, note: 'Style lock derived from the current look, line weight, shading and palette' };
    }

    case 'char-anchor': {
      let n = 0;
      project.cast.forEach((c) => {
        const anchor = (c.faceAnchor || c.promptFragment).trim();
        if (anchor) return;
        const built = [c.name, c.age ? `${c.age}-year-old` : '', c.silhouette, c.outfit]
          .filter(Boolean)
          .join(', ')
          .trim();
        c.faceAnchor = built || `${c.name}, ${c.role}, full design TBD`;
        c.promptFragment = c.promptFragment || c.faceAnchor;
        n += 1;
      });
      return { applied: n, note: `${n} anchor(s) scaffolded from name, age, silhouette and outfit — edit them before rendering` };
    }

    case 'no-refs': {
      const before = (project.versions ?? []).length;
      ensureBaseVersions(project);
      const n = (project.versions ?? []).length - before;
      return {
        applied: n,
        note: n
          ? `${n} base version(s) created — open Reference memory to attach sheets`
          : 'Every character already owns a base version',
      };
    }

    case 'dangling-version': {
      let n = 0;
      panels.forEach((p) => {
        Object.entries(p.versions ?? {}).forEach(([characterId, versionId]) => {
          const v = versionById(project, versionId);
          if (!v || v.characterId !== characterId) {
            delete p.versions![characterId];
            n += 1;
          }
        });
        Object.keys(p.outfits ?? {}).forEach((characterId) => {
          if (!project.cast.some((c) => c.id === characterId)) {
            delete p.outfits![characterId];
            n += 1;
          }
        });
      });
      return { applied: n, note: `${n} broken binding(s) cleared — those panels fall back to the base design` };
    }

    case 'orphan-panels': {
      const ep = project.episodes.find((e) => e.id === project.activeEpisodeId) ?? project.episodes[0];
      if (!ep || !ep.beats.length) return { applied: 0, note: 'No beat sheet to attach panels to' };
      let n = 0;
      const total = Math.max(1, ep.panels.length);
      ep.panels.forEach((p, i) => {
        const valid = p.beatId && ep.beats.some((b) => b.id === p.beatId);
        if (valid) return;
        // spread panels across beats in story order, weighted by panel targets
        const budget = ep.beats.reduce((sum, b) => sum + Math.max(1, b.panelTarget), 0);
        const cursor = (i / total) * budget;
        let acc = 0;
        const beat = ep.beats.find((b) => {
          acc += Math.max(1, b.panelTarget);
          return cursor < acc;
        }) ?? ep.beats[ep.beats.length - 1];
        p.beatId = beat.id;
        n += 1;
      });
      return { applied: n, note: `${n} panel(s) assigned to the beat their position falls into` };
    }

    case 'uniform-heights': {
      const flat = panels.filter((p) => !p.fullBleed);
      if (!flat.length) return { applied: 0, note: 'Nothing to redistribute' };
      const freq = new Map<number, number>();
      panels.forEach((p) => freq.set(p.height, (freq.get(p.height) ?? 0) + 1));
      const dominant = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      let n = 0;
      panels.forEach((p, i) => {
        if (p.fullBleed) {
          p.height = Math.max(p.height, 1.6);
          return;
        }
        if (p.height !== dominant) return;
        const target = clamp(HEIGHT_PATTERN[i % HEIGHT_PATTERN.length], 0.5, 2.2);
        if (Math.abs(target - p.height) > 0.05) {
          p.height = target;
          n += 1;
        }
      });
      return { applied: n, note: `${n} panel height(s) re-stretched into a rhythm — check the scroll after this one` };
    }

    case 'balloon-trim': {
      let n = 0;
      panels.forEach((p) =>
        p.bubbles.forEach((b) => {
          if (b.x < 8 || b.x > 92 || b.y < 6 || b.y > 94) {
            b.x = clamp(b.x, 8, 92);
            b.y = clamp(b.y, 6, 94);
            n += 1;
          }
        }),
      );
      return { applied: n, note: `${n} balloon(s) moved inside the safe area` };
    }

    case 'empty-balloon': {
      let n = 0;
      panels.forEach((p) => {
        const before = p.bubbles.length;
        p.bubbles = p.bubbles.filter((b) => b.text.trim());
        n += before - p.bubbles.length;
      });
      return { applied: n, note: `${n} empty balloon(s) removed` };
    }

    case 'order-duplicate': {
      let n = 0;
      panels.forEach((p) => {
        const orders = p.bubbles.map((b) => b.order);
        if (new Set(orders).size === orders.length) return;
        p.bubbles
          .slice()
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .forEach((b, i) => {
            b.order = i;
          });
        n += 1;
      });
      return { applied: n, note: `${n} panel(s) renumbered top-to-bottom, left-to-right` };
    }

    case 'balloon-tail': {
      let n = 0;
      panels.forEach((p) => {
        if (p.characterIds.length < 2) return;
        p.bubbles.forEach((b) => {
          if (b.kind === 'speech' && (!b.tail || b.tail === 'none')) {
            b.tail = 'b';
            n += 1;
          }
        });
      });
      return { applied: n, note: `${n} speech balloon(s) given a downward tail` };
    }

    default:
      return { applied: 0, note: 'No automatic repair for that rule' };
  }
}

/** Apply every safe repair the current audit can justify. */
export function applyAllFixes(project: Project, issues: QcIssue[]): { applied: number; rules: number; notes: string[] } {
  const codes = [...new Set(issues.filter(canAutoFix).map((i) => i.code!))];
  const notes: string[] = [];
  let applied = 0;
  let rules = 0;
  codes.forEach((code) => {
    const res = applyFix(project, code);
    if (res.applied > 0) {
      applied += res.applied;
      rules += 1;
      notes.push(res.note);
    }
  });
  return { applied, rules, notes };
}

/** Issues that need a person: everything the studio will not decide for you. */
export const needsHuman = (issue: QcIssue): boolean => !canAutoFix(issue);
