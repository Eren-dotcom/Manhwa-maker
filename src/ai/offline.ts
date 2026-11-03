import type { Beat, Character, Panel, Project } from '../store/types';
import { uid } from '../store/types';
import { GENRE_PRESETS, SHOTS, LOOKS } from '../store/constants';
import { buildStyleLock } from '../lib/prompt';

// ---------------------------------------------------------------------------
// Offline protocol engine.
// No key, no network: the studio still builds a fully structured, QC-clean
// scaffolding from the same doctrine the LLM is given. It is a skeleton, not a
// ghostwriter — it will not fake dialogue for you.
// ---------------------------------------------------------------------------

const presetOf = (project: Project) =>
  GENRE_PRESETS.find((g) => g.genre === project.meta.genre) ?? GENRE_PRESETS[0];

const heroName = (project: Project) => project.cast.find((c) => c.role === 'protagonist')?.name ?? presetOf(project).cast[0];
const rivalName = (project: Project) =>
  project.cast.find((c) => c.role === 'antagonist' || c.role === 'deuteragonist')?.name ?? presetOf(project).cast[1];

export function offlineConcept(project: Project) {
  const p = presetOf(project);
  return {
    altTitle: project.meta.altTitle || '등불청',
    logline: project.meta.logline || p.logline,
    hook: project.meta.hook || p.hook,
    tone: project.meta.tone || p.tone,
    theme: project.meta.theme || p.theme,
    audience: project.meta.audience || '16–30, weekly vertical-scroll readers on Naver / WEBTOON',
    subgenres: project.meta.subgenres.length ? project.meta.subgenres : [p.genre, 'character drama', 'serial mystery'],
    comparisons: project.meta.comparisons.length ? project.meta.comparisons : p.compare,
  };
}

export function offlineWorld(project: Project) {
  const p = presetOf(project);
  const hero = heroName(project);
  const rival = rivalName(project);
  return {
    premise:
      project.world.premise ||
      `${p.logline} The world runs on rules that are older than the city and enforced by people who are tired of enforcing them. ${hero} has a job that mostly consists of paperwork, until the paperwork starts describing ${rival} in the present tense.`,
    rules: project.world.rules.length
      ? project.world.rules
      : [
          'Every power is paid for at the moment of use — never afterwards.',
          'The rule can only be broken once per arc; the second break is what kills someone.',
          'Nothing in this world can be undone, only transferred.',
          'Institutions enforce the rules because they wrote them; the written version is always slightly wrong.',
          'Names carry legal weight. To say a true name aloud is to hand someone leverage.',
        ],
    locations: project.world.locations.length ? project.world.locations : p.motifs.map((m) => `${m} — recurring, always shown in the same light`),
    glossary: project.world.glossary.length
      ? project.world.glossary
      : [
          { term: 'The Bureau', meaning: 'The office that decides who is allowed to act.' },
          { term: 'Clean record', meaning: 'A career with no unexplained deaths. Rare, and purchasable.' },
          { term: 'The gap', meaning: 'The four minutes between a death and the paperwork that admits it.' },
          { term: 'Carrying', meaning: 'Holding another person’s rule-breaking for them. Legal, ruinous, common.' },
        ],
    visualMotifs: project.world.visualMotifs.length ? project.world.visualMotifs : p.motifs,
  };
}

export function offlineCast(project: Project): { characters: Omit<Character, 'id'>[] } {
  const p = presetOf(project);
  const look = LOOKS.find((l) => l.id === project.style.lookId) ?? LOOKS[0];
  const base = [
    {
      role: 'protagonist' as const,
      name: p.cast[0].replace(/[^a-zA-Z ]/g, '').trim() || 'The Lead',
      want: 'To finish the job and be left alone.',
      need: 'To admit that being left alone is the wound, not the cure.',
      flaw: 'Confuses competence with care.',
      arc: 'From procedure to presence.',
    },
    {
      role: 'antagonist' as const,
      name: 'The Other Side',
      want: 'To be recognised as the reasonable one.',
      need: 'To lose control in front of a witness.',
      flaw: 'Believes the rules apply to everyone else.',
      arc: 'From polite pressure to open force.',
    },
    {
      role: 'deuteragonist' as const,
      name: p.cast[1]?.replace(/[^a-zA-Z ]/g, '').trim() || 'The Auditor',
      want: 'A clean file and a promotion out of this district.',
      need: 'To break one rule for a person, not a principle.',
      flaw: 'Enforces rules already proven wrong.',
      arc: 'From auditor to accomplice.',
    },
  ];
  return {
    characters: base.map((c, i) => ({
      name: c.name,
      koreanName: ['한유월', '백소령', '아이'][i] ?? '',
      role: c.role,
      faceAnchor: '',
      age: ['34', '31', 'appears 9'][i] ?? '30',
      pronouns: i === 1 ? 'she/her' : 'he/him',
      want: c.want,
      need: c.need,
      flaw: c.flaw,
      arc: c.arc,
      silhouette:
        i === 0
          ? 'Tall and narrow, coat worn open, always one hand occupied by an object.'
          : i === 1
            ? 'Immaculate and vertical, high collar, gloved hands, reads as a verdict.'
            : 'Small and still, slightly too clean for the setting, no shadow.',
      outfit:
        i === 0
          ? 'Charcoal long coat, chipped badge, scuffed boots'
          : i === 1
            ? 'Black high-collared uniform, silver pin, white gloves'
            : 'Wet white hanbok, bare feet',
      palette: i === 0 ? 'charcoal, old gold, amber practical light' : i === 1 ? 'black, silver, cold blue' : 'white, wet grey',
      voice:
        i === 0
          ? 'Flat, economical, corrects people instead of arguing.'
          : i === 1
            ? 'Clipped and exact; states times and numbers when angry.'
            : 'A child’s register used with adult patience.',
      verbalTics: i === 0 ? 'Counts out loud when afraid.' : i === 1 ? '“Four minutes.”' : 'Says the full name before the sentence.',
      promptFragment: `${c.name}, korean webtoon character, ${i === 0 ? 'lean build, tired narrow eyes, straight black hair, charcoal long coat worn open, chipped jade badge, ink-stained fingers' : i === 1 ? 'tall immaculate posture, severe black high-collared uniform, silver pin, white gloves, black hair pinned back, cold sharp eyes' : 'small child, wet white hanbok too long, loose black hair, bare feet, no shadow, holds a white lantern'}, ${look.name.toLowerCase()} rendering`,
      refPrompt: `character reference sheet, front / three-quarter / profile, ${c.name}, neutral grey background, ${buildStyleLock(project)}`,
    })),
  };
}

export function offlineBeats(project: Project): {
  title: string;
  logline: string;
  hook: string;
  cliffhanger: string;
  beats: Omit<Beat, 'id'>[];
} {
  const hero = heroName(project);
  const rival = rivalName(project);
  const hook = project.meta.hook || presetOf(project).hook;
  const theme = project.meta.theme || presetOf(project).theme;
  const t = project.meta.title;

  const beats: Omit<Beat, 'id'>[] = [
    {
      unit: 1,
      fn: 'hook',
      summary: `Open on the image that sells the series: ${hook} No dialogue for the first panel — one caption states the rule of this world.`,
      purpose: 'Stop the thumb before the reader decides. One image, one rule, under eight seconds of scroll.',
      tension: 4,
      scrollEnd: 'quiet',
      panelTarget: 2,
    },
    {
      unit: 2,
      fn: 'setup',
      summary: `Cut to ${hero} doing the job badly and competently at the same time. Establish the cost of the work and who is watching.`,
      purpose: 'Teach the reader the daily procedure before breaking it.',
      tension: 2,
      scrollEnd: 'quiet',
      panelTarget: 3,
    },
    {
      unit: 3,
      fn: 'cast',
      summary: `${rival} arrives with a problem only ${hero} can be blamed for. The exchange is polite, and the politeness is the threat.`,
      purpose: 'Introduce the relationship engine and the pressure that will define the season.',
      tension: 3,
      scrollEnd: 'turn',
      panelTarget: 5,
    },
    {
      unit: 4,
      fn: 'turn',
      summary: 'The procedure fails in a way the rules say is impossible. Every sign in the environment changes at once — and only one person notices.',
      purpose: 'The inciting anomaly. End the scroll unit on a hard visual event, not a line.',
      tension: 5,
      scrollEnd: 'reveal',
      panelTarget: 4,
    },
    {
      unit: 5,
      fn: 'escalate',
      summary: `The cost is made visible at scale: ${hero} walks into the consequence of the failed procedure and the world is bigger than the job description.`,
      purpose: 'Raise stakes without exposition — let the reader count the bodies.',
      tension: 4,
      scrollEnd: 'quiet',
      panelTarget: 4,
    },
    {
      unit: 6,
      fn: 'reveal',
      summary: `One figure in the crowd knows ${hero} by name, and the reason is personal. The unit ends on a question the reader needs answered.`,
      purpose: 'Convert a world-level problem into a personal one.',
      tension: 5,
      scrollEnd: 'cliff',
      panelTarget: 3,
    },
    {
      unit: 7,
      fn: 'breather',
      summary: `${hero} is alone with the consequences. No dialogue, or one short thought. Rain, silence, one prop held too tightly.`,
      purpose: 'Release the pressure so the final beat can hit. Mandatory in a weekly format.',
      tension: 2,
      scrollEnd: 'quiet',
      panelTarget: 2,
    },
    {
      unit: 8,
      fn: 'stinger',
      summary: 'The threat makes physical contact. Cut on the contact — no reaction shot, no explanation, no apology.',
      purpose: 'The cliffhanger the next episode is bought with.',
      tension: 5,
      scrollEnd: 'cliff',
      panelTarget: 2,
    },
  ];

  return {
    title: project.episodes[0]?.title || `Episode 1 — ${t}`,
    logline:
      project.meta.logline ||
      `${hero} is handed a job that has already gone wrong, and the only person who can explain it is the one who benefits from the failure.`,
    hook,
    cliffhanger: project.episodes[0]?.cliffhanger || `The threat touches ${hero} directly, and the rules say it should not be able to.`,
    beats,
  };
}

const SHOT_RHYTHM: Record<Beat['fn'], Panel['shot'][]> = {
  hook: ['establishing', 'insert', 'close-up'],
  setup: ['wide', 'medium', 'insert', 'medium-close'],
  cast: ['medium-close', 'over-shoulder', 'close-up', 'medium', 'insert'],
  turn: ['wide', 'close-up', 'medium-close', 'silhouette'],
  escalate: ['wide', 'silhouette', 'medium', 'full'],
  reveal: ['panel-less', 'medium', 'close-up'],
  breather: ['medium-close', 'insert'],
  stinger: ['panel-less', 'extreme-close'],
};

const ANGLE_ROTATION: Panel['angle'][] = ['eye', 'eye', 'low', 'eye', 'high', 'eye', 'dutch', 'eye'];

export function offlinePanels(project: Project): {
  panels: (Omit<Panel, 'id' | 'beatId'> & { unit: number })[];
} {
  const beats = project.episodes
    .find((e) => e.id === project.activeEpisodeId)?.beats.length
    ? project.episodes.find((e) => e.id === project.activeEpisodeId)!.beats
    : [];
  const source = beats.length ? beats : offlineBeats(project).beats;
  const hero = project.cast.find((c) => c.role === 'protagonist');
  const other = project.cast.find((c) => c.id !== hero?.id);
  const locations = project.world.locations.length ? project.world.locations : ['the lower river — stepped stone banks, fog'];
  const panels: (Omit<Panel, 'id' | 'beatId'> & { unit: number })[] = [];
  let no = 1;

  source.forEach((beat, bIdx) => {
    const rhythm = SHOT_RHYTHM[beat.fn] ?? ['medium', 'close-up'];
    const count = Math.max(1, Math.round(beat.panelTarget || rhythm.length));
    for (let i = 0; i < count; i++) {
      const shot = rhythm[i % rhythm.length];
      const shotMeta = SHOTS.find((s) => s.id === shot) ?? SHOTS[3];
      const isTurnEnd = i === count - 1 && (beat.scrollEnd === 'turn' || beat.scrollEnd === 'reveal' || beat.scrollEnd === 'cliff');
      const isFirstOfEpisode = no === 1;
      const fullBleed = isFirstOfEpisode || beat.fn === 'turn' && i === 0 || beat.fn === 'stinger' || beat.fn === 'reveal' && shot === 'panel-less';
      const height = Math.min(2.2, Math.max(0.5, (shotMeta.height || 1) + (fullBleed ? 0.35 : 0) - (shot === 'close-up' ? 0.1 : 0)));
      const cast: string[] = [];
      if (hero && !['establishing', 'insert', 'silhouette', 'panel-less'].includes(shot)) cast.push(hero.id);
      if (other && (beat.fn === 'cast' || beat.fn === 'escalate') && shot !== 'insert') cast.push(other.id);
      panels.push({
        no,
        unit: beat.unit,
        height: Number(height.toFixed(2)),
        gutter: isTurnEnd && beat.scrollEnd === 'cliff' ? 240 : isTurnEnd ? 190 : isFirstOfEpisode ? 0 : 120,
        fullBleed,
        shot,
        angle: isTurnEnd && beat.scrollEnd === 'cliff' ? 'worms' : ANGLE_ROTATION[(no + bIdx) % ANGLE_ROTATION.length],
        composition:
          beat.fn === 'escalate' ? 'symmetry' : shot === 'close-up' ? 'center' : isFirstOfEpisode ? 'negative-space' : 'thirds',
        setting: locations[bIdx % locations.length],
        timeOfDay: bIdx < 3 ? 'night' : 'late night, rain',
        characterIds: cast,
        action: `${beat.summary.split('. ')[0]}. ${shotMeta.use}`,
        lighting: isFirstOfEpisode ? 'single warm practical, cold moonlight bounce, atmospheric fog' : 'lantern key from below, cold rim from the environment',
        caption: isFirstOfEpisode ? project.meta.hook || presetOf(project).hook : beat.scrollEnd === 'cliff' && i === count - 1 ? '' : '',
        bubbles: [],
        sfx: [],
        prompt: '',
        negative: '',
        seed: null,
        note: `Blocking pass (offline engine). ${beat.fn.toUpperCase()} beat — ${beat.purpose}`,
        reviewed: false,
      });
      no += 1;
    }
  });

  return { panels };
}

const ADVICE: { keys: string[]; text: string }[] = [
  {
    keys: ['pacing', 'rhythm', 'scroll', 'slow', 'fast'],
    text: `Vertical pacing works in scroll units of roughly 700–1000px. Each unit needs a reason to continue at its bottom edge: a question, a threat, a reversal, or an image the reader cannot leave. Practical fix: measure your episode in units, then write the last panel of each unit first. If that panel is a talking head, the unit will not hold. Also vary panel height — 3 identical heights in a row turns the scroll into a metronome.`,
  },
  {
    keys: ['balloon', 'letter', 'speech', 'sfx', 'text', 'dialogue'],
    text: `Lettering rules that survive contact with phones: ≤3 balloons per panel, ≤12 words per speech balloon, tails always point at the mouth (never at the back of a head), captions in the upper third, SFX never over a face. Reading order is top-to-bottom, then left-to-right. If a panel needs four balloons, you have written two panels.`,
  },
  {
    keys: ['style', 'consistency', 'drift', 'model', 'prompt', 'render'],
    text: `Style drift is the tell. Freeze one style lock — look, line weight, shading, palette — and paste it unchanged into every prompt. Give each character a fixed prompt fragment (35–55 words, hair/face/build/outfit/prop) and never paraphrase it. Keep the seed fixed per episode. Render character sheets first and use them as image references; text alone will not hold a face across 40 panels.`,
  },
  {
    keys: ['hook', 'first', 'episode', 'opening', 'start'],
    text: `The first three panels decide everything. Panel 1: an image the reader has not seen before. Panel 2: proof of a rule. Panel 3: a person breaking it. No worldbuilding paragraphs, no "three days earlier", no waking up in bed. If the hook needs a caption to be understood, it is not a hook.`,
  },
  {
    keys: ['cliff', 'ending', 'weekly', 'retention'],
    text: `A cliffhanger is a debt, not a tease. It must (1) cost the protagonist something already shown on-screen, (2) make the next episode inevitable, and (3) feel unfair. Cut on physical contact or on a face — never on an explanation. The breather beat before it is not optional: relief is what makes a cliff land.`,
  },
  {
    keys: ['character', 'cast', 'want', 'need', 'arc'],
    text: `Build characters as want vs. need with a flaw that costs them something visible on the page. Want is what they pursue and state; need is what the story proves they require; the flaw is the reason they cannot have both. Korean-register nuance: hierarchy, age and honorific distance are visible in who speaks first, who apologises, and who refuses indirectly. A character who says exactly what they feel is a first draft.`,
  },
  {
    keys: ['platform', 'naver', 'kakao', 'webtoon', 'format', 'canvas', 'size'],
    text: `Canvas rules: Naver/Kakao 690px wide, WEBTOON 800px, Tapas 940px, height variable and effectively unlimited. Weekly cadence, 40–60 panels for Naver/Kakao, 30–50 for WEBTOON. Design for a phone at arm's length: minimum 24px lettering at 800px width, faces no smaller than 60px, and no detail that only survives on desktop.`,
  },
  {
    keys: ['korean', 'honorific', 'localis', 'translat', 'name'],
    text: `Korean register is structure, not decoration. Decide early: 반말 (casual) vs 존댓말 (polite) between each pair of characters, and make the switch a plot event. Names: family name first, and the way a character is addressed (full name, given name, title, or nothing) carries the relationship. For global release, keep honorifics that carry information (−ssi, −nim, hyung/oppa) and translate the rest.`,
  },
];

export function offlineAdvice(question: string): string {
  const q = question.toLowerCase();
  const hits = ADVICE.filter((a) => a.keys.some((k) => q.includes(k)));
  if (hits.length) return hits.slice(0, 2).map((h) => h.text).join('\n\n');
  return `I'm running in offline mode, so I'm answering from the built-in field manual rather than a language model. Ask about pacing, lettering, style consistency, hooks, cliffhangers, character, platform format, or Korean register and I'll give you the studio rule. For free-form direction, add an API key in Settings — the full showrunner protocol (in the Protocol Library) is sent with every request.`;
}
