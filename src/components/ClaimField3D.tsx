import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import { useDeck } from '../deck/DeckContext';
import Reveal from '../deck/Reveal';
import { CLAIMS, type ClaimNode } from '../data/claims';

/* The claim field — every ledger claim as a point in a drag-to-rotate 3D
   cloud. x = registration day, y = stated confidence, z = frame (in/out
   split into two planes). Hand-built perspective projection on canvas,
   zero dependencies, all colors probed from the theme tokens. */

function probe(cssVar: string): [number, number, number] {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;visibility:hidden;color:var(${cssVar})`;
  document.body.appendChild(el);
  const m = getComputedStyle(el).color.match(/[\d.]+/g);
  el.remove();
  if (!m || m.length < 3) return [128, 128, 128];
  return [+m[0], +m[1], +m[2]];
}
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

type P3 = { c: ClaimNode; x: number; y: number; z: number };

const MAX_DAY = 36;
const pts: P3[] = CLAIMS.map((c) => ({
  c,
  x: (c.day / MAX_DAY) * 2.4 - 1.2,
  y: ((c.conf - 0.3) / 0.65) * 1.5 - 0.75,
  z:
    c.frame === 'in'
      ? -0.55 + c.jz * 0.3
      : c.frame === 'out'
        ? 0.55 + c.jz * 0.3
        : c.jz * 0.3,
}));

export default function ClaimField3D({
  kicker,
  title,
  foot,
}: {
  kicker?: string;
  title: ReactNode;
  foot?: string;
  nav?: string;
  notes?: string;
}) {
  const { isStatic } = useDeck();
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<ClaimNode | null>(null);
  const [tipXY, setTipXY] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const fg = probe('--fg');
    const muted = probe('--fg-muted');
    const faint = probe('--fg-faint');
    const primary = probe('--primary');
    const hairA = 0.35;

    const drag = { down: false, sx: 0, sy: 0, yaw0: 0, pitch0: 0 };
    let yaw = -0.5;
    let pitch = 0.32;
    let raf = 0;
    let mouse: [number, number] | null = null;
    let hovered: ClaimNode | null = null;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext('2d')!;

    function size() {
      const r = wrap!.getBoundingClientRect();
      canvas!.width = r.width * dpr;
      canvas!.height = r.height * dpr;
      canvas!.style.width = `${r.width}px`;
      canvas!.style.height = `${r.height}px`;
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);

    function project(p: { x: number; y: number; z: number }) {
      const cy = Math.cos(yaw),
        sy = Math.sin(yaw);
      const cx = Math.cos(pitch),
        sx = Math.sin(pitch);
      // rotate yaw (around Y), then pitch (around X)
      const x1 = p.x * cy + p.z * sy;
      const z1 = -p.x * sy + p.z * cy;
      const y2 = p.y * cx - z1 * sx;
      const z2 = p.y * sx + z1 * cx;
      const w = canvas!.width,
        h = canvas!.height;
      const scale = Math.min(w, h) * 0.36;
      const persp = 2.6 / (z2 + 3.4);
      return {
        sx: w / 2 + x1 * persp * scale,
        sy: h / 2 - y2 * persp * scale,
        depth: z2,
        persp,
      };
    }

    function draw() {
      const w = canvas!.width,
        h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      // ground grid (day x frame plane at y = -0.85)
      ctx.lineWidth = dpr;
      for (let gx = -1.2; gx <= 1.21; gx += 0.4) {
        const a = project({ x: gx, y: -0.85, z: -0.9 });
        const b = project({ x: gx, y: -0.85, z: 0.9 });
        ctx.strokeStyle = rgba(faint, 0.18);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
      for (let gz = -0.9; gz <= 0.91; gz += 0.45) {
        const a = project({ x: -1.2, y: -0.85, z: gz });
        const b = project({ x: 1.2, y: -0.85, z: gz });
        ctx.strokeStyle = rgba(faint, 0.18);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
      // confidence axis
      const a0 = project({ x: -1.2, y: -0.85, z: -0.9 });
      const a1 = project({ x: -1.2, y: 0.85, z: -0.9 });
      ctx.strokeStyle = rgba(muted, hairA);
      ctx.beginPath();
      ctx.moveTo(a0.sx, a0.sy);
      ctx.lineTo(a1.sx, a1.sy);
      ctx.stroke();

      const fs = 10 * dpr;
      ctx.font = `500 ${fs}px ui-monospace, monospace`;
      ctx.fillStyle = rgba(muted, 0.8);
      ctx.fillText('95%', a1.sx - 30 * dpr, a1.sy);
      ctx.fillText('30%', a0.sx - 30 * dpr, a0.sy);
      const lIn = project({ x: 1.35, y: -0.8, z: -0.55 });
      const lOut = project({ x: 1.35, y: -0.8, z: 0.55 });
      ctx.fillStyle = rgba(muted, 0.9);
      ctx.fillText('IN-FRAME', lIn.sx, lIn.sy);
      ctx.fillText('OUT-OF-FRAME', lOut.sx, lOut.sy);
      const t0 = project({ x: -1.2, y: -0.95, z: 0 });
      const t1 = project({ x: 1.2, y: -0.95, z: 0 });
      ctx.fillStyle = rgba(faint, 0.9);
      ctx.fillText('JUN 10', t0.sx, t0.sy + fs);
      ctx.fillText('JUL 16', t1.sx, t1.sy + fs);

      // points, far to near
      const proj = pts.map((p) => ({ p, s: project(p) }));
      proj.sort((m, n) => n.s.depth - m.s.depth);
      let best: { c: ClaimNode; d: number; x: number; y: number } | null = null;
      for (const { p, s } of proj) {
        const fog = 0.55 + 0.45 * Math.min(1, Math.max(0, (1.4 - s.depth) / 2.4));
        const r = (p.c.status === 'open' ? 4.4 : 5.4) * s.persp * dpr;
        if (p.c === hovered) {
          ctx.beginPath();
          ctx.arc(s.sx, s.sy, r + 5 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(primary, 0.65);
          ctx.lineWidth = 1.4 * dpr;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2);
        if (p.c.status === 'confirmed') {
          ctx.fillStyle = rgba(primary, fog);
          ctx.fill();
        } else if (p.c.status === 'disconfirmed') {
          ctx.fillStyle = rgba(fg, fog);
          ctx.fill();
          ctx.strokeStyle = rgba(primary, fog);
          ctx.lineWidth = 1.6 * dpr;
          ctx.stroke();
        } else if (p.c.status === 'invalidated') {
          ctx.strokeStyle = rgba(muted, fog * 0.9);
          ctx.lineWidth = 1.2 * dpr;
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = rgba(muted, fog * 0.55);
          ctx.fill();
        }
        if (mouse) {
          const d = Math.hypot(mouse[0] - s.sx, mouse[1] - s.sy);
          if (d < 16 * dpr && (!best || d < best.d))
            best = { c: p.c, d, x: s.sx, y: s.sy };
        }
      }
      if (mouse) {
        const next = best ? best.c : null;
        if (next !== hovered) {
          hovered = next;
          setHover(next);
        }
        if (best) setTipXY([best.x / dpr, best.y / dpr]);
      }
    }

    function frame() {
      if (!drag.down && !reduce && !hovered) yaw += 0.0028;
      draw();
      raf = requestAnimationFrame(frame);
    }

    if (isStatic) {
      draw();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onDown = (e: PointerEvent) => {
      drag.down = true;
      drag.sx = e.clientX;
      drag.sy = e.clientY;
      drag.yaw0 = yaw;
      drag.pitch0 = pitch;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = [
        (e.clientX - rect.left) * dpr,
        (e.clientY - rect.top) * dpr,
      ];
      if (drag.down) {
        yaw = drag.yaw0 + (e.clientX - drag.sx) * 0.006;
        pitch = Math.max(
          -0.2,
          Math.min(1.1, drag.pitch0 + (e.clientY - drag.sy) * 0.005)
        );
      }
    };
    const onUp = () => (drag.down = false);
    const onLeave = () => {
      mouse = null;
      hovered = null;
      setHover(null);
    };
    if (!isStatic) {
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointerleave', onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [isStatic, reduce]);

  const legend = [
    { label: 'confirmed', style: { background: 'var(--primary)' } },
    {
      label: 'disconfirmed',
      style: {
        background: 'var(--fg)',
        boxShadow: 'inset 0 0 0 2px var(--primary)',
      },
    },
    { label: 'open', style: { background: 'var(--fg-muted)', opacity: 0.55 } },
    {
      label: 'invalidated',
      style: { border: '1.5px dashed var(--fg-muted)', background: 'none' },
    },
  ];

  return (
    <div className="slide">
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
        }}
      >
        {kicker && (
          <Reveal>
            <div className="kicker" style={{ textAlign: 'center' }}>
              {kicker}
            </div>
          </Reveal>
        )}
        <Reveal delay={0.08}>
          <h2
            className="headline"
            style={{
              textAlign: 'center',
              marginInline: 'auto',
              maxWidth: '24ch',
              marginBottom: 8,
            }}
          >
            {title}
          </h2>
        </Reveal>
        <div
          ref={wrapRef}
          style={{ flex: 1, minHeight: 0, position: 'relative' }}
        >
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              cursor: 'grab',
              touchAction: 'none',
            }}
          />
          {hover && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(Math.max(tipXY[0], 130), 9999),
                top: tipXY[1] - 14,
                transform: 'translate(-50%, -100%)',
                maxWidth: 300,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)',
                border: '1px solid var(--hair)',
                boxShadow: 'var(--shadow)',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--primary)',
                  marginBottom: 4,
                }}
              >
                {Math.round(hover.conf * 100)}% · {hover.status} ·{' '}
                {hover.frame === 'in' ? 'in-frame' : 'out-of-frame'}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                {hover.short}
              </div>
            </div>
          )}
        </div>
        <Reveal delay={0.2}>
          <div
            style={{
              display: 'flex',
              gap: 18,
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              paddingTop: 10,
            }}
          >
            {legend.map((l) => (
              <span
                key={l.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 12.5,
                  color: 'var(--fg-muted)',
                }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    ...l.style,
                  }}
                />
                {l.label}
              </span>
            ))}
            {foot && (
              <span
                style={{
                  fontSize: 12.5,
                  color: 'var(--fg-faint)',
                  marginLeft: 6,
                }}
              >
                {foot}
              </span>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
