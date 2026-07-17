import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useInView } from '../deck/useInView';
import { useDeck } from '../deck/DeckContext';

/* Calibration curve — stated confidence vs observed hit rate, one dot per
   confidence bucket (dot area = number of claims). The dashed diagonal is
   perfect calibration; below it = overconfident, above = underconfident.
   Pure SVG, draws itself in on view. */

export type CalBucket = { mid: number; n: number; hit: number };

const W = 640;
const H = 460;
const M = { l: 64, r: 24, t: 18, b: 52 };
const px = (conf: number) => M.l + ((conf - 25) / 75) * (W - M.l - M.r);
const py = (rate: number) => H - M.b - (rate / 100) * (H - M.t - M.b);

export default function CalibrationCurve({
  buckets,
  caption,
}: {
  buckets: CalBucket[];
  caption?: string;
}) {
  const { isStatic } = useDeck();
  const reduce = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const [hover, setHover] = useState<CalBucket | null>(null);
  const animate = !isStatic && !reduce;
  const shown = isStatic || inView;

  return (
    <div ref={ref} style={{ maxWidth: 760, marginInline: 'auto', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Calibration: stated confidence vs observed hit rate"
      >
        {/* gridlines */}
        {[0, 25, 50, 75, 100].map((r) => (
          <g key={r}>
            <line
              x1={M.l}
              x2={W - M.r}
              y1={py(r)}
              y2={py(r)}
              stroke="var(--hair-2)"
              strokeWidth="1"
            />
            <text
              x={M.l - 10}
              y={py(r) + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--fg-faint)"
              fontFamily="var(--font-mono)"
            >
              {r}%
            </text>
          </g>
        ))}
        {[30, 50, 70, 90].map((c) => (
          <text
            key={c}
            x={px(c)}
            y={H - M.b + 22}
            textAnchor="middle"
            fontSize="12"
            fill="var(--fg-faint)"
            fontFamily="var(--font-mono)"
          >
            {c}%
          </text>
        ))}
        <text
          x={(M.l + W - M.r) / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize="12.5"
          fill="var(--fg-muted)"
        >
          stated confidence →
        </text>
        <text
          x={16}
          y={(M.t + H - M.b) / 2}
          textAnchor="middle"
          fontSize="12.5"
          fill="var(--fg-muted)"
          transform={`rotate(-90 16 ${(M.t + H - M.b) / 2})`}
        >
          observed hit rate →
        </text>

        {/* perfect-calibration diagonal */}
        <motion.line
          x1={px(25)}
          y1={py(25)}
          x2={px(100)}
          y2={py(100)}
          stroke="var(--fg-muted)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          initial={animate ? { pathLength: 0 } : false}
          animate={shown ? { pathLength: 1 } : undefined}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        <text
          x={px(88)}
          y={py(88) - 12}
          textAnchor="middle"
          fontSize="11.5"
          fill="var(--fg-faint)"
          transform={`rotate(-33 ${px(88)} ${py(88) - 12})`}
        >
          perfect calibration
        </text>
        <text
          x={px(82)}
          y={py(38)}
          textAnchor="middle"
          fontSize="11.5"
          fill="var(--fg-faint)"
        >
          overconfident ↓
        </text>
        <text
          x={px(43)}
          y={py(88)}
          textAnchor="middle"
          fontSize="11.5"
          fill="var(--fg-faint)"
        >
          underconfident ↑
        </text>

        {/* buckets */}
        {buckets.map((b, i) => {
          const r = 7 + Math.sqrt(b.n) * 4.4;
          const small = b.n < 3;
          return (
            <motion.g
              key={b.mid}
              initial={animate ? { opacity: 0, scale: 0.4 } : false}
              animate={shown ? { opacity: 1, scale: 1 } : undefined}
              transition={{
                delay: 0.35 + i * 0.1,
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformOrigin: `${px(b.mid)}px ${py(b.hit)}px` }}
              onMouseEnter={() => setHover(b)}
              onMouseLeave={() => setHover(null)}
            >
              <line
                x1={px(b.mid)}
                x2={px(b.mid)}
                y1={py(b.hit)}
                y2={py(b.mid)}
                stroke="var(--hair)"
                strokeWidth="1"
              />
              <circle
                cx={px(b.mid)}
                cy={py(b.hit)}
                r={r}
                fill={small ? 'var(--fg-muted)' : 'var(--primary)'}
                fillOpacity={small ? 0.35 : 0.9}
                stroke={hover === b ? 'var(--fg)' : 'var(--bg)'}
                strokeWidth="2"
              />
              <text
                x={px(b.mid)}
                y={Math.max(py(b.hit) - r - 8, 14)}
                textAnchor="middle"
                fontSize="12"
                fontFamily="var(--font-mono)"
                fill={hover === b ? 'var(--fg)' : 'var(--fg-muted)'}
              >
                {hover === b ? `${b.hit}% of ${b.n}` : `n=${b.n}`}
              </text>
            </motion.g>
          );
        })}
      </svg>
      {caption && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--fg-faint)',
            marginTop: 6,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
