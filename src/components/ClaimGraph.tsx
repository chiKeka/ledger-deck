import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useDeck } from '../deck/DeckContext';
import Reveal from '../deck/Reveal';
import { CLAIMS, type ClaimNode } from '../data/claims';

/* The record as a graph — claims are nodes, the ledger's typed `related_to`
   entries are edges (shares-system / probes / sharpens / opposes). Live
   force simulation on canvas: drag any node, hover for the claim text.
   Dependency-free; colors probed from the theme tokens. */

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

type Sim = {
  c: ClaimNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  deg: number;
  pinned: boolean;
};

const EDGES: { a: number; b: number; rel: string }[] = [];
{
  const idx = new Map(CLAIMS.map((c, i) => [c.id, i]));
  CLAIMS.forEach((c, i) => {
    for (const l of c.links) {
      const j = idx.get(l.to);
      if (j !== undefined) EDGES.push({ a: i, b: j, rel: l.rel });
    }
  });
}

export default function ClaimGraph({
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let mouse: [number, number] | null = null;
    let hovered: Sim | null = null;
    let dragging: Sim | null = null;

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

    const deg = new Array(CLAIMS.length).fill(0);
    EDGES.forEach((e) => {
      deg[e.a]++;
      deg[e.b]++;
    });
    // deterministic start positions from the per-claim jitter
    const nodes: Sim[] = CLAIMS.map((c, i) => ({
      c,
      x: c.jx * 0.8 + (c.frame === 'in' ? -0.35 : 0.35),
      y: c.jz * 0.75,
      vx: 0,
      vy: 0,
      deg: deg[i],
      pinned: false,
    }));

    function step() {
      const N = nodes.length;
      for (let i = 0; i < N; i++) {
        const a = nodes[i];
        if (a.pinned) continue;
        let fx = 0,
          fy = 0;
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const b = nodes[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d2 = dx * dx + dy * dy + 0.003;
          if (d2 > 0.08) continue; // short-range separation only, no global explosion
          const f = 0.0022 / d2;
          fx += dx * f;
          fy += dy * f;
        }
        // cluster gravity: in-frame left, out-of-frame right
        const gx = a.c.frame === 'in' ? -0.5 : 0.42;
        fx += (gx - a.x) * 0.024;
        fy += (0 - a.y) * 0.028;
        a.vx = (a.vx + fx) * 0.86;
        a.vy = (a.vy + fy) * 0.86;
      }
      for (const e of EDGES) {
        const a = nodes[e.a],
          b = nodes[e.b];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-4;
        const f = (d - 0.3) * 0.028;
        if (!a.pinned) {
          a.vx += (dx / d) * f;
          a.vy += (dy / d) * f;
        }
        if (!b.pinned) {
          b.vx -= (dx / d) * f;
          b.vy -= (dy / d) * f;
        }
      }
      for (const n of nodes) {
        if (n.pinned) continue;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(-1.15, Math.min(1.15, n.x));
        n.y = Math.max(-0.85, Math.min(0.85, n.y));
      }
    }

    function toScreen(n: { x: number; y: number }) {
      const w = canvas!.width,
        h = canvas!.height;
      const s = Math.min(w / 2.5, h / 1.85);
      return [w / 2 + n.x * s, h / 2 + n.y * s] as [number, number];
    }

    function draw() {
      const w = canvas!.width,
        h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      for (const e of EDGES) {
        const [ax, ay] = toScreen(nodes[e.a]);
        const [bx, by] = toScreen(nodes[e.b]);
        const active = hovered && (nodes[e.a] === hovered || nodes[e.b] === hovered);
        ctx.lineWidth = (active ? 1.8 : 1.1) * dpr;
        if (e.rel === 'probes') {
          ctx.setLineDash([4 * dpr, 4 * dpr]);
          ctx.strokeStyle = rgba(muted, active ? 0.9 : 0.4);
        } else if (e.rel === 'sharpens') {
          ctx.setLineDash([]);
          ctx.strokeStyle = rgba(primary, active ? 0.95 : 0.5);
        } else if (e.rel === 'opposes') {
          ctx.setLineDash([2 * dpr, 5 * dpr]);
          ctx.strokeStyle = rgba(primary, active ? 0.95 : 0.65);
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = rgba(faint, active ? 0.9 : 0.45);
        }
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      let best: { n: Sim; d: number; x: number; y: number } | null = null;
      for (const n of nodes) {
        const [x, y] = toScreen(n);
        const r = (n.deg > 0 ? 6.5 + Math.min(n.deg, 3) : 4.6) * dpr;
        if (n === hovered) {
          ctx.beginPath();
          ctx.arc(x, y, r + 5 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(primary, 0.6);
          ctx.lineWidth = 1.4 * dpr;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        const st = n.c.status;
        if (st === 'confirmed') {
          ctx.fillStyle = rgba(primary, 0.95);
          ctx.fill();
        } else if (st === 'disconfirmed') {
          ctx.fillStyle = rgba(fg, 0.95);
          ctx.fill();
          ctx.strokeStyle = rgba(primary, 0.95);
          ctx.lineWidth = 1.6 * dpr;
          ctx.stroke();
        } else if (st === 'invalidated') {
          ctx.strokeStyle = rgba(muted, 0.85);
          ctx.lineWidth = 1.2 * dpr;
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = rgba(muted, 0.4);
          ctx.fill();
        }
        if (mouse && !dragging) {
          const d = Math.hypot(mouse[0] - x, mouse[1] - y);
          if (d < r + 8 * dpr && (!best || d < best.d)) best = { n, d, x, y };
        }
      }
      if (mouse && !dragging) {
        const next = best ? best.n : null;
        if (next !== hovered) {
          hovered = next;
          setHover(next ? next.c : null);
        }
        if (best) setTipXY([best.x / dpr, best.y / dpr]);
      }
    }

    function frame() {
      if (!reduce) step();
      draw();
      raf = requestAnimationFrame(frame);
    }

    if (isStatic || reduce) {
      for (let i = 0; i < 320; i++) step();
      draw();
      if (!isStatic) raf = requestAnimationFrame(frame);
    } else {
      for (let i = 0; i < 60; i++) step(); // pre-warm so it doesn't fly in from chaos
      raf = requestAnimationFrame(frame);
    }

    const toLocal = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
    };
    const onDown = (e: PointerEvent) => {
      mouse = toLocal(e);
      if (hovered) {
        dragging = hovered;
        dragging.pinned = true;
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const onMove = (e: PointerEvent) => {
      mouse = toLocal(e);
      if (dragging) {
        const w = canvas.width,
          h = canvas.height;
        const s = Math.min(w / 2.5, h / 1.85);
        dragging.x = (mouse[0] - w / 2) / s;
        dragging.y = (mouse[1] - h / 2) / s;
        dragging.vx = 0;
        dragging.vy = 0;
      }
    };
    const onUp = () => {
      if (dragging) dragging.pinned = false;
      dragging = null;
    };
    const onLeave = () => {
      mouse = null;
      hovered = null;
      setHover(null);
      onUp();
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

  const edgeLegend = [
    { label: 'shares a system', dash: 'none', color: 'var(--fg-faint)' },
    { label: 'probes', dash: '4 4', color: 'var(--fg-muted)' },
    { label: 'sharpens', dash: 'none', color: 'var(--primary)' },
    { label: 'opposes', dash: '2 5', color: 'var(--primary)' },
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
              maxWidth: '26ch',
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
                left: Math.max(tipXY[0], 130),
                top: tipXY[1] - 16,
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
                {Math.round(hover.conf * 100)}% · {hover.status}
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
            {edgeLegend.map((l) => (
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
                <svg width="26" height="6">
                  <line
                    x1="0"
                    y1="3"
                    x2="26"
                    y2="3"
                    stroke={l.color}
                    strokeWidth="2"
                    strokeDasharray={l.dash === 'none' ? undefined : l.dash}
                  />
                </svg>
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
