import { useEffect, useRef, useState } from 'react';
import { useStudio } from '../store/studio';
import { runAction } from '../ai/engine';
import { renderMarkdown } from '../lib/markdown';
import { PROVIDER_LABEL } from '../ai/providers';
import { Btn, Icon, IconBtn, TextArea } from './ui';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
}

const QUICK = [
  'What is wrong with my episode rhythm?',
  'Rewrite my cliffhanger so it costs the hero something.',
  'How do I keep the art consistent across 40 panels?',
  'Give me three hooks that are images, not explanations.',
  'Audit this episode as a platform editor.',
];

export function Copilot({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (r: string) => void;
}) {
  const { project, toast } = useStudio();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const offline = project.ai.provider === 'offline' || !project.ai.apiKey.trim();

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, busy, open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const res = await runAction('chat', project, project.ai, q);
      if (res.ok && res.text) {
        setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', text: res.text!, meta: res.message }]);
      } else {
        toast(res.message, 'err');
        setMessages((m) => [
          ...m,
          { id: `e${Date.now()}`, role: 'assistant', text: `**Request failed.** ${res.message}` },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={`drawer-scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`copilot ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <header className="copilot-head">
          <div className="row gap-10">
            <div className="copilot-avatar"><Icon name="spark" size={16} /></div>
            <div>
              <div className="copilot-title">AI Director</div>
              <div className="tiny dim">
                {PROVIDER_LABEL[project.ai.provider]} · {offline ? 'protocol engine' : project.ai.model}
              </div>
            </div>
          </div>
          <IconBtn icon="close" label="Close" onClick={onClose} />
        </header>

        <div className="copilot-presets">
          <span className="eyebrow">Ask</span>
          <div className="stack gap-6" style={{ marginTop: 8 }}>
            {QUICK.map((q) => (
              <button key={q} className="preset" onClick={() => send(q)}>
                <Icon name="chevron" size={12} />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="copilot-log" ref={scroller}>
          {messages.length === 0 && (
            <div className="copilot-intro">
              <p>
                I have your project context, the showrunner protocol and every panel in view. Ask about rhythm, hooks,
                lettering, continuity or platform fit.
              </p>
              {offline && (
                <div className="notice">
                  <Icon name="info" size={14} />
                  <span>
                    Offline mode: answers come from the built-in field manual. Add a key in Settings for free-form
                    direction — the full protocol is sent with every request.
                  </span>
                </div>
              )}
              <div className="row gap-6 wrap" style={{ marginTop: 12 }}>
                <Btn size="sm" variant="soft" icon="shield" onClick={() => onNavigate('qc')}>Open QC</Btn>
                <Btn size="sm" variant="ghost" icon="book" onClick={() => onNavigate('library')}>Read the protocol</Btn>
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.role === 'assistant' ? (
                <div className="msg-body md-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
              ) : (
                <div className="msg-body">{m.text}</div>
              )}
              {m.meta && m.role === 'assistant' && <div className="msg-meta">{m.meta}</div>}
            </div>
          ))}
          {busy && (
            <div className="msg assistant">
              <div className="msg-body typing"><span /><span /><span /></div>
            </div>
          )}
        </div>

        <div className="copilot-input">
          <TextArea
            ref={taRef}
            rows={2}
            placeholder="Direct the episode…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <Btn variant="primary" icon="arrow" loading={busy} onClick={() => void send(input)} aria-label="Send" />
        </div>
      </aside>
    </>
  );
}
