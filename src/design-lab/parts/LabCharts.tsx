/** Small static SVG charts for the mocks. Shapes imitate the real ones; the numbers mean nothing. */

const CURVE_POINTS = Array.from({ length: 36 }, (_, i) => {
  const x = 40 + i * 9.7
  const y = 160 - 130 / (1 + Math.exp(-(x - 210) / 32))
  return `${x.toFixed(1)},${y.toFixed(1)}`
}).join(" ")

export function LabSCurve({ tall = false }: { tall?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 190"
      role="img"
      aria-label="S-kurve"
      className={tall ? "h-72 w-full" : "h-44 w-full"}
      preserveAspectRatio="none"
    >
      {[30, 70, 110, 150].map((y) => (
        <line key={y} x1="40" x2="385" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
      ))}
      <polyline points={CURVE_POINTS} fill="none" stroke="var(--lab-brand)" strokeWidth="2.5" />
      <line x1="210" x2="210" y1="95" y2="165" stroke="var(--lab-brand)" strokeDasharray="5 4" />
      <line x1="270" x2="270" y1="47" y2="165" stroke="var(--lab-accent)" strokeDasharray="2 3" />
      <circle cx="210" cy="95" r="4" fill="var(--lab-brand)" />
      <circle cx="270" cy="47" r="4" fill="var(--lab-accent)" />
      <text x="210" y="180" textAnchor="middle" fontSize="10" fill="currentColor">
        P50
      </text>
      <text x="270" y="180" textAnchor="middle" fontSize="10" fill="currentColor">
        P85
      </text>
    </svg>
  )
}

const TORNADO_ROWS: readonly { name: string; low: number; high: number }[] = [
  { name: "Konstruksjon", low: 70, high: 110 },
  { name: "Forsinkelse", low: 50, high: 85 },
  { name: "Markedsprisvekst", low: 35, high: 70 },
  { name: "Grunnforhold", low: 25, high: 45 },
  { name: "Elektro og VVS", low: 15, high: 30 },
]

export function LabTornado() {
  return (
    <svg viewBox="0 0 400 150" role="img" aria-label="Tornado" className="h-40 w-full">
      <line x1="215" x2="215" y1="4" y2="146" stroke="var(--border)" />
      {TORNADO_ROWS.map((row, index) => {
        const y = 10 + index * 28
        return (
          <g key={row.name}>
            <text x="2" y={y + 11} fontSize="9" fill="currentColor">
              {row.name}
            </text>
            <rect
              x={215 - row.low}
              y={y}
              width={row.low}
              height="14"
              rx="2"
              fill="var(--lab-accent)"
              opacity="0.8"
            />
            <rect
              x="215"
              y={y}
              width={row.high}
              height="14"
              rx="2"
              fill="var(--lab-brand)"
              opacity="0.85"
            />
          </g>
        )
      })}
    </svg>
  )
}

export function LabDevelopment() {
  return (
    <svg viewBox="0 0 400 130" role="img" aria-label="Utvikling" className="h-32 w-full">
      {[20, 60, 100].map((y) => (
        <line key={y} x1="40" x2="385" y1={y} y2={y} stroke="var(--border)" />
      ))}
      <text x="2" y="24" fontSize="9" fill="currentColor">
        11,5
      </text>
      <text x="2" y="64" fontSize="9" fill="currentColor">
        10,0
      </text>
      <text x="2" y="104" fontSize="9" fill="currentColor">
        8,9
      </text>
      <rect x="95" y="30" width="10" height="46" rx="3" fill="var(--lab-tint-strong)" />
      <circle cx="100" cy="53" r="4.5" fill="var(--lab-brand)" />
      <text x="100" y="122" textAnchor="middle" fontSize="9" fill="currentColor">
        CP1
      </text>
    </svg>
  )
}
