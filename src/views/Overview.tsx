import { useMemo, useState } from 'react';
import { useStudio } from '../store/studio';
import { PLATFORMS, STAGES, LOOKS, GENRE_PRESETS } from '../store/constants';
import type { QcIssue, StageId } from '../store/types';
import { Badge, Btn, Card, Icon, ProgressRing } from '../components/ui';
import { PanelArt } from '../components/PanelArt';
import { AutoProduce } from '../components/AutoProduce';

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function Overview({
  onNavigate,
  issues,
  score,
  onOpenCopilot,
}: {
  onNavigate: (r: string) => void;
  issues: QcIssue[];
  score: number;
  onOpenCopilot: () => void;
}) {
  const { project, episode, duplicate, projects } = useStudio();
  const [autoOpen, setAutoOpen] = useState(false);
  const ep = episode;
  const panels = ep?.panels ?? [];

  const stats = useMemo(() => {
    const words = panels.reduce(
      (n, p) => n + p.bubbles.reduce((m, b) => m + wordCount(b.text), 0) + wordCount(p.caption),
      0,
    );
    const renders = panels.filter((p) => p.image).length;
    const units = ep?.beats.length ?? 0;
    const reviewed = panels.filter((p) => p.reviewed).length;
    return { words, renders, units, reviewed, panels: panels.length };
  }, [panels, ep]);

  const look = LOOKS.find((l) => l.id === project.style.lookId);
  const platform = PLATFORMS.find((p) => p.id === project.meta.platform);
  const preset = GENRE_PRESETS.find((g) => g.genre === project.meta.genre);

  const stageStatus = (id: StageId) => {
    const errs = issues.filter((i) => i.stage === id && i.level === 'error').length;
    const warns = issues.filter((i) => i.stage === id && i.level === 'warn').length;
    if (errs) return { tone: 'err' as const, label: `${errs} blocking` };
    if (warns) return { tone: 'warn' as const, label: `${warns} note${warns > 1 ? 's' : ''}` };
    if (project.gates[id]) return { tone: 'ok' as const, label: 'ready' };
    return { tone: 'neutral' as const, label: 'not started' };
  };

  const nextAction = useMemo(() => {
    const firstErr = issues.find((i) => i.level === 'error');
    if (firstErr) return { label: `Fix: ${firstErr.title}`, desc: firstErr.fix, route: firstErr.stage };
    const nextStage = STAGES.find((s) => !project.gates[s.id]);
    if (nextStage) return { label: `Continue: ${nextStage.label}`, desc: nextStage.desc, route: nextStage.id };
    const firstWarn = issues.find((i) => i.level === 'warn');
    if (firstWarn) return { label: `Polish: ${firstWarn.title}`, desc: firstWarn.fix, route: firstWarn.stage };
    return { label: 'Publish this episode', desc: 'Take the reader preview and export the pack.', route: 'qc' };
  }, [issues, project.gates]);

  const topIssues = issues.filter((i) => i.level !== 'info').slice(0, 4);

  return (
    <div className="overview stack gap-24">
      <section className="hero">
        <div className="hero-main">
          <div className="row gap-8 wrap" style={{ marginBottom: 12 }}>
            <Badge tone="accent" dot>{project.meta.genre}</Badge>
            <Badge>{platform?.name ?? project.meta.platform}</Badge>
            {project.meta.altTitle && <Badge tone="info">{project.meta.altTitle}</Badge>}
            {project.demo && <Badge tone="warn">Reference project</Badge>}
          </div>
          <h1 className="hero-title">{project.meta.title}</h1>
          <p className="hero-logline">{project.meta.logline || 'No logline yet — stage 1 will fix that in about thirty seconds.'}</p>
          <div className="hero-meta">
            <span><Icon name="film" size={13} /> EP {ep?.no ?? 1} · {ep?.title ?? 'Untitled'}</span>
            <span><Icon name="panel" size={13} /> {stats.panels} panels</span>
            <span><Icon name="type" size={13} /> {stats.words} words</span>
            <span><Icon name="image" size={13} /> {stats.renders} rendered</span>
          </div>
          <div className="row gap-8 wrap" style={{ marginTop: 20 }}>
            <Btn variant="primary" icon="arrow" onClick={() => onNavigate(nextAction.route)}>
              {nextAction.label}
            </Btn>
            <Btn icon="eye" onClick={() => onNavigate('preview')}>Read the episode</Btn>
            <Btn icon="wand" onClick={() => setAutoOpen(true)}>Auto-produce</Btn>
            <Btn icon="spark" variant="ghost" onClick={onOpenCopilot}>Ask the director</Btn>
            {project.demo && (
              <Btn icon="copy" variant="ghost" onClick={() => duplicate(project.id)}>Duplicate to edit</Btn>
            )}
          </div>
          <div className="next-hint">
            <span className="eyebrow">Next best action</span>
            <span className="muted small">{nextAction.desc}</span>
          </div>
        </div>

        <div className="hero-strip" aria-hidden>
          {(panels.slice(0, 3).length ? panels.slice(0, 3) : [null, null, null]).map((p, i) =>
            p ? (
              <div className="hero-frame" key={p.id} style={{ flex: `${p.height} 1 0` }}>
                <PanelArt project={project} panel={p} showLabel={false} />
              </div>
            ) : (
              <div className="hero-frame empty-frame" key={i}><span>Panel</span></div>
            ),
          )}
          <div className="hero-strip-caption">Vertical scroll · {project.style.width}px canvas</div>
        </div>
      </section>

      <div className="stat-row">
        <Stat label="Panels" value={String(stats.panels)} sub={`target ${ep?.targetPanels ?? '—'}`} />
        <Stat label="Scroll units" value={String(stats.units)} sub="beats planned" />
        <Stat label="Render coverage" value={`${stats.panels ? Math.round((stats.renders / stats.panels) * 100) : 0}%`} sub={`${stats.renders}/${stats.panels} panels`} />
        <Stat label="Word load" value={String(stats.words)} sub="spoken + captions" />
        <Stat label="Style lock" value={look?.name ?? '—'} sub={`${project.style.lineWeight} line`} small />
      </div>

      <div className="overview-grid">
        <div className="stack gap-16">
          <div className="row between" style={{ marginBottom: 2 }}>
            <h2 className="section-title" style={{ fontSize: 20 }}>Production pipeline</h2>
            <span className="tiny dim">8 stages · gated, not sequential</span>
          </div>
          <div className="pipeline-grid">
            {STAGES.map((s) => {
              const st = stageStatus(s.id);
              return (
                <button key={s.id} className="stage-card" onClick={() => onNavigate(s.id)}>
                  <div className="stage-card-top">
                    <span className="stage-num">{String(s.n).padStart(2, '0')}</span>
                    <span className={`stage-dot tone-${st.tone}`} />
                  </div>
                  <div className="stage-name">{s.label}</div>
                  <div className="stage-desc">{s.desc}</div>
                  <div className="stage-foot">
                    <span className={`tiny tone-text-${st.tone}`}>{st.label}</span>
                    <Icon name="arrow" size={13} className="dim" />
                  </div>
                </button>
              );
            })}
          </div>

          <Card className="rhythm-card">
            <div className="row between" style={{ marginBottom: 12 }}>
              <div>
                <div className="eyebrow">Scroll rhythm</div>
                <div className="small muted" style={{ marginTop: 3 }}>
                  Panel heights across the episode — flat bars mean a flat read.
                </div>
              </div>
              <Badge tone={score >= 85 ? 'ok' : score >= 65 ? 'warn' : 'err'}>{score}/100 QC</Badge>
            </div>
            <div className="rhythm-mini">
              {panels.map((p) => (
                <div
                  key={p.id}
                  className={`rhythm-bar ${p.fullBleed ? 'is-bleed' : ''}`}
                  style={{ height: `${Math.min(100, (p.height / 2.2) * 100)}%` }}
                  title={`P${p.no} · ${p.shot} · ${p.height}×`}
                />
              ))}
              {!panels.length && <div className="dim tiny">No panels yet.</div>}
            </div>
          </Card>
        </div>

        <aside className="stack gap-14">
          <Card className="qc-card">
            <div className="row gap-14">
              <ProgressRing value={score} size={64} />
              <div>
                <div className="eyebrow">Editorial audit</div>
                <div className="qc-headline">
                  {score >= 90 ? 'Ready to publish' : score >= 75 ? 'Publishable with notes' : score >= 55 ? 'Needs another pass' : 'Hold'}
                </div>
                <div className="tiny dim">{issues.filter((i) => i.level === 'error').length} blocking · {issues.filter((i) => i.level === 'warn').length} notes</div>
              </div>
            </div>
            <div className="stack gap-8" style={{ marginTop: 14 }}>
              {topIssues.map((i) => (
                <button key={i.id} className="issue-row" onClick={() => onNavigate(i.stage)}>
                  <span className={`issue-pip level-${i.level}`} />
                  <span className="grow">{i.title}</span>
                  <Icon name="chevron" size={12} className="dim" />
                </button>
              ))}
              {!topIssues.length && <div className="tiny muted">No structural problems found. Suspicious.</div>}
            </div>
            <Btn size="sm" variant="ghost" icon="shield" full style={{ marginTop: 12 }} onClick={() => onNavigate('qc')}>
              Open full audit
            </Btn>
          </Card>

          <Card>
            <div className="eyebrow">Format contract</div>
            <div className="kv-list" style={{ marginTop: 10 }}>
              <div><span>Canvas</span><strong>{platform?.canvas ?? '—'}</strong></div>
              <div><span>Cadence</span><strong>{platform?.cadence ?? '—'}</strong></div>
              <div><span>Panels / ep</span><strong>{platform?.panels ?? '—'}</strong></div>
              <div><span>Look</span><strong>{look?.name ?? '—'}</strong></div>
              <div><span>Seed</span><strong className="mono">{project.style.seed}</strong></div>
            </div>
          </Card>

          <Card>
            <div className="row between" style={{ marginBottom: 10 }}>
              <div className="eyebrow">Cast</div>
              <button className="link-btn" onClick={() => onNavigate('bible')}>Manage</button>
            </div>
            <div className="cast-strip">
              {project.cast.slice(0, 4).map((c) => (
                <div className="cast-chip" key={c.id} title={c.promptFragment}>
                  <span className="cast-avatar">{c.name.slice(0, 1)}</span>
                  <span className="cast-name">{c.name}</span>
                  <span className="cast-role">{c.role.slice(0, 4)}</span>
                </div>
              ))}
              {!project.cast.length && (
                <div className="tiny dim">No cast yet. The Bible stage builds them with visual anchors.</div>
              )}
            </div>
          </Card>

          <Card className="protocol-teaser">
            <div className="row gap-8" style={{ marginBottom: 8 }}>
              <Icon name="book" size={15} />
              <span className="eyebrow" style={{ color: 'var(--muted)' }}>Protocol library</span>
            </div>
            <p className="small muted" style={{ lineHeight: 1.6 }}>
              The full craft doctrine shipped with this studio: {preset ? preset.label : 'genre'} conventions, shot grammar,
              lettering law, prompt engineering, QC and platform delivery.
            </p>
            <Btn size="sm" variant="ghost" icon="arrow" onClick={() => onNavigate('library')} style={{ marginTop: 10, paddingLeft: 0 }}>
              Read the manual
            </Btn>
          </Card>
        </aside>
      </div>

      <AutoProduce open={autoOpen} onClose={() => setAutoOpen(false)} />

      <div className="stack gap-10">
        <div className="row between">
          <h2 className="section-title" style={{ fontSize: 20 }}>Your library</h2>
          <button className="link-btn" onClick={() => onNavigate('overview')}>{projects.length} projects</button>
        </div>
        <div className="project-strip">
          {projects.slice(0, 4).map((p) => (
            <div key={p.id} className={`mini-project ${p.id === project.id ? 'is-active' : ''}`}>
              <div className="mini-project-bar" style={{ background: LOOKS.find((l) => l.id === p.style.lookId)?.gradient }} />
              <div className="mini-project-body">
                <div className="small" style={{ fontWeight: 500 }}>{p.meta.title}</div>
                <div className="tiny dim">{p.meta.genre} · {(p.episodes[0]?.panels.length ?? 0)} panels</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <div className="stat">
      <div className="eyebrow">{label}</div>
      <div className={`stat-value ${small ? 'is-small' : ''}`}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
