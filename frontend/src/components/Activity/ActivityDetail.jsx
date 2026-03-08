import { useState } from 'react'
import { DEFAULT_ACTIVITY_TYPES } from '../../lib/activityTypes'
import { useActivities } from '../../hooks/useActivities'
import StatsCard from './StatsCard'
import ElevationChart from './ElevationChart'
import PhotoGallery from './PhotoGallery'

const WEATHER_LABELS = {
  soleil: 'Soleil', nuageux: 'Nuageux', pluie: 'Pluie', neige: 'Neige', orage: 'Orage',
}

function exportGpx(activity) {
  const { geometry, title } = activity
  if (!geometry) return

  let body = ''
  if (geometry.type === 'LineString') {
    const pts = geometry.coordinates
      .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"/>`)
      .join('\n')
    body = `  <trk>\n    <name>${title}</name>\n    <trkseg>\n${pts}\n    </trkseg>\n  </trk>`
  } else if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates
    body = `  <wpt lat="${lat}" lon="${lon}">\n    <name>${title}</name>\n  </wpt>`
  }

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="MyTrails" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${title}</name></metadata>\n${body}\n</gpx>`
  const blob = new Blob([gpx], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}.gpx`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ActivityDetail({ activity, onClose, onEdit, onDeleted }) {
  const { deleteActivity } = useActivities()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const type = DEFAULT_ACTIVITY_TYPES.find((t) => t.id === activity.activity_type)
  const color = type?.color || '#3B82F6'
  const elevationProfile = activity.stats?.elevation_profile

  const formattedDate = activity.date
    ? new Date(activity.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  async function handleDelete() {
    setDeleting(true)
    const { error } = await deleteActivity(activity.id)
    setDeleting(false)
    if (!error) onDeleted(activity.id)
  }

  return (
    <div className="fixed sm:absolute bottom-14 sm:bottom-auto right-0 sm:top-0 h-[85vh] sm:h-full w-full sm:w-[420px] bg-white shadow-2xl flex flex-col z-30 rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-200">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      {/* Header with color accent */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: `3px solid ${color}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full text-white mb-2"
              style={{ backgroundColor: color }}
            >
              {type?.name || activity.activity_type}
            </span>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{activity.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Location */}
        {(activity.country || activity.region) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {[activity.region, activity.country].filter(Boolean).join(', ')}
          </div>
        )}

        {/* Weather + Rating */}
        {(activity.weather || activity.rating > 0) && (
          <div className="flex items-center gap-4">
            {activity.weather && (
              <span className="text-sm text-gray-600">
                {WEATHER_LABELS[activity.weather] || activity.weather}
                {activity.temperature != null && (
                  <span className="ml-1 font-medium">{activity.temperature}°C</span>
                )}
              </span>
            )}
            {activity.rating > 0 && (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`text-base ${s <= activity.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {activity.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activity.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {activity.description && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{activity.description}</p>
          </div>
        )}

        {/* Stats GPX */}
        {activity.stats && <StatsCard stats={activity.stats} />}

        {/* Elevation chart */}
        {elevationProfile?.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Profil altimétrique</p>
            <ElevationChart data={elevationProfile} />
          </div>
        )}

        {/* Photos */}
        <PhotoGallery activityId={activity.id} />
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100">
        {!confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(activity)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier
            </button>
            {activity.geometry && (
              <button
                onClick={() => exportGpx(activity)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export GPX
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-2 text-red-500 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-center text-gray-700">Supprimer «&nbsp;{activity.title}&nbsp;» ?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
