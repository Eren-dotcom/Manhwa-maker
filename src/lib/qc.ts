import type { Panel, Project, QcIssue, StageId } from '../store/types';
import { SAMPLE_BUBBLE_LIMITS } from '../store/constants';
import { castWithoutReferences, danglingBindings, REQUIRED_SHEETS, versionsUsed, VERSION_LABEL } from './references';

// ---------------------------------------------------------------------------
// QC engine — the editor that never sleeps. Checks are deterministic and run on
// every keystroke, so the writer sees the problem while the panel is still warm.
// ---------------------------------------------------------------------------

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const bubbleFontLimit = (p: Panel, text: string) => {
  const kind = p.bubbles.find((b) => b.text === text)?.kind ?? 'speech';
  return SAMPLE_BUBBLE_LIMITS[kind] ?? 90;
};

export function auditProject(project: Project): QcIssue[] {
  const issues: QcIssue[] = [];
  const add = (i: Omit<QcIssue, 'id'>) => issues.push({ id: `${i.stage}-${issues.length}-${i.title}`, ...i });

  // ---------- concept ----------
  if (!project.meta.logline.trim())
    add({
      stage: 'concept',
      level: 'error',
      title: 'No logline',
      detail: 'A manhwa without a one-sentence logline cannot be pitched, and the art team has no north star.',
      fix: 'Write: [protagonist] must [goal] or [stakes], but [obstacle]. One sentence, under 35 words.',
    });
  if (!project.meta.hook.trim())
    add({
      stage: 'concept',
      level: 'warn',
      title: 'No scroll hook',
      detail: 'Webtoon readers decide in the first 3 panels. Without a hook, episode 1 churns.',
      fix: 'Write the single image or line that stops a thumb at panel 3.',
    });
  if (!project.style.masterPrompt.trim())
    add({
      stage: 'concept',
      level: 'warn',
      title: 'Style lock not frozen',
      code: 'style-lock',
      detail: 'The style lock is empty; renders will drift between panels.',
      fix: 'Open Prompt Compiler → Style Lock and freeze the look (or click "Derive from look").',
    });

  // ---------- bible ----------
  if (!project.world.rules.length)
    add({
      stage: 'bible',
      level: 'warn',
      title: 'No world rules',
      detail: 'Rules are what make a fantasy world feel earned — and they generate plot for free.',
      fix: 'Write 3–5 hard rules with costs. Each rule should be breakable in a later arc.',
    });
  if (!project.cast.length)
    add({
      stage: 'bible',
      level: 'error',
      title: 'No cast',
      detail: 'No cast means no character consistency blocks in prompts, and no one for the reader to follow.',
      fix: 'Add at least a protagonist and an antagonist, each with a prompt fragment.',
    });
  project.cast.forEach((c) => {
    if (!c.promptFragment.trim())
      add({
        stage: 'bible',
        level: 'warn',
        title: `${c.name}: no visual anchor`,
      code: 'char-anchor',
        detail: 'Without a stable prompt fragment the model will redesign this character every panel.',
        fix: 'Describe hair, face, build, outfit and one prop — the same words every time.',
      });
    if (!c.want || !c.need)
      add({
        stage: 'bible',
        level: 'info',
        title: `${c.name}: want/need gap missing`,
        detail: 'The gap between what a character wants and needs is the engine of the arc.',
        fix: 'Fill in want and need; make them incompatible.',
      });
  });

  // ---------- reference memory ----------
  const noRefs = castWithoutReferences(project);
  if (noRefs.length)
    add({
      stage: 'bible',
      level: 'info',
      title: `${noRefs.length} character(s) without reference memory`,
      code: 'no-refs',
      detail: `${noRefs.map((c) => c.name).join(', ')} ${noRefs.length === 1 ? 'has' : 'have'} no portrait or full-body sheet. Prompt wording alone drifts after a few panels — a reference image is what actually holds a face.`,
      fix: 'Open a cast card → Reference memory, then generate the portrait and full-body sheets before rendering that character.',
    });
  const noFace = project.cast.filter((c) => !c.faceAnchor.trim() && c.promptFragment.trim());
  if (noFace.length)
    add({
      stage: 'bible',
      level: 'info',
      title: `${noFace.length} character(s) with a combined face + outfit anchor`,
      code: 'face-split',
      detail: `A single anchor string mixes permanent identity with wardrobe, so a costume change quietly redesigns the face.`,
      fix: 'Split the anchor: face and body in "face anchor", wardrobe in "outfit" (or a per-panel outfit override).',
    });

  // ---------- beats ----------
  const ep = project.episodes.find((e) => e.id === project.activeEpisodeId) ?? project.episodes[0];
  if (!ep) return issues;
  if (!ep.beats.length)
    add({
      stage: 'beats',
      level: 'error',
      title: 'Episode has no beat sheet',
      detail: 'Panels without beats become wallpaper. Rhythm is planned, not discovered.',
      fix: 'Generate an 8-unit beat sheet in the Beat Sheet stage.',
    });
  if (!ep.cliffhanger.trim())
    add({
      stage: 'beats',
      level: 'warn',
      title: 'No cliffhanger',
      detail: 'Weekly vertical platforms live on the last scroll. A soft ending costs subscribers.',
      fix: 'End on a question, a threat, or a reversal — never on a resolution.',
    });
  const panels = ep.panels;
  if (!panels.length) {
    add({
      stage: 'panels',
      level: 'error',
      title: 'No panels',
      detail: 'The panel director has not broken this episode down yet.',
      fix: 'Run "Break down episode into panels" on the Panel Director stage.',
    });
    return issues;
  }

  const dangling = danglingBindings(project, panels);
  if (dangling.length)
    add({
      stage: 'panels',
      level: 'error',
      title: `${dangling.length} panel binding(s) point at a deleted version`,
      code: 'dangling-version',
      detail: `Panels ${[...new Set(dangling.map((d) => d.panel.no))].join(', ')} are bound to character versions that no longer exist, so their prompts silently fall back to the base design.`,
      fix: 'In Panel Director, re-pick the version for those panels — or clear the binding.',
    });

  const usedVersions = versionsUsed(project, panels);
  const sheetlessVariants = usedVersions.filter(
    (v) => v.type !== 'base' && REQUIRED_SHEETS.every((k) => !v.images[k]),
  );
  if (sheetlessVariants.length)
    add({
      stage: 'render',
      level: 'info',
      title: `${sheetlessVariants.length} bound version(s) have no reference sheet`,
      code: 'sheetless-version',
      detail: `${sheetlessVariants.map((v) => `${v.name} (${VERSION_LABEL[v.type]})`).join(', ')} ${sheetlessVariants.length === 1 ? 'is' : 'are'} bound to panels but owns no portrait or full-body image — the model will improvise the change, and improvising is how a scar moves.`,
      fix: 'Generate the sheets for those versions in Bible → Reference memory, then re-render the panels that use them.',
    });

  const orphased = panels.filter((p) => !p.beatId || !ep.beats.some((b) => b.id === p.beatId));
  if (orphased.length)
    add({
      stage: 'panels',
      level: 'warn',
      title: `${orphased.length} panel(s) not tied to a beat`,
      code: 'orphan-panels',
      detail: `Panels ${orphased.map((p) => p.no).join(', ')} are floating — they will read as filler.`,
      fix: 'Assign each panel to a beat, or cut it.',
    });

  // ---------- panels ----------
  let silentRun = 0;
  let maxSilent = 0;
  panels.forEach((p) => {
    if (p.bubbles.length === 0 && !p.caption) {
      silentRun += 1;
      maxSilent = Math.max(maxSilent, silentRun);
    } else silentRun = 0;
  });
  if (maxSilent >= 3)
    add({
      stage: 'panels',
      level: 'warn',
      title: `${maxSilent} silent panels in a row`,
      detail: 'Long silent runs are a valid choice, but three or more needs deliberate staging (or it reads as un-lettered).',
      fix: 'Add a caption, an SFX, or break the run with a reaction shot.',
    });

  const heights = panels.map((p) => Math.round(p.height * 10));
  const freq = new Map<number, number>();
  heights.forEach((h) => freq.set(h, (freq.get(h) ?? 0) + 1));
  const topCount = Math.max(0, ...freq.values());
  const dominant = heights.length ? Math.round((topCount / heights.length) * 100) : 0;
  if (dominant > 60)
    add({
      stage: 'panels',
      level: 'warn',
      title: 'Panel heights are uniform',
      code: 'uniform-heights',
      detail: `${dominant}% of panels share the same height. The scroll becomes a metronome instead of a beat.`,
      fix: 'Stretch the establishing and splash panels; compress reaction shots to 0.6–0.8.',
    });

  panels.forEach((p) => {
    if (!p.action.trim() && !p.setting.trim())
      add({
        stage: 'panels',
        level: 'warn',
        title: `P${p.no}: nothing staged`,
        detail: 'No setting and no action — the image model will invent the scene and break continuity.',
        fix: 'Describe the setting and the single moment the panel captures.',
        panelNo: p.no,
      });
    if (p.bubbles.length > 3)
      add({
        stage: 'panels',
        level: 'warn',
        title: `P${p.no}: ${p.bubbles.length} balloons`,
        detail: 'More than three balloons per panel forces the reader to hunt for order.',
        fix: 'Split into another panel or cut a line.',
        panelNo: p.no,
      });
    const words = p.bubbles.reduce((n, b) => n + wordCount(b.text), 0) + wordCount(p.caption);
    if (words > 45)
      add({
        stage: 'panels',
        level: 'warn',
        title: `P${p.no}: ${words} words`,
        detail: 'Vertical panels want ≤35 words. Dense text kills scroll momentum on phones.',
        fix: 'Cut the line in half and let the art carry the rest.',
        panelNo: p.no,
      });
    p.bubbles.forEach((b) => {
      const limit = bubbleFontLimit(p, b.text);
      if (b.text.length > limit)
        add({
          stage: 'lettering',
          level: 'warn',
          title: `P${p.no}: ${b.kind} balloon overflows`,
          detail: `${b.text.length} characters vs a ${limit}-character ceiling for ${b.kind}.`,
          fix: 'Shorten the line or split the balloon.',
          panelNo: p.no,
        });
      if (b.x < 8 || b.x > 92 || b.y < 6 || b.y > 94)
        add({
          stage: 'lettering',
          level: 'warn',
          title: `P${p.no}: balloon in the trim margin`,
      code: 'balloon-trim',
          detail: `"${b.text.slice(0, 24)}…" sits at ${Math.round(b.x)}%,${Math.round(b.y)}% — inside the safe-area margin.`,
          fix: 'Keep balloons inside 8–92% horizontally and 6–94% vertically.',
          panelNo: p.no,
        });
      if (b.kind === 'speech' && !b.tail)
        add({
          stage: 'lettering',
          level: 'info',
          title: `P${p.no}: speech balloon has no tail`,
      code: 'balloon-tail',
          detail: 'A speech balloon without a tail is ambiguous unless the speaker is the only figure on panel.',
          fix: 'Add a tail, or switch it to narration.',
          panelNo: p.no,
        });
      if (!b.text.trim())
        add({
          stage: 'lettering',
          level: 'warn',
          title: `P${p.no}: empty balloon`,
      code: 'empty-balloon',
          detail: 'Placeholder balloon left blank.',
          fix: 'Write the line or delete the balloon.',
          panelNo: p.no,
        });
    });
    const orders = p.bubbles.map((b) => b.order);
    if (new Set(orders).size !== orders.length)
      add({
        stage: 'lettering',
        level: 'warn',
        title: `P${p.no}: duplicate reading order`,
      code: 'order-duplicate',
        detail: 'Two balloons share the same order number, so reading order is undefined.',
        fix: 'Renumber balloons top-to-bottom, left-to-right.',
        panelNo: p.no,
      });
    if (p.shot === 'establishing' && p.bubbles.length > 2)
      add({
        stage: 'panels',
        level: 'info',
        title: `P${p.no}: crowded establishing shot`,
        detail: 'Establishing panels work best with 0–1 balloons; the place is the subject.',
        fix: 'Move dialogue to the next panel.',
        panelNo: p.no,
      });
  });

  // ---------- prompts ----------
  const unrendered = panels.filter((p) => !p.image);
  if (unrendered.length)
    add({
      stage: 'render',
      level: 'info',
      title: `${unrendered.length} panel(s) still storyboard-only`,
      detail: 'Fine for a pitch package — the reader preview shows blueprint art where renders are missing.',
      fix: 'Render the key panels first: opening, first turn, splash, cliffhanger.',
    });

  // ---------- lettering ----------
  const totalWords = panels.reduce(
    (n, p) => n + p.bubbles.reduce((m, b) => m + wordCount(b.text), 0) + wordCount(p.caption),
    0,
  );
  const wpm = panels.length ? Math.round(totalWords / (panels.length / 12)) : 0;
  add({
    stage: 'lettering',
    level: 'info',
    title: `${totalWords} words across ${panels.length} panels`,
    detail: `Roughly ${wpm} words per minute of scroll — target 120–180 for a weekly episode.`,
    fix: 'If you are far over, the episode is a novel wearing a comic’s clothes.',
  });

  if (ep.targetPanels && Math.abs(panels.length - ep.targetPanels) / ep.targetPanels > 0.35)
    add({
      stage: 'beats',
      level: 'info',
      title: `Panel count off target (${panels.length} vs ${ep.targetPanels})`,
      detail: 'Episode length drives production cost and platform approval.',
      fix: 'Split beats or merge thin ones to land near target.',
    });

  return issues;
}

export function qcScore(issues: QcIssue[]): number {
  const errors = issues.filter((i) => i.level === 'error').length;
  const warns = issues.filter((i) => i.level === 'warn').length;
  const score = 100 - errors * 9 - warns * 2.5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export const stageIssues = (issues: QcIssue[], stage: StageId) => issues.filter((i) => i.stage === stage);
