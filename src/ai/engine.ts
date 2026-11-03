import type { AiConfig, Beat, Bubble, Character, Panel, Project } from '../store/types';
import { uid } from '../store/types';
import { MASTER_PROTOCOL, actionInstruction, projectContext } from './protocol';
import { callImage, callLlm, extractJson } from './providers';
import {
  offlineAdvice,
  offlineBeats,
  offlineCast,
  offlineConcept,
  offlinePanels,
  offlineWorld,
} from './offline';
import { compilePanel } from '../lib/prompt';
import { ensureBaseVersions, refsForPanel } from '../lib/references';
import { auditProject } from '../lib/qc';

// ---------------------------------------------------------------------------
// The orchestrator. Every AI button in the studio goes through runAction():
// build context → call the model (or the offline engine) → validate → mutate a
// draft project. Validation is permissive but never trusts shapes blindly.
// ---------------------------------------------------------------------------

export type ActionId = 'concept' | 'world' | 'cast' | 'beats' | 'panels' | 'critique' | 'chat';

export interface RunResult {
  ok: boolean;
  message: string;
  text?: string;
  apply?: (draft: Project) => void;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && isFinite(v) ? v : fallback);

const SHOT_SET = new Set(['establishing','wide','full','medium','medium-close','close-up','extreme-close','insert','over-shoulder','silhouette','panel-less']);
const ANGLE_SET = new Set(['eye','low','high','birds','worms','dutch','top-down']);
const COMP_SET = new Set(['center','thirds','diagonal','symmetry','negative-space','frame-within','claustrophobic','leading-lines']);
const BUBBLE_SET = new Set(['speech','thought','shout','whisper','narration','offpanel','system']);
const TAIL_SET = new Set(['none','b','bl','br','l','r','tl','t','tr']);

type Loose<T> = { [K in keyof T]?: unknown };

function normalizeBubbles(raw: unknown, startOrder = 0): Bubble[] {
  return arr<Loose<Bubble>>(raw)
    .filter((b) => str(b.text).trim().length > 0)
    .slice(0, 4)
    .map((b, i) => {
      const kind = str(b.kind, 'speech');
      return {
        id: uid('bub'),
        kind: (BUBBLE_SET.has(kind) ? kind : 'speech') as Bubble['kind'],
        speaker: str(b.speaker),
        text: str(b.text),
        x: clamp(num(b.x, 50 - i * 6), 8, 92),
        y: clamp(num(b.y, 16 + i * 24), 6, 94),
        tail: (TAIL_SET.has(str(b.tail, 'b')) ? str(b.tail, 'b') : 'b') as Bubble['tail'],
        order: num(b.order, startOrder + i),
        size: (['sm', 'md', 'lg'].includes(str(b.size)) ? str(b.size) : 'md') as Bubble['size'],
      };
    });
}

function normalizePanels(
  raw: unknown,
  beatByUnit: Map<number, Beat>,
  project: Project,
): Panel[] {
  const findChar = (name: string) => {
    const n = name.trim().toLowerCase();
    if (!n) return undefined;
    return project.cast.find(
      (c) => c.name.toLowerCase() === n || c.koreanName === name || c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()),
    );
  };
  return arr<Loose<Panel> & { unit?: number; characters?: string[] }>(raw)
    .filter((p) => str(p.action).trim() || str(p.setting).trim())
    .map((p, i) => {
      const shot = str(p.shot, 'medium');
      const angle = str(p.angle, 'eye');
      const comp = str(p.composition, 'thirds');
      const unit = num(p.unit, 1);
      const beat = beatByUnit.get(unit);
      const height = clamp(num(p.height, 1), 0.5, 2.2);
      const fullBleed = Boolean(p.fullBleed);
      const castNames = arr<unknown>(p.characters).map((c) => str(c)).filter(Boolean);
      const characterIds = [
        ...new Set(
          castNames
            .map((n) => findChar(n)?.id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      return {
        id: uid('pnl'),
        no: i + 1,
        beatId: beat?.id ?? null,
        height: Number(height.toFixed(2)),
        gutter: fullBleed ? 160 : 130,
        fullBleed,
        shot: (SHOT_SET.has(shot) ? shot : 'medium') as Panel['shot'],
        angle: (ANGLE_SET.has(angle) ? angle : 'eye') as Panel['angle'],
        composition: (COMP_SET.has(comp) ? comp : 'thirds') as Panel['composition'],
        setting: str(p.setting),
        timeOfDay: str(p.timeOfDay, 'night'),
        characterIds,
        action: str(p.action),
        lighting: str(p.lighting),
        caption: str(p.caption),
        bubbles: normalizeBubbles(p.bubbles),
        sfx: [],
        prompt: '',
        negative: '',
        seed: null,
        note: str(p.note),
        reviewed: false,
      } satisfies Panel;
    });
}

function activeEpisode(draft: Project) {
  return draft.episodes.find((e) => e.id === draft.activeEpisodeId) ?? draft.episodes[0];
}

// ---------------------------------------------------------------------------
// Apply functions for each action
// ---------------------------------------------------------------------------

function applyConcept(data: Record<string, unknown>) {
  return (draft: Project) => {
    draft.meta.altTitle = str(data.altTitle, draft.meta.altTitle);
    draft.meta.logline = str(data.logline, draft.meta.logline);
    draft.meta.hook = str(data.hook, draft.meta.hook);
    draft.meta.tone = str(data.tone, draft.meta.tone);
    draft.meta.theme = str(data.theme, draft.meta.theme);
    draft.meta.audience = str(data.audience, draft.meta.audience);
    const sub = arr<unknown>(data.subgenres).map((s) => str(s)).filter(Boolean);
    if (sub.length) draft.meta.subgenres = sub.slice(0, 4);
    const comps = arr<unknown>(data.comparisons).map((s) => str(s)).filter(Boolean);
    if (comps.length) draft.meta.comparisons = comps.slice(0, 4);
    draft.gates.concept = new Date().toISOString();
  };
}

function applyWorld(data: Record<string, unknown>) {
  return (draft: Project) => {
    draft.world.premise = str(data.premise, draft.world.premise);
    const rules = arr<unknown>(data.rules).map((r) => str(r)).filter(Boolean).slice(0, 6);
    if (rules.length) draft.world.rules = rules;
    const locs = arr<unknown>(data.locations).map((r) => str(r)).filter(Boolean).slice(0, 6);
    if (locs.length) draft.world.locations = locs;
    const gl = arr<{ term?: unknown; meaning?: unknown }>(data.glossary)
      .map((g) => ({ term: str(g.term), meaning: str(g.meaning) }))
      .filter((g) => g.term && g.meaning);
    if (gl.length) draft.world.glossary = gl;
    const motifs = arr<unknown>(data.visualMotifs).map((r) => str(r)).filter(Boolean);
    if (motifs.length) draft.world.visualMotifs = motifs;
    draft.gates.bible = new Date().toISOString();
  };
}

function applyCast(data: Record<string, unknown>) {
  return (draft: Project) => {
    const incoming = arr<Loose<Character>>(data.characters).filter((c) => str(c.name).trim());
    if (!incoming.length) return;
    const existingByName = new Map(draft.cast.map((c) => [c.name.toLowerCase(), c]));
    draft.cast = incoming.slice(0, 6).map((c) => {
      const name = str(c.name);
      const prev = existingByName.get(name.toLowerCase());
      const role = str(c.role, 'support');
      return {
        id: prev?.id ?? uid('chr'),
        name,
        koreanName: str(c.koreanName, prev?.koreanName ?? ''),
        role: (['protagonist','antagonist','deuteragonist','mentor','ally','rival','support','cameo'].includes(role)
          ? role
          : 'support') as Character['role'],
        age: str(c.age, prev?.age ?? ''),
        pronouns: str(c.pronouns, prev?.pronouns ?? ''),
        want: str(c.want),
        need: str(c.need),
        flaw: str(c.flaw),
        arc: str(c.arc),
        silhouette: str(c.silhouette),
        outfit: str(c.outfit),
        palette: str(c.palette),
        voice: str(c.voice),
        verbalTics: str(c.verbalTics),
        faceAnchor: str(c.faceAnchor, prev?.faceAnchor ?? ''),
        promptFragment: str(c.promptFragment),
        refPrompt: str(c.refPrompt),
      } satisfies Character;
    });
    ensureBaseVersions(draft);
    // keep panel cast references valid
    const ids = new Set(draft.cast.map((c) => c.id));
    draft.episodes.forEach((ep) => ep.panels.forEach((p) => (p.characterIds = p.characterIds.filter((id) => ids.has(id)))));
    draft.gates.bible = new Date().toISOString();
  };
}

function applyBeats(data: Record<string, unknown>) {
  return (draft: Project) => {
    const ep = activeEpisode(draft);
    if (!ep) return;
    const incoming = arr<Loose<Beat>>(data.beats).filter((b) => str(b.summary).trim());
    if (!incoming.length) return;
    const oldUnit = new Map(ep.beats.map((b) => [b.id, b.unit]));
    const nextBeats: Beat[] = incoming.map((b, i) => {
      const fn = str(b.fn, 'setup');
      const end = str(b.scrollEnd, 'quiet');
      return {
        id: uid('b'),
        unit: num(b.unit, i + 1),
        fn: (['hook','setup','cast','turn','escalate','reveal','breather','stinger'].includes(fn) ? fn : 'setup') as Beat['fn'],
        summary: str(b.summary),
        purpose: str(b.purpose),
        tension: clamp(Math.round(num(b.tension, 3)), 1, 5) as Beat['tension'],
        scrollEnd: (['quiet','turn','reveal','cliff'].includes(end) ? end : 'quiet') as Beat['scrollEnd'],
        panelTarget: clamp(Math.round(num(b.panelTarget, 4)), 1, 14),
      } satisfies Beat;
    });
    const byUnit = new Map(nextBeats.map((b) => [b.unit, b]));
    ep.panels.forEach((p) => {
      const unit = p.beatId ? oldUnit.get(p.beatId) : undefined;
      p.beatId = unit ? byUnit.get(unit)?.id ?? null : null;
    });
    ep.beats = nextBeats;
    if (str(data.title)) ep.title = str(data.title);
    if (str(data.logline)) ep.logline = str(data.logline);
    if (str(data.hook)) ep.hook = str(data.hook);
    if (str(data.cliffhanger)) ep.cliffhanger = str(data.cliffhanger);
    draft.gates.beats = new Date().toISOString();
  };
}

function applyPanels(data: Record<string, unknown>) {
  return (draft: Project) => {
    const ep = activeEpisode(draft);
    if (!ep) return;
    if (!ep.beats.length) {
      const seedBeats = offlineBeats(draft).beats;
      ep.beats = seedBeats.map((b) => ({ ...b, id: uid('b') }));
    }
    const byUnit = new Map(ep.beats.map((b) => [b.unit, b]));
    const panels = normalizePanels(data.panels, byUnit, draft);
    if (!panels.length) return;
    ep.panels = panels;
    draft.gates.panels = new Date().toISOString();
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runAction(
  action: ActionId,
  project: Project,
  cfg: AiConfig,
  extra?: string,
): Promise<RunResult> {
  const offline = cfg.provider === 'offline' || !cfg.apiKey.trim();

  try {
    if (action === 'chat') {
      if (offline) return { ok: true, message: 'Field manual', text: offlineAdvice(extra ?? '') };
      const res = await callLlm(cfg, [
        { role: 'system', content: MASTER_PROTOCOL },
        { role: 'system', content: projectContext(project) },
        { role: 'user', content: `${actionInstruction('chat')}\n\nQUESTION: ${extra ?? ''}` },
      ]);
      return { ok: true, message: `${res.model}`, text: res.text.trim() };
    }

    let payload: Record<string, unknown>;
    let source = 'offline engine';

    if (offline) {
      payload = offlinePayload(action, project);
    } else {
      const userPrompt = [
        projectContext(project),
        '',
        actionInstruction(action),
        extra ? `\nEXTRA DIRECTION: ${extra}` : '',
        '\nRespond with JSON only.',
      ].join('\n');
      const res = await callLlm(
        cfg,
        [
          { role: 'system', content: MASTER_PROTOCOL },
          { role: 'user', content: userPrompt },
        ],
        { json: true },
      );
      payload = extractJson<Record<string, unknown>>(res.text);
      source = `${res.model}`;
    }

    const apply = buildApply(action, payload);
    if (!apply) return { ok: false, message: 'The model returned an empty result.' };
    return { ok: true, message: `Generated with ${source}`, apply };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, message };
  }
}

function offlinePayload(action: ActionId, project: Project): Record<string, unknown> {
  switch (action) {
    case 'concept':
      return offlineConcept(project) as unknown as Record<string, unknown>;
    case 'world':
      return offlineWorld(project) as unknown as Record<string, unknown>;
    case 'cast':
      return offlineCast(project) as unknown as Record<string, unknown>;
    case 'beats':
      return offlineBeats(project) as unknown as Record<string, unknown>;
    case 'panels':
      return offlinePanels(project) as unknown as Record<string, unknown>;
    default:
      return {};
  }
}

function buildApply(action: ActionId, payload: Record<string, unknown>) {
  switch (action) {
    case 'concept':
      return applyConcept(payload);
    case 'world':
      return applyWorld(payload);
    case 'cast':
      return applyCast(payload);
    case 'beats':
      return applyBeats(payload);
    case 'panels':
      return applyPanels(payload);
    default:
      return undefined;
  }
}

/** Editor's verdict, computed locally so it works without a key. */
export function localCritique(project: Project): string {
  const issues = auditProject(project);
  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');
  const ep = project.episodes.find((e) => e.id === project.activeEpisodeId) ?? project.episodes[0];
  const lines: string[] = [];
  lines.push(
    errors.length
      ? `**Verdict — hold.** ${errors.length} blocking problem${errors.length > 1 ? 's' : ''}, ${warns.length} warning${warns.length === 1 ? '' : 's'}.`
      : warns.length
        ? `**Verdict — publishable with notes.** ${warns.length} warning${warns.length === 1 ? '' : 's'}, no blockers.`
        : `**Verdict — ship it.** No structural problems detected in the current build.`,
  );
  if (errors.length) {
    lines.push('\n**Blocking**');
    errors.slice(0, 4).forEach((e) => lines.push(`- ${e.title} — ${e.fix}`));
  }
  if (warns.length) {
    lines.push('\n**Notes**');
    warns.slice(0, 6).forEach((w) => lines.push(`- ${w.panelNo ? `P${w.panelNo}: ` : ''}${w.title} — ${w.fix}`));
  }
  if (ep) {
    const tenses = ep.beats.map((b) => b.fn);
    lines.push(
      `\n**Rhythm** — ${ep.panels.length} panels across ${ep.beats.length} scroll units (${tenses.join(' → ') || 'no beats yet'}).`,
    );
  }
  const words = ep?.panels.reduce((n, p) => n + p.bubbles.reduce((m, b) => m + b.text.split(/\s+/).filter(Boolean).length, 0), 0) ?? 0;
  lines.push(`**Text load** — ${words} spoken words. Aim under ${(ep?.panels.length ?? 30) * 8} for this panel count.`);
  return lines.join('\n');
}

/** Compile + render a single panel. Returns the asset ref (or null for storyboard). */
export async function renderPanel(
  project: Project,
  panel: Panel,
  cfg: AiConfig,
  putAsset: (dataUrl: string) => Promise<string>,
  resolve?: (ref?: string) => string | undefined,
): Promise<{ ref: string | null; prompt: string; refs: number }> {
  const compiled = compilePanel(project, panel);
  const refs = refsForPanel(project, panel)
    .map((r) => resolve?.(r) ?? (/^(data:|https?:|\/)/.test(r) ? r : ''))
    .filter(Boolean);
  const dataUrl = await callImage(cfg, compiled.prompt, {
    negative: compiled.negative,
    aspect: compiled.aspect,
    seed: compiled.seed,
    refs,
  });
  if (!dataUrl) return { ref: null, prompt: compiled.prompt, refs: refs.length };
  const ref = await putAsset(dataUrl);
  return { ref, prompt: compiled.prompt, refs: refs.length };
}

/**
 * Natural-language panel edit: "move him left, add rain, lose the sill".
 * With a model it rewrites the prompt; offline it appends the change to the
 * existing prompt so nothing about the style lock or identity is lost.
 */
export async function refinePanelPrompt(
  project: Project,
  panel: Panel,
  instruction: string,
  cfg: AiConfig,
): Promise<{ ok: boolean; prompt: string; message: string }> {
  const text = instruction.trim();
  if (!text) return { ok: false, prompt: '', message: 'Describe the change first.' };
  const compiled = compilePanel(project, panel);
  const current = panel.prompt?.trim() || compiled.prompt;
  const offline = `${current.replace(/[.\s]+$/, '')}, ${text.replace(/[.\s]+$/, '')}`;

  if (cfg.provider === 'offline' || !cfg.apiKey.trim()) {
    return {
      ok: true,
      prompt: offline,
      message: 'Added to the prompt offline. Connect a model to have it rewritten in full.',
    };
  }

  try {
    const res = await callLlm(cfg, [
      {
        role: 'system',
        content:
          'You edit exactly one image-generation prompt for a Korean webtoon panel. Return only the rewritten prompt — no preamble, no quotes, no markdown.',
      },
      {
        role: 'user',
        content: [
          'CURRENT PROMPT:',
          current,
          '',
          'PANEL FACTS (do not contradict these):',
          `- shot: ${panel.shot}, angle: ${panel.angle}, composition: ${panel.composition}`,
          `- setting: ${panel.setting}`,
          `- action: ${panel.action}`,
          `- cast: ${compiled.characters.map((c) => `${c.name} — ${c.faceAnchor || c.promptFragment}`).join(' | ') || 'none'}`,
          `- versions: ${compiled.versions.map((v) => `${v.name}${v.identityMarkers.length ? ` (preserve ${v.identityMarkers.join(', ')})` : ''}`).join('; ') || 'base designs'}`,
          '',
          `EDIT: ${text}`,
          '',
          'Rewrite the prompt so the edit is honoured while the style lock, character identity and composition stay intact. Keep it one paragraph, under 900 characters.',
        ].join('\n'),
      },
    ]);
    const cleaned = res.text
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```$/, '')
      .replace(/^["'“]|["'”]$/g, '')
      .trim()
      .slice(0, 1600);
    if (!cleaned) return { ok: true, prompt: offline, message: 'The model returned nothing usable; appended the edit instead.' };
    return { ok: true, prompt: cleaned, message: 'Prompt rewritten. Re-render to see it.' };
  } catch (err) {
    return {
      ok: true,
      prompt: offline,
      message: `Model unavailable (${(err as Error).message}) — appended the edit instead.`,
    };
  }
}
