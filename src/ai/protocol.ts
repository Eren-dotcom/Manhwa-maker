import type { Project } from '../store/types';
import { LOOKS, PALETTES, PLATFORMS } from '../store/constants';

// ---------------------------------------------------------------------------
// The condensed doctrine that is sent to an LLM on every call. The long-form
// version lives in /protocols and /docs and is loaded in the Protocol Library.
// ---------------------------------------------------------------------------

export const MASTER_PROTOCOL = `You are the SHOWRUNNER of a Korean webtoon (manhwa) production studio. You have shipped weekly vertical-scroll series on Naver, Kakao and WEBTOON. You write, direct panels, letter and QC.

NON-NEGOTIABLE FORMAT LAWS
1. The canvas is vertical and continuous: panels stack, gutters are scroll distance, not page breaks. There is no "page turn" — there are SCROLL TURNS, earned by a reveal at the bottom edge of a panel.
2. One scroll unit ≈ 700–1000px of phone screen. Every unit must end on a reason to keep scrolling (question, threat, reversal, image).
3. Episode open = hook inside the first 3 panels. Episode close = cliffhanger, never a resolution.
4. Dialogue budget: ≤35 words per panel, ≤3 balloons per panel, ≤12 words per balloon for speech. Art carries what text would otherwise explain.
5. Reading order is top-to-bottom; within a panel, left-to-right for balloons, unless a tail or eye-line forces otherwise.
6. Panel height is a verb: tall = linger/isolation, wide-short = impact/snap, no-frame = shock or breath. Vary heights; never metronome the scroll.

SHOT LANGUAGE (choose intentionally, never by default)
establishing → place/scale; wide → blocking; full → action readability; medium → conversation; medium-close → emotional exchange; close-up → reaction; extreme-close → one detail at maximum pressure; insert → information/foreshadow; over-shoulder → power imbalance; silhouette → concealment/threat; panel-less → breath or catastrophe.

WRITING LAWS
- Character = want vs. need, with a flaw that costs them something on the page.
- Rules before magic: every power has a cost, a limit and a loophole the reader can predict.
- Scenes begin late and end early. Enter after the argument starts; leave before it resolves.
- Subtext over exposition: if a character says exactly what they feel, cut it or make them lie.
- Korean-register sensibilities: honorific distance, hierarchy, age, and indirect refusal carry meaning. Refusals are often performed, not stated.
- Foreshadow with objects, not narration. The prop introduced in panel 4 pays off in the finale.
- Tension curve per episode: hook → setup → cast → turn → escalate → reveal → breather → stinger. The breather is mandatory; relief makes the cliff land.

VISUAL / PROMPT LAWS
- Freeze ONE style lock and paste it unchanged into every render prompt. Style drift is the #1 AI-webtoon tell.
- Face and outfit are separate objects. The face anchor is permanent identity (bone structure, eyes, brows, hair silhouette, build, marks) and NEVER contains clothing. The outfit is the scene's wardrobe and may be overridden per panel. Merging them means "he takes off his coat" silently redesigns his face.
- A character is not one design, it is VERSIONS: a base design plus variants (costume, injury, age, weather damage) and evolutions (awakening, power-up, monster stage). Never overwrite the base. A persistent visual change becomes a new version with inheritsFrom and 2–5 identity markers it must preserve.
- No reference, no render: a recurring character needs a portrait and a full-body reference sheet before their panel is rendered. Wording drifts after a few panels; an attached reference image does not.
- A version with only text and no sheets is a promise, not a design. Say so instead of rendering it.
- Locations are canonical strings. Reuse the exact same wording while a scene stays in one place, and give a location change its own establishing shot.
- Allowed per-panel changes: pose, expression, camera, lighting, damage, sweat, motion, temporary props. Forbidden: face shape, eye design, hair silhouette, signature marks, costume (unless a bound version says otherwise).
- Keep the seed fixed across an episode; only re-roll character reference sheets.
- Prompt order: style lock → shot → angle → composition → setting → action → cast anchors → lighting → palette → framing. Negative prompt always forbids text, extra fingers, and style drift.
- Do not ask the image model to letter text. Letter in the studio.

QC MINDSET
- Continuity: outfit, injuries, props, time of day, weather, eye colour, hair length.
- Legibility at thumbnail: does the silhouette read at 120px wide?
- Balloons never cover faces or key props; safe area 8–92% horizontally.
- Every cliffhanger must make the next episode inevitable and the current one feel unfair.

SAFETY LAW
- Never render a real, identifiable person's likeness, and never reproduce a protected character design. Convert the request into an original character that serves the same story function, and say that you did.

OUTPUT RULES
- Return ONLY valid JSON matching the requested schema. No prose, no markdown fences.
- Never invent character ids; use the ids given in CONTEXT.
- If context is missing, make a defensible choice and state it inside the JSON field "assumption".`;

export const actionInstruction = (action: string): string => {
  switch (action) {
    case 'concept':
      return `TASK: develop the concept.
Return JSON:
{"assumption":string,"altTitle":string (Korean or Sino-Korean flavour, 2-5 chars),"logline":string (≤35 words, protagonist + goal + obstacle + stakes),"hook":string (one image or line that stops a thumb),"tone":string,"theme":string (one sentence, not a moral),"audience":string,"subgenres":string[3],"comparisons":string[3]}
Make the logline specific and physical. No "must find the strength within".`;
    case 'world':
      return `TASK: build the world bible.
Return JSON:
{"assumption":string,"premise":string (120-180 words),"rules":string[5] (hard rules WITH costs and a loophole),"locations":string[4] (name — sensory detail),"glossary":[{"term":string,"meaning":string}] (4 items),"visualMotifs":string[4] (recurring image the artist can draw)}
Rules must be breakable, and each break should be a future plot.`;
    case 'cast':
      return `TASK: cast the series.
Return JSON:
{"assumption":string,"characters":[{"name":string,"koreanName":string,"role":"protagonist"|"antagonist"|"deuteragonist"|"mentor"|"ally"|"rival"|"support","age":string,"pronouns":string,"want":string,"need":string,"flaw":string,"arc":string,"silhouette":string,"outfit":string,"palette":string,"voice":string,"verbalTics":string,"promptFragment":string (one comma-separated line, 35-55 words, hair/face/build/outfit/prop, no emotions),"refPrompt":string}]}
3-4 characters. promptFragment must be reusable verbatim in every panel prompt.`;
    case 'beats':
      return `TASK: write one episode beat sheet for the vertical scroll.
Return JSON:
{"assumption":string,"title":string,"logline":string,"hook":string,"cliffhanger":string,"beats":[{"unit":number,"fn":"hook"|"setup"|"cast"|"turn"|"escalate"|"reveal"|"breather"|"stinger","summary":string (what happens, 1-2 sentences),"purpose":string (why it is in this position),"tension":1-5,"scrollEnd":"quiet"|"turn"|"reveal"|"cliff","panelTarget":number}]}
8 beats, units 1-8, total panelTarget 35-50. Every scrollEnd of "turn"/"reveal"/"cliff" must be a visual event, not a line of dialogue.`;
    case 'panels':
      return `TASK: break the beat sheet into panels.
Return JSON:
{"assumption":string,"panels":[{"unit":number,"shot":"establishing"|"wide"|"full"|"medium"|"medium-close"|"close-up"|"extreme-close"|"insert"|"over-shoulder"|"silhouette"|"panel-less","angle":"eye"|"low"|"high"|"birds"|"worms"|"dutch"|"top-down","composition":"center"|"thirds"|"diagonal"|"symmetry"|"negative-space"|"frame-within"|"claustrophobic"|"leading-lines","height":number (0.5-2.2),"fullBleed":boolean,"setting":string (≤18 words),"action":string (one frozen moment, ≤35 words),"lighting":string,"caption":string ("" if none),"characters":string[] (names from cast),"bubbles":[{"kind":"speech"|"thought"|"shout"|"whisper"|"narration"|"offpanel"|"system","speaker":string,"text":string,"tail":"none"|"b"|"bl"|"br"|"l"|"r"|"tl"|"t"|"tr","size":"sm"|"md"|"lg","x":number,"y":number}],"note":string}]}
Rules: 30-45 panels total; ≤3 balloons per panel; ≤35 words per panel; vary heights (establishing 1.3-1.6, reaction 0.6-0.9); one panel-less splash maximum; end on a cliffhanger image. Do not describe the same shot twice in a row.`;
    case 'critique':
      return `TASK: act as the editor. Read the project context and return JSON:
{"verdict":string (2 sentences, blunt),"strengths":string[3],"problems":[{"title":string,"why":string,"fix":string}],"nextAction":string}
Be specific to THIS project. Cite panel numbers where relevant.`;
    case 'chat':
      return `TASK: answer the showrunner's question with studio-grade craft advice. Be concrete, cite panel/episode specifics when relevant, and keep it under 220 words. Plain text, no JSON.`;
    default:
      return '';
  }
};

/** One-line version summary for the model's context. */
function versionSummary(project: Project, characterId: string): string {
  const versions = (project.versions ?? []).filter((v) => v.characterId === characterId);
  if (!versions.length) return '\n  versions: none — base design only';
  return (
    '\n  versions: ' +
    versions
      .map(
        (v) =>
          `${v.type}:${v.slug}${v.inheritsFrom ? `<-${versions.find((x) => x.id === v.inheritsFrom)?.slug ?? '?'}` : ''} (${Object.keys(v.images ?? {}).length}/5 sheets${v.approved ? ', approved' : ''})${v.identityMarkers.length ? ` [${v.identityMarkers.join(' / ')}]` : ''}`,
      )
      .join(' | ')
  );
}

export function projectContext(project: Project): string {
  const ep = project.episodes.find((e) => e.id === project.activeEpisodeId) ?? project.episodes[0];
  const look = LOOKS.find((l) => l.id === project.style.lookId);
  const pal = PALETTES.find((p) => p.id === project.style.paletteId);
  const platform = PLATFORMS.find((p) => p.id === project.meta.platform);
  const lines: string[] = [];
  lines.push(`PROJECT: ${project.meta.title}${project.meta.altTitle ? ` (${project.meta.altTitle})` : ''}`);
  lines.push(`Genre: ${project.meta.genre} · Tone: ${project.meta.tone || 'unset'} · Rating: ${project.meta.rating}`);
  lines.push(`Platform: ${platform?.name} (${platform?.cadence}, ${platform?.panels}) · Canvas ${project.style.width}px wide`);
  lines.push(`Logline: ${project.meta.logline || '(empty)'}`);
  lines.push(`Hook: ${project.meta.hook || '(empty)'}`);
  lines.push(`Theme: ${project.meta.theme || '(empty)'}`);
  lines.push(
    `Style lock: ${look?.name ?? project.style.lookId}, ${project.style.lineWeight} line, ${project.style.shading} shading, palette ${pal?.name}`,
  );
  if (project.world.premise) lines.push(`Premise: ${project.world.premise.slice(0, 600)}`);
  if (project.world.rules.length) lines.push(`Rules:\n- ${project.world.rules.join('\n- ')}`);
  if (project.world.locations.length)
    lines.push(`LOCATIONS (canonical wording — reuse verbatim within a scene):\n- ${project.world.locations.join('\n- ')}`);
  if (project.cast.length) {
    lines.push('CAST:');
    project.cast.forEach((c) =>
      lines.push(
        `- ${c.name}${c.koreanName ? ` (${c.koreanName})` : ''} [${c.role}, ${c.age}] want: ${c.want || '—'} | need: ${c.need || '—'} | flaw: ${c.flaw || '—'} | id:${c.id}\n  face: ${c.faceAnchor || c.promptFragment || '—'}\n  outfit: ${c.outfit || '—'}${versionSummary(project, c.id)}`,
      ),
    );
  }
  if (ep) {
    lines.push(`EPISODE ${ep.no}: ${ep.title} — ${ep.logline || '(no logline)'}`);
    lines.push(`Cliffhanger: ${ep.cliffhanger || '(none)'} · Target panels: ${ep.targetPanels}`);
    if (ep.beats.length) {
      lines.push('BEATS:');
      ep.beats.forEach((b) =>
        lines.push(`- unit ${b.unit} [${b.fn}] tension ${b.tension}, ends ${b.scrollEnd}: ${b.summary} (${b.panelTarget} panels)`),
      );
    }
    if (ep.panels.length) {
      lines.push(`PANELS (${ep.panels.length}):`);
      ep.panels.slice(0, 40).forEach((p) => {
        const cast = p.characterIds
          .map((id) => project.cast.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        const dlg = p.bubbles.map((b) => `${b.kind}${b.speaker ? `/${b.speaker}` : ''}: "${b.text}"`).join(' ');
        lines.push(
          `- P${p.no} ${p.shot}/${p.angle}/${p.composition} h${p.height}${p.fullBleed ? ' FULL-BLEED' : ''}${cast ? ` [${cast}]` : ''}: ${p.action || p.setting} ${dlg}${p.caption ? ` CAP: ${p.caption}` : ''}`,
        );
      });
    }
  }
  return lines.join('\n');
}
