import { useState, useRef } from 'react'

const W = 400   // SVG viewBox width
const H = 100   // SVG viewBox height
const PAD = { top: 10, right: 8, bottom: 22, left: 38 }

export default function ElevationChart({ data }) {
  if (!data || data.length < 2) return null

  const minEle = Math.min(...data.map((d) => d.elevation_m))
  const maxEle = Math.max(...data.map((d) => d.elevation_m))
  const maxDist = data[data.length - 1].distance_m

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  function xOf(dist) { return PAD.left + (dist / maxDist) * innerW }
  function yOf(ele) {
    const range = maxEle - minEle || 1
    return PAD.top + (1 - (ele - minEle) / range) * innerH
  }

  const linePts = data.map((d) => `${xOf(d.distance_m)},${yOf(d.elevation_m)}`).join(' ')
  const areaPts = [
    `${xOf(data[0].distance_m)},${H - PAD.bottom}`,
    linePts,
    `${xOf(data[data.length - 1].distance_m)},${H - PAD.bottom}`,
  ].join(' ')

  const svgRef = useRef(null)
  const [tip, setTip] = useState(null) // { svgX, dist, ele }

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const svgX = relX * W
    const ratio = Math.max(0, Math.min(1, (svgX - PAD.left) / innerW))
    const distAtMouse = ratio * maxDist

    let closest = data[0]
    let minDiff = Infinity
    for (const d of data) {
      const diff = Math.abs(d.distance_m - distAtMouse)
      if (diff < minDiff) { minDiff = diff; closest = d }
    }
    setTip({ svgX: xOf(closest.distance_m), dist: closest.distance_m, ele: closest.elevation_m })
  }

  // Y-axis labels (3 ticks)
  const yTicks = [minEle, Math.round((minEle + maxEle) / 2), maxEle]

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 110 }}
        onMouseMove={handleMove}
        onMouseLeave={() => setTip(null)}
      >
        <defs>
          <linearGradient id="ele-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={t}
            x1={PAD.left} y1={yOf(t)}
            x2={W - PAD.right} y2={yOf(t)}
            stroke="#e5e7eb" strokeWidth="0.5"
          />
        ))}

        {/* Area */}
        <polygon points={areaPts} fill="url(#ele-fill)" />

        {/* Line */}
        <polyline points={linePts} fill="none" stroke="#3B82F6" strokeWidth="1.2" strokeLinejoin="round" />

        {/* Y-axis labels */}
        {yTicks.map((t) => (
          <text key={t} x={PAD.left - 3} y={yOf(t) + 1.5} fontSize="6" fill="#9ca3af" textAnchor="end">
            {t}m
          </text>
        ))}

        {/* X-axis labels */}
        <text x={PAD.left} y={H - 4} fontSize="6" fill="#9ca3af" textAnchor="middle">0</text>
        <text x={W - PAD.right} y={H - 4} fontSize="6" fill="#9ca3af" textAnchor="end">
          {(maxDist / 1000).toFixed(1)} km
        </text>

        {/* Tooltip vertical line */}
        {tip && (
          <>
            <line
              x1={tip.svgX} y1={PAD.top}
              x2={tip.svgX} y2={H - PAD.bottom}
              stroke="#3B82F6" strokeWidth="0.6" strokeDasharray="2,1.5"
            />
            <circle cx={tip.svgX} cy={yOf(tip.ele)} r="2.5" fill="#3B82F6" />
          </>
        )}
      </svg>

      {/* Tooltip label */}
      {tip && (
        <div
          className="absolute pointer-events-none bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
          style={{
            left: `${(tip.svgX / W) * 100}%`,
            top: 4,
            transform: 'translateX(-50%)',
          }}
        >
          {(tip.dist / 1000).toFixed(2)} km · {Math.round(tip.ele)} m
        </div>
      )}
    </div>
  )
}
