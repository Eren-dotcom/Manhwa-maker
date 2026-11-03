import { useMemo, useState } from 'react';
import { Badge, Btn, Card, Icon, SectionHead } from '../components/ui';
import { renderMarkdown } from '../lib/markdown';
import { copyText, download, slug } from '../lib/export';
import { useStudio } from '../store/studio';
import { MASTER_PROTOCOL } from '../ai/protocol';

const docModules = import.meta.glob('../../docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const protoModules = import.meta.glob('../../protocols/*', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

interface Doc {
  path: string;
  file: string;
  title: string;
  group: 'Craft' | 'Protocol';
  body: string;
  raw: string;
  words: number;
}

function buildDocs(): Doc[] {
  const list: Doc[] = [];
  const add = (modules: Record<string, string>, group: Doc['group']) => {
    Object.entries(modules).forEach(([path, raw]) => {
      const file = path.split('/').pop() ?? path;
      const isJson = file.endsWith('.json');
      let body = raw;
      let title = file.replace(/\.(md|json)$/, '');
      if (isJson) {
        try {
          body = '```json\n' + JSON.stringify(JSON.parse(raw), null, 2) + '\n```';
        } catch {
          body = '```\n' + raw + '\n```';
        }
        title = title.replace(/-/g, ' ');
      } else {
        const h1 = raw.match(/^#\s+(.*)$/m);
        if (h1) title = h1[1].replace(/\s*[·—]\s*/, ' · ');
      }
      list.push({
        path,
        file,
        title: title.replace(/^\d+\s*·\s*/, ''),
        group,
        body,
        raw,
        words: raw.split(/\s+/).filter(Boolean).length,
      });
    });
  };
  add(docModules, 'Craft');
  add(protoModules, 'Protocol');
  return list.sort((a, b) => a.file.localeCompare(b.file));
}

export function Library() {
  const { toast } = useStudio();
  const docs = useMemo(buildDocs, []);
  const [activePath, setActivePath] = useState(docs[0]?.path ?? '');
  const [query, setQuery] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const active = docs.find((d) => d.path === activePath) ?? docs[0];

  const grouped = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = q
      ? docs.filter((d) => d.title.toLowerCase().includes(q) || d.raw.toLowerCase().includes(q))
      : docs;
    return {
      Craft: filtered.filter((d) => d.group === 'Craft'),
      Protocol: filtered.filter((d) => d.group === 'Protocol'),
    };
  }, [docs, query]);

  return (
    <div className="stack gap-20">
      <SectionHead
        eyebrow="Reference"
        title="Protocol library"
        desc="The craft doctrine shipped with the studio — the same rules the AI director is given, written for humans. Ten chapters, five machine-readable protocols, one cheat sheet."
        right={
          <>
            <Btn
              variant="ghost"
              icon="download"
              onClick={() => {
                const combined = docs.map((d) => `\n\n<!-- ${d.file} -->\n\n${d.raw}`).join('\n');
                download('manhwa-maker-protocol-library.md', `# Manhwa Maker — protocol library\n${combined}`, 'text/markdown');
              }}
            >
              Download all
            </Btn>
            <Btn variant="primary" icon="key" onClick={() => setShowPrompt(true)}>
              System prompt
            </Btn>
          </>
        }
      />

      <Card className="prompt-hero">
        <div className="row between wrap gap-12">
          <div>
            <div className="eyebrow">The director’s brief</div>
            <h3 style={{ fontSize: 18, marginTop: 4 }}>What the AI actually receives</h3>
            <p className="small muted" style={{ marginTop: 6, maxWidth: '70ch' }}>
              Every AI call in this studio is preceded by a condensed showrunner protocol plus your live project context.
              It is the single most important prompt in the product — read it, argue with it, fork it.
            </p>
          </div>
          <div className="row gap-8">
            <Btn
              size="sm"
              variant="soft"
              icon="copy"
              onClick={async () => {
                const ok = await copyText(MASTER_PROTOCOL);
                toast(ok ? 'System prompt copied — paste into any model' : 'Copy failed', ok ? 'ok' : 'err');
              }}
            >
              Copy
            </Btn>
            <Btn size="sm" variant="ghost" icon={showPrompt ? 'chevronDown' : 'chevron'} onClick={() => setShowPrompt((v) => !v)}>
              {showPrompt ? 'Hide' : 'Read'}
            </Btn>
          </div>
        </div>
        {showPrompt && <pre className="prompt-block system-prompt">{MASTER_PROTOCOL}</pre>}
      </Card>

      <div className="library-layout">
        <aside className="library-list">
          <div className="search" style={{ marginBottom: 12 }}>
            <Icon name="search" size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the doctrine…" />
          </div>
          {(['Craft', 'Protocol'] as const).map((group) => (
            <div key={group} className="library-group">
              <div className="eyebrow" style={{ padding: '4px 8px 8px' }}>{group}</div>
              {grouped[group].map((d) => (
                <button
                  key={d.path}
                  className={`library-item ${d.path === active?.path ? 'is-on' : ''}`}
                  onClick={() => {
                    setActivePath(d.path);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span className="li-dot" data-group={d.group} />
                  <span className="li-title">{d.title}</span>
                  <span className="li-words">{d.words > 999 ? `${Math.round(d.words / 100) / 10}k` : d.words}</span>
                </button>
              ))}
              {!grouped[group].length && <div className="tiny dim" style={{ padding: '4px 8px' }}>Nothing matches.</div>}
            </div>
          ))}
          <div className="library-foot">
            <Icon name="info" size={13} />
            <span className="tiny dim">
              Markdown lives in <code>/docs</code> and JSON in <code>/protocols</code> — edit them and the studio updates.
            </span>
          </div>
        </aside>

        <article className="library-content">
          {active ? (
            <>
              <div className="library-content-head">
                <div className="row gap-8 wrap">
                  <Badge tone={active.group === 'Craft' ? 'accent' : 'info'}>{active.group}</Badge>
                  <Badge>{active.file}</Badge>
                  <Badge>{active.words} words</Badge>
                  <Badge>~{Math.max(1, Math.round(active.words / 220))} min</Badge>
                </div>
                <div className="row gap-6">
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon="copy"
                    onClick={async () => {
                      const ok = await copyText(active.raw);
                      toast(ok ? 'Document copied' : 'Copy failed', ok ? 'ok' : 'err');
                    }}
                  >
                    Copy
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon="download"
                    onClick={() => download(`manhwa-${slug(active.title)}.${active.file.split('.').pop()}`, active.raw)}
                  >
                    Save
                  </Btn>
                </div>
              </div>
              <div className="md-body library-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }} />
            </>
          ) : (
            <Card>No documents found.</Card>
          )}
        </article>
      </div>
    </div>
  );
}
