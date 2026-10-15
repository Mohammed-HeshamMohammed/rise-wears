"use client";

import { useRef, useState } from "react";

export interface Point {
  label: string;
  value: number;
  tip: string;
}

const W = 720, H = 250, ML = 62, MR = 14, MT = 14, MB = 30;

function niceMax(max: number) {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max / 4));
  const base = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => s * 4 >= max) ?? step * 10;
  return base * 4;
}

// Revenue-per-day style chart. Hover (or touch) any day for its exact value.
export function AreaChart({ points, format, label }: { points: Point[]; format: (v: number) => string; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const n = points.length;
  const top = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const x = (i: number) => ML + (n <= 1 ? (W - ML - MR) / 2 : (i * (W - ML - MR)) / (n - 1));
  const y = (v: number) => MT + (H - MT - MB) * (1 - v / top);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = n > 1 ? `${line} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : "";
  const ticks = [0, 1, 2, 3, 4].map((k) => (top * k) / 4);
  const every = Math.max(1, Math.ceil(n / 6));
  // keep regular ticks, but drop the one that would collide with the final label
  const showLabel = (i: number) => i === n - 1 || (i % every === 0 && n - 1 - i >= Math.ceil(every * 0.7));

  function move(e: React.PointerEvent) {
    const r = box.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    setActive(Math.min(n - 1, Math.max(0, Math.round(((px - ML) / (W - ML - MR)) * (n - 1)))));
  }

  return (
    <div className="chart" ref={box} onPointerMove={move} onPointerLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <g className="grid axis">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} />
              <text x={ML - 10} y={y(t) + 4} textAnchor="end">{format(t)}</text>
            </g>
          ))}
        </g>
        <g className="axis">
          {points.map((p, i) =>
            showLabel(i) ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{p.label}</text>
            ) : null,
          )}
        </g>
        {area && <path className="area" d={area} />}
        <path className="line" d={line} />
        {active !== null && <line className="cursor" x1={x(active)} x2={x(active)} y1={MT} y2={H - MB} />}
        {(n <= 31 || active !== null) &&
          points.map((p, i) => (n <= 31 || i === active ? <circle key={i} className="dot" cx={x(i)} cy={y(p.value)} r={i === active ? 5 : 3.2} /> : null))}
      </svg>
      {active !== null && points[active] && (
        <div className="chart-tip" style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(points[active]!.value) / H) * 100}%` }}>
          <b>{format(points[active]!.value)}</b>
          {points[active]!.tip}
        </div>
      )}
    </div>
  );
}
