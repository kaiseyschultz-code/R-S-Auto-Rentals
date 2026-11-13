import type { Angle } from "@/lib/inspections/angles";

/**
 * Our own guide graphic: a top-down car with a marker showing where to
 * stand (walk-around shots), or a simple icon for close-ups.
 */
export default function AngleDiagram({ angle, size = 160 }: { angle: Angle; size?: number }) {
  if (!angle.stand) return <CloseUpIcon kind={angle.closeUp ?? "seat"} size={size} />;
  const { x, y } = angle.stand;
  // Arrow from the stand point toward the car's centre.
  const dx = 50 - x;
  const dy = 50 - y;
  const len = Math.hypot(dx, dy) || 1;
  const ax = x + (dx / len) * 14;
  const ay = y + (dy / len) * 14;

  return (
    <svg viewBox="-6 -6 112 112" width={size} height={size} role="img" aria-label={`Stand at the ${angle.label.toLowerCase()}`}>
      {/* car body, front at the top */}
      <rect x="30" y="16" width="40" height="68" rx="12" fill="var(--color-white, #fff)" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="35" y="27" width="30" height="13" rx="4" fill="currentColor" fillOpacity="0.12" />
      <rect x="35" y="62" width="30" height="10" rx="4" fill="currentColor" fillOpacity="0.12" />
      {/* wheels */}
      {[
        [26, 24],
        [70, 24],
        [26, 64],
        [70, 64],
      ].map(([wx, wy]) => (
        <rect key={`${wx}-${wy}`} x={wx} y={wy} width="4" height="12" rx="1.5" fill="currentColor" fillOpacity="0.5" />
      ))}
      <text x="50" y="12" textAnchor="middle" fontSize="6" fill="currentColor" fillOpacity="0.5">
        FRONT
      </text>
      {/* camera position + direction */}
      <line x1={x} y1={y} x2={ax} y2={ay} stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={x} cy={y} r="5" fill="var(--brand)" />
      <circle cx={x} cy={y} r="8.5" fill="none" stroke="var(--brand)" strokeOpacity="0.4" strokeWidth="2" />
    </svg>
  );
}

function CloseUpIcon({ kind, size }: { kind: NonNullable<Angle["closeUp"]>; size: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Close-up">
      <circle cx="50" cy="50" r="44" fill="var(--brand)" fillOpacity="0.08" />
      {kind === "wheel" && (
        <g {...common}>
          <circle cx="50" cy="50" r="26" />
          <circle cx="50" cy="50" r="9" />
          {[0, 72, 144, 216, 288].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <line key={deg} x1={50 + 9 * Math.cos(r)} y1={50 + 9 * Math.sin(r)} x2={50 + 24 * Math.cos(r)} y2={50 + 24 * Math.sin(r)} />;
          })}
        </g>
      )}
      {kind === "glass" && (
        <g {...common}>
          <path d="M22 66 L30 34 Q50 28 70 34 L78 66 Z" />
          <path d="M56 42 l4 6 l-5 4 l6 5" stroke="var(--brand)" />
        </g>
      )}
      {kind === "seat" && (
        <g {...common}>
          <path d="M36 24 h16 q6 0 6 6 v24 h-22 z" />
          <path d="M30 58 h34 q6 0 6 6 v8 h-40 z" />
        </g>
      )}
      {kind === "dial" && (
        <g {...common}>
          <path d="M22 62 A30 30 0 1 1 78 62" />
          <line x1="50" y1="56" x2="66" y2="40" stroke="var(--brand)" />
          <rect x="38" y="64" width="24" height="10" rx="2" />
        </g>
      )}
      {kind === "fuel" && (
        <g {...common}>
          <path d="M22 62 A30 30 0 1 1 78 62" />
          <line x1="50" y1="56" x2="36" y2="38" stroke="var(--brand)" />
          <text x="26" y="72" fontSize="10" fill="currentColor" stroke="none">E</text>
          <text x="68" y="72" fontSize="10" fill="currentColor" stroke="none">F</text>
        </g>
      )}
    </svg>
  );
}
