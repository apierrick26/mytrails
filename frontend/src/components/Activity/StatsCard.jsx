function fmt_duration(seconds) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function fmt_distance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${meters} m`
}

function StatItem({ label, value, unit }) {
  if (value == null) return null
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-lg p-3">
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <span className="text-base font-bold text-gray-900">
        {value}
        {unit && <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>}
      </span>
    </div>
  )
}

export default function StatsCard({ stats }) {
  if (!stats) return null

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Statistiques
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {stats.distance_m != null && (
          <StatItem label="Distance" value={fmt_distance(stats.distance_m)} />
        )}
        {stats.elevation_gain != null && (
          <StatItem label="Dénivelé +" value={`+${stats.elevation_gain}`} unit="m" />
        )}
        {stats.elevation_loss != null && (
          <StatItem label="Dénivelé -" value={`-${stats.elevation_loss}`} unit="m" />
        )}
        {stats.duration_s != null && (
          <StatItem label="Durée totale" value={fmt_duration(stats.duration_s)} />
        )}
        {stats.moving_duration_s != null && (
          <StatItem label="Durée mouvement" value={fmt_duration(stats.moving_duration_s)} />
        )}
        {stats.avg_speed_kmh != null && (
          <StatItem label="Vitesse moy." value={stats.avg_speed_kmh} unit="km/h" />
        )}
        {stats.avg_moving_speed_kmh != null && (
          <StatItem label="Vitesse moy. mvt" value={stats.avg_moving_speed_kmh} unit="km/h" />
        )}
        {stats.max_speed_kmh != null && (
          <StatItem label="Vitesse max" value={stats.max_speed_kmh} unit="km/h" />
        )}
        {stats.elevation_min != null && (
          <StatItem label="Altitude min" value={stats.elevation_min} unit="m" />
        )}
        {stats.elevation_max != null && (
          <StatItem label="Altitude max" value={stats.elevation_max} unit="m" />
        )}
        {stats.avg_hr != null && (
          <StatItem label="FC moy." value={stats.avg_hr} unit="bpm" />
        )}
        {stats.max_hr != null && (
          <StatItem label="FC max" value={stats.max_hr} unit="bpm" />
        )}
        {stats.avg_cadence != null && (
          <StatItem label="Cadence moy." value={stats.avg_cadence} unit="rpm" />
        )}
        {stats.avg_power != null && (
          <StatItem label="Puissance moy." value={stats.avg_power} unit="W" />
        )}
        {stats.calories != null && (
          <StatItem label="Calories" value={stats.calories} unit="kcal" />
        )}
      </div>
    </div>
  )
}
