import { useMemo } from 'react';
import { useStudio } from '../store/studio';
import type { Beat, Episode } from '../store/types';
import { emptyEpisode, uid } from '../store/types';
import { Badge, Btn, Card, Field, Icon, IconBtn, SectionHead, Select, TextArea, TextInput } from '../components/ui';
import { StageNav } from '../components/StageNav';
import { useAction } from '../components/useAction';

const FN_LABEL: Record<Beat['fn'], string> = {
  hook: 'Hook',
  setup: 'Setup',
  cast: 'Cast',
  turn: 'Turn',
  escalate: 'Escalate',
  reveal: 'Reveal',
  breather: 'Breather',
  stinger: 'Stinger',
};

const FN_HINT: Record<Beat['fn'], string> = {
  hook: 'First 3 panels. Image + rule + a person breaking it.',
  setup: 'Teach the procedure before you break it.',
  cast: 'The relationship engine and the pressure.',
  turn: 'The inciting anomaly — a visual event, not a line.',
  escalate: 'Stakes at scale. Let the reader count.',
  reveal: 'Convert a world problem into a personal one.',
  breather: 'Release the pressure. Mandatory before the cliff.',
  stinger: 'Physical contact. Cut on it. No explanation.',
};

const TENSION = ['', '▮', '▮▮', '▮▮▮', '▮▮▮▮', '▮▮▮▮▮'];

export function Beats() {
  const { project, episode, update, toast } = useStudio();
  const { run, busy } = useAction();

  const ep = episode;
  const beats = ep?.beats ?? [];

  const mutateEp = (fn: (e: Episode) => void) =>
    update((p) => {
      const target = p.episodes.find((e) => e.id === p.activeEpisodeId) ?? p.episodes[0];
      if (target) fn(target);
    });

  const setBeat = (id: string, patch: Partial<Beat>) =>
    mutateEp((e) => {
      const i = e.beats.findIndex((b) => b.id === id);
      if (i >= 0) e.beats[i] = { ...e.beats[i], ...patch };
    });

  const moveBeat = (id: string, dir: -1 | 1) =>
    mutateEp((e) => {
      const i = e.beats.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= e.beats.length) return;
      [e.beats[i], e.beats[j]] = [e.beats[j], e.beats[i]];
      e.beats.forEach((b, k) => (b.unit = k + 1));
    });

  const removeBeat = (id: string) =>
    mutateEp((e) => {
      e.beats = e.beats.filter((b) => b.id !== id).map((b, k) => ({ ...b, unit: k + 1 }));
      e.panels.forEach((pn) => {
        if (pn.beatId === id) pn.beatId = null;
      });
    });

  const addBeat = () =>
    mutateEp((e) => {
      e.beats.push({
        id: uid('b'),
        unit: e.beats.length + 1,
        fn: 'setup',
        summary: '',
        purpose: '',
        tension: 3,
        scrollEnd: 'quiet',
        panelTarget: 4,
      });
    });

  const addEpisode = () => {
    update((p) => {
      const e = emptyEpisode(p.episodes.length + 1);
      p.episodes.push(e);
      p.activeEpisodeId = e.id;
    });
    toast('Episode added', 'ok');
  };

  const curve = useMemo(() => {
    if (!beats.length) return '';
    const w = 640;
    const h = 96;
    const step = beats.length > 1 ? w / (beats.length - 1) : w;
    const pts = beats.map((b, i) => [i * step, h - 10 - ((b.tension - 1) / 4) * (h - 30)]);
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${w},${h} L0,${h} Z`;
    return { line, area, pts, w, h, step };
  }, [beats]);

  const totalPanels = beats.reduce((n, b) => n + b.panelTarget, 0);
  const mappedPanels = ep?.panels.length ?? 0;

  return (
    <div className="stack gap-24">
      <SectionHead
        eyebrow="Stage 03 · Beat sheet"
        title="Episode rhythm"
        desc="Vertical scroll is paced in units, not pages. Eight units, each ending on a reason to keep scrolling — and the last one ends on a debt the reader has to pay."
        right={
          <>
            <Btn variant="ghost" icon="plus" onClick={addEpisode}>New episode</Btn>
            <Btn variant="primary" icon="spark" loading={busy === 'beats'} onClick={() => void run('beats')}>
              Write beat sheet
            </Btn>
          </>
        }
      />

      <div className="split">
        <div className="stack gap-16">
          <Card>
            <div className="row between wrap gap-10" style={{ marginBottom: 14 }}>
              <div className="row gap-10">
                <Select
                  value={ep?.id ?? ''}
                  onChange={(e) => update((p) => { p.activeEpisodeId = e.target.value; })}
                  style={{ width: 220 }}
                >
                  {project.episodes.map((e) => (
                    <option key={e.id} value={e.id}>EP {e.no} — {e.title}</option>
                  ))}
                </Select>
                <Badge tone={beats.length ? 'ok' : 'warn'}>{beats.length} beats</Badge>
                <Badge tone={mappedPanels ? 'info' : 'neutral'}>{mappedPanels} panels</Badge>
              </div>
              {project.episodes.length > 1 && (
                <IconBtn
                  icon="trash"
                  label="Delete episode"
                  onClick={() =>
                    update((p) => {
                      if (p.episodes.length <= 1) return;
                      p.episodes = p.episodes.filter((e) => e.id !== p.activeEpisodeId);
                      p.activeEpisodeId = p.episodes[0].id;
                    })
                  }
                />
              )}
            </div>

            <div className="form-grid">
              <Field label="Episode title">
                <TextInput value={ep?.title ?? ''} onChange={(e) => mutateEp((x) => { x.title = e.target.value; })} />
              </Field>
              <Field label="Target panels" hint="Naver/Kakao 45–70 · WEBTOON 30–50. Cost scales linearly.">
                <TextInput
                  type="number"
                  value={ep?.targetPanels ?? 40}
                  onChange={(e) => mutateEp((x) => { x.targetPanels = Number(e.target.value); })}
                />
              </Field>
            </div>

            <Field label="Episode logline">
              <TextArea rows={2} value={ep?.logline ?? ''} onChange={(e) => mutateEp((x) => { x.logline = e.target.value; })} />
            </Field>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <Field label="Opening hook" hint="What the reader sees before they decide.">
                <TextArea rows={2} value={ep?.hook ?? ''} onChange={(e) => mutateEp((x) => { x.hook = e.target.value; })} />
              </Field>
              <Field label="Cliffhanger" hint="Must cost something already shown on-screen.">
                <TextArea rows={2} value={ep?.cliffhanger ?? ''} onChange={(e) => mutateEp((x) => { x.cliffhanger = e.target.value; })} />
              </Field>
            </div>
          </Card>

          <Card className="curve-card">
            <div className="row between">
              <div>
                <div className="card-title" style={{ marginBottom: 2 }}>Tension curve</div>
                <div className="tiny dim">{totalPanels} panels planned · {mappedPanels} mapped</div>
              </div>
              <div className="row gap-6">
                {beats.map((b) => (
                  <span key={b.id} className="curve-chip" title={`${FN_LABEL[b.fn]} — tension ${b.tension}`}>
                    {FN_LABEL[b.fn].slice(0, 3)}
                  </span>
                ))}
              </div>
            </div>
            {beats.length > 0 && typeof curve === 'object' ? (
              <svg viewBox={`0 0 ${curve.w} ${curve.h}`} className="curve" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5a3c" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ff5a3c" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={curve.area} fill="url(#curveFill)" />
                <path d={curve.line} fill="none" stroke="#ff7a5c" strokeWidth={2} strokeLinejoin="round" />
                {curve.pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={4} fill="#0b0c10" stroke="#ff7a5c" strokeWidth={2} />
                ))}
                {curve.pts.map(([x], i) =>
                  beats[i].scrollEnd !== 'quiet' ? (
                    <line key={`l${i}`} x1={x} y1={0} x2={x} y2={curve.h} stroke="#ff5a3c" strokeOpacity={0.25} strokeDasharray="3 4" />
                  ) : null,
                )}
              </svg>
            ) : (
              <div className="tiny dim" style={{ padding: '20px 0' }}>No beats yet — generate a sheet to see the curve.</div>
            )}
            <div className="row gap-12 tiny dim" style={{ marginTop: 6 }}>
              <span>Soft ends: quiet</span>
              <span>Dashed: scroll turns / reveals / cliffs</span>
            </div>
          </Card>

          <div className="stack gap-12">
            {beats.map((b, idx) => (
              <Card key={b.id} className="beat-card">
                <div className="beat-rail">
                  <span className="beat-unit">U{b.unit}</span>
                  <span className="beat-tension" title={`Tension ${b.tension}`}>{TENSION[b.tension]}</span>
                </div>
                <div className="beat-body">
                  <div className="row gap-8 wrap" style={{ marginBottom: 8 }}>
                    <Select
                      value={b.fn}
                      onChange={(e) => setBeat(b.id, { fn: e.target.value as Beat['fn'] })}
                      style={{ width: 132, height: 30, fontSize: 12 }}
                    >
                      {Object.entries(FN_LABEL).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </Select>
                    <Select
                      value={String(b.tension)}
                      onChange={(e) => setBeat(b.id, { tension: Number(e.target.value) as Beat['tension'] })}
                      style={{ width: 104, height: 30, fontSize: 12 }}
                    >
                      {[1, 2, 3, 4, 5].map((t) => (
                        <option key={t} value={t}>Tension {t}</option>
                      ))}
                    </Select>
                    <Select
                      value={b.scrollEnd}
                      onChange={(e) => setBeat(b.id, { scrollEnd: e.target.value as Beat['scrollEnd'] })}
                      style={{ width: 128, height: 30, fontSize: 12 }}
                    >
                      <option value="quiet">Ends quiet</option>
                      <option value="turn">Scroll turn</option>
                      <option value="reveal">Reveal</option>
                      <option value="cliff">Cliffhanger</option>
                    </Select>
                    <div className="row gap-4" style={{ alignItems: 'center' }}>
                      <TextInput
                        type="number"
                        value={b.panelTarget}
                        onChange={(e) => setBeat(b.id, { panelTarget: Number(e.target.value) })}
                        style={{ width: 64, height: 30 }}
                        title="Panel target"
                      />
                      <span className="tiny dim">panels</span>
                    </div>
                    <div className="grow" />
                    <IconBtn icon="chevron" label="Move up" onClick={() => moveBeat(b.id, -1)} style={{ transform: 'rotate(-90deg)' }} disabled={idx === 0} />
                    <IconBtn icon="chevron" label="Move down" onClick={() => moveBeat(b.id, 1)} style={{ transform: 'rotate(90deg)' }} disabled={idx === beats.length - 1} />
                    <IconBtn icon="trash" label="Delete beat" onClick={() => removeBeat(b.id)} />
                  </div>
                  <TextArea
                    rows={2}
                    value={b.summary}
                    onChange={(e) => setBeat(b.id, { summary: e.target.value })}
                    placeholder="What happens, in one or two sentences. One visual event per beat."
                  />
                  <div className="beat-purpose">
                    <Icon name="info" size={12} />
                    <TextInput
                      className="ghost-input"
                      value={b.purpose}
                      onChange={(e) => setBeat(b.id, { purpose: e.target.value })}
                      placeholder={FN_HINT[b.fn]}
                    />
                  </div>
                  <div className="beat-foot">
                    <span className="tiny dim">
                      {ep?.panels.filter((p) => p.beatId === b.id).length || 0} panels mapped
                    </span>
                    {b.scrollEnd !== 'quiet' && <Badge tone="accent">{b.scrollEnd}</Badge>}
                  </div>
                </div>
              </Card>
            ))}
            {!beats.length && (
              <Card>
                <div className="empty-inline">
                  <strong>No beat sheet yet</strong>
                  <p className="small muted">Generate an eight-unit sheet, then rewrite it line by line. The engine gives you the skeleton; the tension is yours.</p>
                  <Btn icon="spark" variant="primary" loading={busy === 'beats'} onClick={() => void run('beats')}>Write beat sheet</Btn>
                </div>
              </Card>
            )}
            <Btn variant="ghost" icon="plus" onClick={addBeat} full>Add beat</Btn>
          </div>
        </div>

        <aside className="stack gap-14">
          <Card>
            <div className="eyebrow">Unit anatomy</div>
            <div className="stack gap-10" style={{ marginTop: 12 }}>
              {Object.entries(FN_HINT).map(([fn, hint]) => (
                <div key={fn} className="anatomy-row">
                  <span className={`anatomy-dot fn-${fn}`} />
                  <div>
                    <div className="small" style={{ fontWeight: 500 }}>{FN_LABEL[fn as Beat['fn']]}</div>
                    <div className="tiny dim">{hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="protocol-note">
            <div className="eyebrow">Pacing checks</div>
            <ul className="checklist">
              <li className={beats.some((b) => b.fn === 'breather') ? 'ok' : ''}>A breather before the cliff</li>
              <li className={beats.some((b) => b.scrollEnd === 'cliff') ? 'ok' : ''}>One cliffhanger on the last scroll</li>
              <li className={beats.filter((b) => b.scrollEnd !== 'quiet').length >= 3 ? 'ok' : ''}>2–3 scroll turns inside the episode</li>
              <li className={ep?.cliffhanger ? 'ok' : ''}>Cliffhanger written as an event, not a tease</li>
              <li className={beats.every((b) => b.summary) ? 'ok' : ''}>Every beat has a summary</li>
            </ul>
          </Card>

          <Card>
            <div className="eyebrow">Budget</div>
            <div className="kv-list" style={{ marginTop: 10 }}>
              <div><span>Planned panels</span><strong>{totalPanels}</strong></div>
              <div><span>Mapped panels</span><strong>{mappedPanels}</strong></div>
              <div><span>Scroll units</span><strong>{beats.length}</strong></div>
              <div><span>Words / panel target</span><strong>≤ 35</strong></div>
            </div>
          </Card>
        </aside>
      </div>

      <StageNav stage="beats" />
    </div>
  );
}
