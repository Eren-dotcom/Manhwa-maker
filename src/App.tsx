import { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from './store/studio';
import { STAGES } from './store/constants';
import type { StageId } from './store/types';
import { auditProject, qcScore } from './lib/qc';
import { Badge, Btn, Icon, IconBtn, Modal } from './components/ui';
import { download } from './lib/export';
import { Copilot } from './components/Copilot';
import { NavCtx } from './components/nav';
import { SettingsModal } from './components/SettingsModal';
import { Overview } from './views/Overview';
import { Concept } from './views/Concept';
import { Bible } from './views/Bible';
import { Beats } from './views/Beats';
import { Panels } from './views/Panels';
import { Prompts } from './views/Prompts';
import { RenderView } from './views/Render';
import { Lettering } from './views/Lettering';
import { PreviewView } from './views/Preview';
import { QcView } from './views/Qc';
import { Library } from './views/Library';

export type Route = 'overview' | StageId | 'preview' | 'library';

const ROUTE_LABEL: Record<string, string> = {
  overview: 'Overview',
  preview: 'Reader preview',
  library: 'Protocol library',
};

const isStage = (r: Route): r is StageId => STAGES.some((s) => s.id === r);

export function App() {
  const { project, saveState, undo, redo, canUndo, canRedo, projects, toasts } = useStudio();
  const [route, setRoute] = useState<Route>(() => {
    const h = window.location.hash.replace('#', '') as Route;
    if (h && (h === 'overview' || h === 'preview' || h === 'library' || isStage(h))) return h;
    return 'overview';
  });
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    window.location.hash = route;
  }, [route]);

  const issues = useMemo(() => auditProject(project), [project]);
  const score = useMemo(() => qcScore(issues), [issues]);
  const ep = project.episodes.find((e) => e.id === project.activeEpisodeId) ?? project.episodes[0];
  const stageIssues = (id: StageId) => issues.filter((i) => i.stage === id && i.level !== 'info');
  const gateDone = (id: StageId) => Boolean(project.gates[id]);

  const go = (r: Route) => {
    setRoute(r);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = (r: string) => go(r as Route);

  return (
    <div className="app">
      <div className={`mobile-scrim ${navOpen ? 'is-open' : ''}`} onClick={() => setNavOpen(false)} />

      <aside className={`sidebar ${navOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <div className="brand-text">
            <span className="brand-name">Manhwa Maker</span>
            <span className="brand-sub">AI Production Studio</span>
          </div>
        </div>

        <button className="project-switch" onClick={() => setProjectsOpen(true)}>
          <span className="ps-avatar">{(project.meta.title || 'M')[0]}</span>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="ps-title" style={{ display: 'block' }}>{project.meta.title || 'Untitled'}</span>
            <span className="ps-meta">{project.meta.genre} · EP {ep?.no ?? 1}</span>
          </span>
          <Icon name="chevronDown" size={14} className="dim" />
        </button>

        <nav className="nav">
          <button className={`nav-item ${route === 'overview' ? 'is-active' : ''}`} onClick={() => go('overview')}>
            <Icon name="grid" size={15} className="nav-icon" />
            <span className="nav-label">Overview</span>
            {score < 85 && <span className="nav-badge">{score}</span>}
          </button>

          <div className="nav-group">Production</div>
          {STAGES.map((s) => {
            const n = stageIssues(s.id).length;
            return (
              <button
                key={s.id}
                className={`nav-item ${route === s.id ? 'is-active' : ''}`}
                onClick={() => go(s.id)}
                title={s.desc}
              >
                <span className="nav-num">{s.n}</span>
                <span className="nav-label">{s.label}</span>
                {n > 0 && <span className="nav-badge">{n}</span>}
                <span className={`nav-state ${gateDone(s.id) ? (n ? 'is-warn' : 'is-done') : ''}`} />
              </button>
            );
          })}

          <div className="nav-group">Review</div>
          <button className={`nav-item ${route === 'preview' ? 'is-active' : ''}`} onClick={() => go('preview')}>
            <Icon name="eye" size={15} className="nav-icon" />
            <span className="nav-label">Reader preview</span>
          </button>
          <button className={`nav-item ${route === 'library' ? 'is-active' : ''}`} onClick={() => go('library')}>
            <Icon name="book" size={15} className="nav-icon" />
            <span className="nav-label">Protocol library</span>
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className="save-line">
            <span className={`save-dot ${saveState}`} />
            {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Local storage full' : 'All changes saved locally'}
          </div>
          <div className="row gap-6">
            <Btn
              size="sm"
              variant="ghost"
              icon="spark"
              onClick={() => setCopilotOpen((v) => !v)}
              style={{ flex: 1, justifyContent: 'flex-start' }}
            >
              AI Director
            </Btn>
            <IconBtn icon="settings" label="Settings" onClick={() => setSettingsOpen(true)} />
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setNavOpen(true)} aria-label="Menu">
            <Icon name="grid" size={17} />
          </button>
          <div className="crumbs">
            <strong>{project.meta.title}</strong>
            <span className="sep">/</span>
            <span>{isStage(route) ? STAGES.find((s) => s.id === route)?.label : ROUTE_LABEL[route]}</span>
          </div>
          <div className="topbar-actions">
            <IconBtn icon="undo" label="Undo (⌘Z)" onClick={undo} disabled={!canUndo} />
            <IconBtn icon="redo" label="Redo (⇧⌘Z)" onClick={redo} disabled={!canRedo} />
            <span className="topbar-divider" />
            <Btn size="sm" variant="ghost" icon="book" onClick={() => go('preview')}>Reader</Btn>
            <Btn size="sm" variant={copilotOpen ? 'soft' : 'ghost'} icon="spark" onClick={() => setCopilotOpen((v) => !v)}>
              Director
            </Btn>
            <Btn size="sm" variant="ghost" icon="download" onClick={() => go('qc')}>
              Export
            </Btn>
          </div>
        </header>

        <NavCtx.Provider value={navigate}>
        <main className="content">
          {route === 'overview' && <Overview onNavigate={navigate} issues={issues} score={score} onOpenCopilot={() => setCopilotOpen(true)} />}
          {route === 'concept' && <Concept />}
          {route === 'bible' && <Bible />}
          {route === 'beats' && <Beats />}
          {route === 'panels' && <Panels />}
          {route === 'prompts' && <Prompts />}
          {route === 'render' && <RenderView />}
          {route === 'lettering' && <Lettering />}
          {route === 'preview' && <PreviewView />}
          {route === 'qc' && <QcView issues={issues} score={score} />}
          {route === 'library' && <Library />}
        </main>
        </NavCtx.Provider>
      </div>

      <Copilot open={copilotOpen} onClose={() => setCopilotOpen(false)} onNavigate={navigate} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Modal open={projectsOpen} onClose={() => setProjectsOpen(false)} title="Projects" wide>
        <ProjectList onClose={() => setProjectsOpen(false)} onNew={() => { setProjectsOpen(false); }} />
        <p className="field-hint" style={{ marginTop: 14 }}>
          Projects live in this browser (localStorage + IndexedDB for images). Export a project to move it or back it up.
        </p>
      </Modal>

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="dot" />
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectList({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
  const { projects, activeId, setActive, newProject, duplicate, remove, loadDemo, importProject, toast } = useStudio();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="stack gap-10">
      {projects.map((p) => {
        const ep = p.episodes.find((e) => e.id === p.activeEpisodeId) ?? p.episodes[0];
        return (
          <div key={p.id} className={`project-row ${p.id === activeId ? 'is-active' : ''}`}>
            <div className="ps-avatar" style={{ width: 34, height: 34 }}>{(p.meta.title || 'M')[0]}</div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row gap-8" style={{ alignItems: 'center' }}>
                <strong style={{ fontSize: 13.5 }}>{p.meta.title}</strong>
                {p.demo && <Badge tone="accent">Reference</Badge>}
              </div>
              <div className="tiny dim">
                {p.meta.genre} · {p.meta.platform} · EP{ep?.no ?? 1} “{ep?.title}” · {ep?.panels.length ?? 0} panels
              </div>
            </div>
            <div className="row gap-4">
              <Btn size="sm" variant="ghost" onClick={() => { setActive(p.id); onClose(); }}>Open</Btn>
              <IconBtn icon="copy" label="Duplicate" onClick={() => duplicate(p.id)} />
              <IconBtn icon="trash" label="Delete" onClick={() => remove(p.id)} />
            </div>
          </div>
        );
      })}
      <div className="row gap-8 wrap" style={{ marginTop: 6 }}>
        <Btn icon="plus" variant="primary" onClick={() => { newProject(); onNew(); }}>New project</Btn>
        <Btn icon="layers" onClick={() => { loadDemo(); onClose(); }}>Load reference project</Btn>
        <Btn icon="upload" onClick={() => fileRef.current?.click()}>Import JSON</Btn>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const result = importProject(await file.text());
            toast(result.message, result.ok ? 'ok' : 'err');
            if (result.ok) onClose();
            e.target.value = '';
          }}
        />
        <Btn
          icon="download"
          onClick={() => download('manhwa-studio-projects.json', JSON.stringify(projects, null, 2), 'application/json')}
        >
          Export all
        </Btn>
      </div>
    </div>
  );
}
