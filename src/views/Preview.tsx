import { useMemo, useState } from 'react';
import { useStudio } from '../store/studio';
import { ArtStage } from '../components/PanelArt';
import { Badge, Btn, Card, Chips, Icon, SectionHead, Select, Toggle } from '../components/ui';
import { buildReaderHtml, download, slug } from '../lib/export';
import { LOOKS } from '../store/constants';

const WIDTHS = [
  { id: '380', label: 'Phone' },
  { id: '480', label: 'Large phone' },
  { id: '620', label: 'Tablet' },
  { id: '760', label: 'Desktop' },
];

export function PreviewView() {
  const { project, episode, update, assets, toast } = useStudio();
  const [width, setWidth] = useState('480');
  const [guides, setGuides] = useState(false);
  const [hideUnrendered, setHideUnrendered] = useState(false);
  const px = Number(width);
  const panels = episode?.panels ?? [];
  const visible = hideUnrendered ? panels.filter((p) => p.image) : panels;
  const look = LOOKS.find((l) => l.id === project.style.lookId) ?? LOOKS[0];
  const light = /pastel|romance/.test(look.id);

  const words = useMemo(
    () => panels.reduce((n, p) => n + p.bubbles.reduce((m, b) => m + b.text.split(/\s+/).filter(Boolean).length, 0), 0),
    [panels],
  );
  const scrollHeight = useMemo(
    () => visible.reduce((n, p) => n + p.gutter * (px / project.style.width) + px * p.height, 0),
    [visible, px, project.style.width],
  );

  const openStandalone = () => {
    const html = buildReaderHtml(project, episode, assets);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
    toast('Standalone reader opened in a new tab', 'ok');
  };

  return (
    <div className="stack gap-20">
      <SectionHead
        eyebrow="Reader preview"
        title="The scroll"
        desc="What the reader actually gets: a continuous vertical strip, gutters as breath, balloons in reading order. Everything below is live from your panels."
        right={
          <>
            <Btn
              variant="ghost"
              icon="download"
              onClick={() => download(`${slug(project.meta.title)}-ep${episode.no}.html`, buildReaderHtml(project, episode, assets), 'text/html')}
            >
              Export HTML
            </Btn>
            <Btn variant="primary" icon="external" onClick={openStandalone}>Open standalone</Btn>
          </>
        }
      />

      <Card className="reader-controls">
        <div className="row gap-10 wrap">
          <Select
            value={episode?.id ?? ''}
            onChange={(e) => update((p) => { p.activeEpisodeId = e.target.value; })}
            style={{ width: 210 }}
          >
            {project.episodes.map((e) => (
              <option key={e.id} value={e.id}>EP {e.no} — {e.title}</option>
            ))}
          </Select>
          <Chips options={WIDTHS} value={width} onChange={setWidth} size="sm" />
          <div className="grow" />
          <Toggle checked={guides} onChange={setGuides} label="Composition guides" />
          <Toggle checked={hideUnrendered} onChange={setHideUnrendered} label="Only rendered" />
        </div>
        <div className="reader-meta">
          <span><Icon name="film" size={12} /> {visible.length} panels</span>
          <span><Icon name="type" size={12} /> {words} words</span>
          <span><Icon name="clock" size={12} /> ~{Math.max(1, Math.round(words / 200))} min read</span>
          <span><Icon name="move" size={12} /> {Math.round((scrollHeight / 900) * 10) / 10} screens</span>
          <span className="grow" />
          <Badge tone="info">{project.style.width}px canvas</Badge>
        </div>
      </Card>

      <div className="reader-outer">
        <div className="reader-frame" style={{ width: px + 22 }}>
          <div className={`reader-strip ${light ? 'is-light' : 'is-dark'}`} style={{ width: px }}>
            <header className="reader-head">
              <div className="eyebrow">{project.meta.genre} · EP {episode?.no}</div>
              <h1>{project.meta.title}</h1>
              {project.meta.altTitle && <div className="reader-kr" style={{ fontFamily: 'var(--font-kr)' }}>{project.meta.altTitle}</div>}
              <p>{episode?.title} — {project.meta.logline}</p>
            </header>

            {visible.map((p) => (
              <div key={p.id} className="reader-panel" style={{ marginTop: p.gutter * (px / project.style.width) }}>
                <ArtStage project={project} panel={p} showGuides={guides} showLabel={false} scale={px / 800} />
              </div>
            ))}

            {!visible.length && (
              <div className="reader-empty">
                <p>{hideUnrendered ? 'No rendered panels yet. Turn off “Only rendered”, or render in stage 6.' : 'No panels yet.'}</p>
              </div>
            )}

            <footer className="reader-end">
              <div className="eyebrow">Next episode</div>
              <h2>{episode?.cliffhanger || 'The story continues.'}</h2>
              <div className="reader-badge">Made with Manhwa Maker Studio</div>
            </footer>
          </div>
        </div>

        <aside className="reader-side">
          <Card>
            <div className="eyebrow">Composition audit</div>
            <div className="stack gap-10" style={{ marginTop: 12 }}>
              <AuditRow ok={panels.every((p) => p.bubbles.length <= 3)} label="≤3 balloons per panel" />
              <AuditRow ok={panels.some((p) => p.fullBleed)} label="At least one full-bleed moment" />
              <AuditRow ok={new Set(panels.map((p) => p.shot)).size >= 5} label="Five or more shot types used" />
              <AuditRow ok={panels.some((p) => p.shot === 'close-up' || p.shot === 'extreme-close')} label="A reaction close-up exists" />
              <AuditRow ok={Boolean(episode?.cliffhanger)} label="Cliffhanger written" />
              <AuditRow ok={panels.length > 0 && Math.max(...panels.map((p) => p.height)) >= 1.4} label="A tall panel for the splash" />
            </div>
          </Card>

          <Card>
            <div className="eyebrow">Vertical rhythm</div>
            <div className="rhythm-vertical" style={{ marginTop: 12 }}>
              {panels.map((p) => (
                <div
                  key={p.id}
                  className={`rv-bar ${p.fullBleed ? 'is-bleed' : ''}`}
                  style={{ height: Math.max(6, p.height * 22) }}
                  title={`P${p.no} · ${p.height}×`}
                >
                  <span>{p.no}</span>
                </div>
              ))}
            </div>
            <p className="tiny dim" style={{ marginTop: 10 }}>
              Height in the strip, mirrored as bars. Long bars are held moments.
            </p>
          </Card>

          <Card className="protocol-note">
            <div className="eyebrow">Read it out loud</div>
            <p className="small muted" style={{ lineHeight: 1.6 }}>
              If a balloon takes more than one breath, it is two balloons. If a panel needs a caption to be understood, the
              image is not doing its job yet.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AuditRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="audit-row">
      <span className={`audit-pip ${ok ? 'ok' : ''}`}>{ok ? '✓' : '·'}</span>
      <span className={ok ? '' : 'dim'}>{label}</span>
    </div>
  );
}
