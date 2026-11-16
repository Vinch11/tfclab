import { useId } from "react";
import type { RadarAxis } from "@/lib/coachingCompass/types";

export function CompassSignatureRadar({ axes, size = 320 }: { axes: RadarAxis[]; size?: number }) {
  const glowId = useId();
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;
  const levels = [25, 50, 75, 100];
  const n = axes.length;

  if (n === 0) return null;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  // Optimal zone (75-100)
  const optimalOuter = Array.from({ length: n }, (_, i) => getPoint(i, 100));
  const optimalInner = Array.from({ length: n }, (_, i) => getPoint(i, 75));
  const optimalPath = `M ${optimalOuter.map(p => `${p.x},${p.y}`).join(" L ")} Z M ${optimalInner.map(p => `${p.x},${p.y}`).join(" L ")} Z`;

  // Data polygon
  const dataPoints = axes.map((a, i) => getPoint(i, a.score));
  const polygonStr = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  const scoreColor = (s: number) =>
    s >= 75 ? "hsl(var(--success))" : s >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[440px] mx-auto select-none" role="img" aria-label="Profil physiologique comparé aux cibles TFCL">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx={cx} cy={cy} r={r * 1.15} fill={`url(#${glowId})`} />

      {/* Grid levels with labels */}
      {levels.map(level => {
        const points = Array.from({ length: n }, (_, i) => {
          const p = getPoint(i, level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <g key={level}>
            <polygon
              points={points}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={level === 100 ? 1 : level === 75 ? 0.7 : 0.3}
              opacity={level === 75 ? 0.5 : 0.3}
              strokeDasharray={level === 75 ? "3,2" : "none"}
            />
            {/* Level label on first axis */}
            <text
              x={getPoint(0, level).x + 3}
              y={getPoint(0, level).y - 3}
              fontSize={7}
              className="fill-muted-foreground"
              opacity={0.4}
            >
              {level}
            </text>
          </g>
        );
      })}

      {/* Existing target-relative band, not a scientific norm. */}
      <path
        d={optimalPath}
        fill="hsl(var(--success) / 0.08)"
        fillRule="evenodd"
        stroke="hsl(var(--success) / 0.2)"
        strokeWidth={0.7}
      />

      {/* Axis lines */}
      {axes.map((_, i) => {
        const p = getPoint(i, 105);
        return (
          <line
            key={`axis-${i}`}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
            opacity={0.3}
          />
        );
      })}

      {/* Data polygon — filled with gradient effect */}
      {axes.every(axis => axis.value != null && axis.value > 0 && axis.target != null) && <polygon
        points={polygonStr}
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />}

      {/* Data points with colored halos */}
      {dataPoints.map((p, i) => axes[i].value != null && axes[i].target != null ? (
        <g key={`dot-${i}`}>
          <circle cx={p.x} cy={p.y} r={8} fill={`${scoreColor(axes[i].score)}`.replace(")", " / 0.12)")} />
          <circle cx={p.x} cy={p.y} r={4.5} fill={scoreColor(axes[i].score)} stroke="hsl(var(--background))" strokeWidth={2} />
        </g>
      ) : null)}

      {/* Labels with emoji, name, score and value */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 135);
        const emoji = axis.key === "aerobic" ? "⚡" : axis.key === "vo2max" ? "⚡" : axis.key === "vma" ? "🏃" : axis.key === "ftpkg" ? "🚴" : axis.key === "tte" ? "⏱️" : axis.key === "vlamax" ? "🔬" : axis.key === "fatmax" ? "🔥" : axis.key === "durability" ? "🛡️" : axis.key === "wprime" ? "💥" : "🎯";
        
        return (
          <g key={`label-${i}`}>
            {/* Emoji */}
            <text
              x={labelP.x}
              y={labelP.y - 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
            >
              {emoji}
            </text>
            {/* Axis name */}
            <text
              x={labelP.x}
              y={labelP.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
              fontSize={10}
              fontWeight={700}
            >
              {axis.shortLabel}
            </text>
            {/* Score */}
            <text
              x={labelP.x}
              y={labelP.y + 13}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={axis.value != null && axis.target != null ? scoreColor(axis.score) : "hsl(var(--muted-foreground))"}
              fontSize={12}
              fontWeight={800}
            >
              {axis.value != null && axis.value > 0 && axis.target != null ? `${axis.score}/100` : axis.value != null && axis.value > 0 ? `${axis.value.toFixed(1)} ${axis.unit}` : "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

