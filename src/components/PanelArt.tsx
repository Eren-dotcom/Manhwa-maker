import React, { useMemo, useRef } from 'react';
import type { Bubble, Panel, Project } from '../store/types';
import { lookOf, paletteOf } from '../lib/prompt';
import { useStudio } from '../store/studio';
import { cx } from './ui';

// ---------------------------------------------------------------------------
// Storyboard art. Before a render exists (or when you have no image key at
// all), every panel is drawn as a deterministic blueprint frame from the style
// lock: palette, composition, shot scale and framing. It is not a placeholder
// box — it is a readable blocking frame.
// ---------------------------------------------------------------------------

function prng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const isLightLook = (lookId: string) => /pastel|romance/.test(lookId);

// Local-space silhouettes, drawn around a 800-wide canvas.
function figure(pose: 'bust' | 'full' | 'small' | 'child', fill: string, rim: string, opacity = 0.92) {
  if (pose === 'bust')
    return (
      <g fill={fill} opacity={opacity}>
        <ellipse cx={0} cy={-66} rx={47} ry={56} />
        <rect x={-13} y={-18} width={26} height={30} />
        <path d="M-136 200 C-128 96 -62 52 0 52 C62 52 128 96 136 200 Z" />
        <path d="M-136 200 C-128 96 -62 52 0 52" fill="none" stroke={rim} strokeOpacity={0.5} strokeWidth={3} />
      </g>
    );
  if (pose === 'full')
    return (
      <g fill={fill} opacity={opacity}>
        <ellipse cx={0} cy={-330} rx={30} ry={36} />
        <path d="M-58 -282 C-40 -300 40 -300 58 -282 L52 -120 L-52 -120 Z" />
        <path d="M-44 -120 L-30 40 L-6 40 L-8 -120 Z" />
        <path d="M44 -120 L30 40 L6 40 L8 -120 Z" />
        <path d="M-56 -270 L-86 -140" stroke={fill} strokeWidth={17} strokeLinecap="round" />
        <path d="M56 -270 L86 -140" stroke={fill} strokeWidth={17} strokeLinecap="round" />
        <path d="M-58 -282 C-40 -300 40 -300 58 -282" fill="none" stroke={rim} strokeOpacity={0.5} strokeWidth={3} />
      </g>
    );
  if (pose === 'small')
    return (
      <g fill={fill} opacity={opacity}>
        <circle cx={0} cy={-108} r={13} />
        <path d="M-20 -92 L20 -92 L14 -30 L-14 -30 Z" />
        <path d="M-10 -30 L-12 20 M10 -30 L12 20" stroke={fill} strokeWidth={7} strokeLinecap="round" />
      </g>
    );
  return (
    <g fill={fill} opacity={opacity}>
      <circle cx={0} cy={-150} r={27} />
      <path d="M-30 -118 L30 -118 L48 10 L-48 10 Z" />
      <path d="M-14 10 L-16 58 M14 10 L16 58" stroke={fill} strokeWidth={9} strokeLinecap="round" />
      <path d="M-30 -110 L-58 -44 M30 -110 L58 -44" stroke={fill} strokeWidth={10} strokeLinecap="round" />
    </g>
  );
}

export function PanelArt({
  project,
  panel,
  showLabel = true,
  showGuides = false,
  className,
}: {
  project: Project;
  panel: Panel;
  showLabel?: boolean;
  showGuides?: boolean;
  className?: string;
}) {
  const look = lookOf(project);
  const pal = paletteOf(project);
  const light = isLightLook(look.id);
  const ink = light ? look.ink : '#0a0b0e';
  const H = Math.max(240, Math.round(800 * (panel.height || 1)));

  const art = useMemo(() => {
    const rand = prng(panel.no * 977 + project.style.seed);
    const inkFill = light ? 'rgba(48,42,38,.86)' : 'rgba(6,7,10,.92)';
    const rim = pal.colors[2] ?? '#ff5a3c';
    const c = pal.colors;
    const g1 = light ? c[0] : c[1] ?? '#1b2030';
    const g2 = light ? c[3] ?? c[2] : c[2] ?? '#3a4f66';

    const lightPos = (() => {
      switch (panel.composition) {
        case 'thirds':
          return { x: 0.66, y: 0.3 };
        case 'center':
        case 'symmetry':
          return { x: 0.5, y: 0.34 };
        case 'diagonal':
          return { x: 0.32, y: 0.28 };
        case 'negative-space':
          return { x: 0.74, y: 0.42 };
        case 'claustrophobic':
          return { x: 0.5, y: 0.5 };
        case 'leading-lines':
          return { x: 0.5, y: 0.2 };
        default:
          return { x: 0.6, y: 0.32 };
      }
    })();

    const subjectX = (() => {
      switch (panel.composition) {
        case 'thirds':
          return 0.64;
        case 'negative-space':
          return 0.24;
        case 'diagonal':
          return 0.36;
        case 'symmetry':
        case 'center':
          return 0.5;
        default:
          return 0.52;
      }
    })();

    const scale = (() => {
      switch (panel.shot) {
        case 'establishing':
          return 0.5;
        case 'wide':
          return 0.72;
        case 'full':
          return 1.15;
        case 'medium':
          return 1.55;
        case 'medium-close':
          return 2.05;
        case 'close-up':
          return 2.9;
        case 'extreme-close':
          return 4.4;
        case 'over-shoulder':
          return 2.2;
        case 'silhouette':
          return 1.5;
        case 'panel-less':
          return 1.9;
        default:
          return 1.5;
      }
    })();

    const groundY = panel.shot === 'close-up' || panel.shot === 'medium-close' ? H * 0.82 : H * 0.86;
    const pose: 'bust' | 'full' | 'small' | 'child' =
      panel.shot === 'establishing' ? 'small' : panel.shot === 'wide' || panel.shot === 'full' ? 'full' : panel.shot === 'medium' ? 'full' : 'bust';

    const twoFigures = panel.characterIds.length > 1;
    const showFace = !['establishing', 'wide', 'full', 'silhouette', 'panel-less'].includes(panel.shot);

    // environment blocks
    const blocks = Array.from({ length: 5 }).map((_, i) => {
      const w = 80 + rand() * 190;
      const hh = 90 + rand() * (H * 0.42);
      const x = rand() * (800 - w);
      const y = H * 0.9 - hh;
      return { w, hh, x, y, o: 0.1 + rand() * 0.16 };
    });

    return (
      <svg viewBox={`0 0 800 ${H}`} className="art-svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Storyboard panel ${panel.no}: ${panel.shot}`}>
        <defs>
          <linearGradient id={`bg${panel.id}`} x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor={g1} />
            <stop offset="58%" stopColor={g2} />
            <stop offset="100%" stopColor={light ? c[4] ?? c[2] : ink} />
          </linearGradient>
          <radialGradient id={`glow${panel.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={light ? '#fff8ea' : c[4] ?? '#ffd9a0'} stopOpacity="0.95" />
            <stop offset="45%" stopColor={c[2] ?? '#ff5a3c'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={c[2] ?? '#ff5a3c'} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`vig${panel.id}`} cx="50%" cy="48%" r="72%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor={light ? '#3a2c1e' : '#000'} stopOpacity={light ? 0.22 : 0.62} />
          </radialGradient>
          <linearGradient id={`diag${panel.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={rim} stopOpacity="0.35" />
            <stop offset="100%" stopColor={rim} stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width={800} height={H} fill={`url(#bg${panel.id})`} />

        {panel.setting.toLowerCase().includes('river') || panel.setting.toLowerCase().includes('water') ? (
          <rect y={H * 0.72} width={800} height={H * 0.28} fill={ink} opacity={0.35} />
        ) : null}

        {['establishing', 'wide', 'full', 'silhouette', 'panel-less'].includes(panel.shot) &&
          blocks.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.hh} rx={4} fill={ink} opacity={b.o} />
          ))}

        <ellipse cx={lightPos.x * 800} cy={lightPos.y * H} rx={Math.max(220, 800 * 0.36)} ry={Math.max(200, H * 0.3)} fill={`url(#glow${panel.id})`} />

        {panel.composition === 'diagonal' && <path d={`M0 0 L800 ${H * 0.9} L800 ${H} L0 ${H * 0.35} Z`} fill={`url(#diag${panel.id})`} />}

        {panel.shot === 'insert' ? (
          <g transform={`translate(${subjectX * 800} ${H * 0.52})`}>
            <ellipse cx={0} cy={0} rx={150} ry={175} fill={inkFill} opacity={0.9} />
            <ellipse cx={0} cy={0} rx={150} ry={175} fill="none" stroke={rim} strokeOpacity={0.55} strokeWidth={3} />
            <path d="M-110 -40 H110 M-110 20 H110 M-110 80 H110" stroke={light ? '#f4efe6' : '#0b0c10'} strokeOpacity={0.35} strokeWidth={4} />
            <path d="M-90 -140 H90" stroke={rim} strokeOpacity={0.6} strokeWidth={6} strokeLinecap="round" />
          </g>
        ) : panel.shot === 'extreme-close' ? (
          <g transform={`translate(400 ${H * 0.5})`}>
            <path d="M-210 -40 C-120 -130 120 -130 210 -40 C120 60 -120 60 -210 -40 Z" fill={light ? '#f6efe4' : '#0d1018'} stroke={ink} strokeWidth={5} />
            <circle cx={0} cy={-22} r={70} fill={inkFill} />
            <circle cx={0} cy={-22} r={70} fill="none" stroke={rim} strokeOpacity={0.6} strokeWidth={4} />
            <circle cx={-22} cy={-46} r={16} fill="#fff" opacity={0.85} />
            <path d="M-230 -90 C-130 -170 130 -170 230 -90" fill="none" stroke={ink} strokeWidth={14} strokeLinecap="round" />
          </g>
        ) : (
          <g transform={`translate(${subjectX * 800} ${groundY}) scale(${scale})`}>
            {twoFigures && (
              <g transform={`translate(${panel.shot === 'wide' || panel.shot === 'full' ? 150 : 0} 0)`} opacity={0.85}>
                {figure(pose === 'small' ? 'small' : 'bust', inkFill, rim, 0.8)}
              </g>
            )}
            <g transform={`translate(${twoFigures && panel.shot !== 'wide' ? -120 : 0} 0)`}>
              {figure(pose, inkFill, rim)}
              {showFace ? (
                <g opacity={0.55}>
                  <ellipse cx={-16} cy={-78} rx={5} ry={4} fill={rim} />
                  <ellipse cx={18} cy={-78} rx={5} ry={4} fill={rim} />
                </g>
              ) : null}
            </g>
          </g>
        )}

        {panel.shot === 'silhouette' && (
          <ellipse cx={subjectX * 800} cy={H * 0.36} rx={210} ry={210} fill={`url(#glow${panel.id})`} opacity={0.8} />
        )}

        {['dutch', 'low', 'worms'].includes(panel.angle) && (
          <g opacity={0.16} stroke={light ? '#2b2622' : '#fff'}>
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={i} x1={-100 + i * 130} y1={H} x2={120 + i * 130} y2={0} strokeWidth={2} />
            ))}
          </g>
        )}

        <rect width={800} height={H} fill={`url(#vig${panel.id})`} />

        {showGuides && (
          <g stroke={light ? '#2b2622' : '#fff'} strokeOpacity={0.28} strokeWidth={1.5}>
            <line x1={800 / 3} y1={0} x2={800 / 3} y2={H} strokeDasharray="8 10" />
            <line x1={(800 / 3) * 2} y1={0} x2={(800 / 3) * 2} y2={H} strokeDasharray="8 10" />
            <line x1={0} y1={H / 3} x2={800} y2={H / 3} strokeDasharray="8 10" />
            <line x1={0} y1={(H / 3) * 2} x2={800} y2={(H / 3) * 2} strokeDasharray="8 10" />
            <rect x={64} y={52} width={672} height={H - 140} fill="none" strokeOpacity={0.22} />
          </g>
        )}

        {showLabel && (
          <g fontFamily="ui-monospace, SFMono-Regular, monospace" fill={light ? '#2b2622' : '#f4efe6'}>
            <text x={22} y={H - 22} fontSize={17} letterSpacing={2.6} opacity={0.66}>
              {panel.shot.toUpperCase()} · {panel.angle.toUpperCase()}
            </text>
            <text x={778} y={H - 22} fontSize={17} letterSpacing={2.6} opacity={0.5} textAnchor="end">
              P{String(panel.no).padStart(2, '0')}
            </text>
          </g>
        )}
      </svg>
    );
  }, [panel, project.style.seed, light, pal, look.id, showGuides, showLabel]);

  return <div className={cx('panel-art', className)}>{art}</div>;
}

// ---------------------------------------------------------------------------
// Lettering layer
// ---------------------------------------------------------------------------
export function Balloon({
  b,
  selected,
  onSelect,
  onDrag,
  onDragEnd,
  interactive,
  order,
}: {
  b: Bubble;
  selected?: boolean;
  onSelect?: () => void;
  onDrag?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  interactive?: boolean;
  order?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelect?.();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !onDrag || !ref.current) return;
    const parent = ref.current.parentElement;
    if (!parent) return;
    const r = parent.getBoundingClientRect();
    const x = Math.min(94, Math.max(6, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(96, Math.max(4, ((e.clientY - r.top) / r.height) * 100));
    onDrag(x, y);
  };

  const stop = () => {
    if (!dragging.current) return;
    dragging.current = false;
    onDragEnd?.();
  };

  return (
    <div
      ref={ref}
      className={cx('balloon', `b-${b.kind}`, `tail-${b.tail}`, `s-${b.size}`, interactive && 'is-draggable', selected && 'is-selected')}
      style={{ left: `${b.x}%`, top: `${b.y}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <span>{b.text}</span>
      {b.speaker && b.kind !== 'narration' && <em className="spk">{b.speaker}</em>}
      {order != null && <span className="balloon-order">{order}</span>}
    </div>
  );
}

export function SfxTag({ s }: { s: { text: string; x: number; y: number; style: string; rotation: number; scale: number } }) {
  return (
    <span
      className={cx('sfx', `sfx-${s.style}`)}
      style={{
        left: `${s.x}%`,
        top: `${s.y}%`,
        transform: `translate(-50%,-50%) rotate(${s.rotation}deg) scale(${s.scale})`,
      }}
    >
      {s.text}
    </span>
  );
}

export function ArtStage({
  project,
  panel,
  interactive,
  selectedBubble,
  onSelectBubble,
  onMoveBubble,
  onCommit,
  showGuides,
  showLabel = true,
  maxWidth,
  scale = 1,
}: {
  project: Project;
  panel: Panel;
  interactive?: boolean;
  selectedBubble?: string | null;
  onSelectBubble?: (id: string) => void;
  onMoveBubble?: (id: string, x: number, y: number) => void;
  onCommit?: () => void;
  showGuides?: boolean;
  showLabel?: boolean;
  maxWidth?: number;
  scale?: number;
}) {
  const { resolve } = useStudio();
  const src = resolve(panel.image);
  return (
    <div
      className={cx('art-stage', panel.fullBleed && 'is-bleed')}
      style={{
        aspectRatio: `800 / ${Math.round(800 * (panel.height || 1))}`,
        maxWidth,
        ['--balloon-scale' as string]: scale,
      }}
    >
      {src ? (
        <img className="art-img" src={src} alt={`Panel ${panel.no}`} draggable={false} />
      ) : (
        <PanelArt project={project} panel={panel} showGuides={showGuides} showLabel={showLabel} />
      )}
      {panel.caption && <div className="caption">{panel.caption}</div>}
      {panel.sfx.map((s) => (
        <SfxTag key={s.id} s={s} />
      ))}
      {panel.bubbles.map((b, i) => (
        <Balloon
          key={b.id}
          b={b}
          order={interactive ? b.order || i + 1 : undefined}
          interactive={interactive}
          selected={selectedBubble === b.id}
          onSelect={() => onSelectBubble?.(b.id)}
          onDrag={(x, y) => onMoveBubble?.(b.id, x, y)}
          onDragEnd={onCommit}
        />
      ))}
      <div className="art-tag">{panel.fullBleed ? 'FULL BLEED' : `${Math.round((panel.height || 1) * 100)}% height`}</div>
    </div>
  );
}
