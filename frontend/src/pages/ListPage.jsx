import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivities } from '../hooks/useActivities'
import { usePhotos } from '../hooks/usePhotos'
import { DEFAULT_ACTIVITY_TYPES } from '../lib/activityTypes'

const DEFAULT_FILTERS = { types: new Set(), year: '', country: '' }

export default function ListPage() {
  const navigate = useNavigate()
  const { fetchActivities } = useActivities()
  const { fetchCoverPhotos } = usePhotos()
  const [activities, setActivities] = useState([])
  const [covers, setCovers] = useState({}) // { [activityId]: signedUrl }
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState('date') // 'date' | 'rating' | 'distance'
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  useEffect(() => {
    fetchActivities().then(async ({ data }) => {
      if (!data) { setLoading(false); return }
      setActivities(data)
      setLoading(false)

      // Load cover photos
      const ids = data.map((a) => a.id)
      const { covers: c } = await fetchCoverPhotos(ids)
      setCovers(c)
    })
  }, [])

  // Derived filter options
  const years = useMemo(() => {
    const ys = new Set(activities.map((a) => a.date?.split('-')[0]).filter(Boolean))
    return [...ys].sort((a, b) => b - a)
  }, [activities])

  const countries = useMemo(() => {
    const cs = new Set(activities.map((a) => a.country).filter(Boolean))
    return [...cs].sort()
  }, [activities])

  // Filtered + sorted activities
  const displayed = useMemo(() => {
    let list = activities.filter((a) => {
      if (filters.types.size > 0 && !filters.types.has(a.activity_type)) return false
      if (filters.year && a.date?.split('-')[0] !== filters.year) return false
      if (filters.country && a.country !== filters.country) return false
      return true
    })

    if (sort === 'date') list = [...list].sort((a, b) => (a.date < b.date ? 1 : -1))
    if (sort === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    if (sort === 'distance') {
      list = [...list].sort((a, b) => (b.stats?.distance_m || 0) - (a.stats?.distance_m || 0))
    }

    return list
  }, [activities, filters, sort])

  function toggleType(typeId) {
    setFilters((prev) => {
      let next
      if (prev.types.size === 0) {
        next = new Set(DEFAULT_ACTIVITY_TYPES.map((t) => t.id).filter((id) => id !== typeId))
      } else if (prev.types.has(typeId)) {
        next = new Set(prev.types)
        next.delete(typeId)
        if (next.size === 0) next = new Set()
      } else {
        next = new Set(prev.types)
        next.add(typeId)
        if (next.size === DEFAULT_ACTIVITY_TYPES.length) next = new Set()
      }
      return { ...prev, types: next }
    })
  }

  const hasActiveFilters = filters.types.size > 0 || filters.year || filters.country

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Chargement...
      </div>
    )
  }

  const filterContent = (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Filtres</h2>
        {hasActiveFilters && (
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="mb-5">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Type</p>
        <div className="space-y-2">
          {DEFAULT_ACTIVITY_TYPES.map((type) => {
            const checked = filters.types.size === 0 || filters.types.has(type.id)
            return (
              <label key={type.id} className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => toggleType(type.id)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                    checked ? 'border-transparent' : 'border-gray-300 bg-white'
                  }`}
                  style={checked ? { backgroundColor: type.color, borderColor: type.color } : {}}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
                <span className="text-sm text-gray-700 leading-none">{type.name}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Year filter */}
      {years.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Année</p>
          <select
            value={filters.year}
            onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les années</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Country filter */}
      {countries.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Pays</p>
          <select
            value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les pays</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Sort */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Tri</p>
        <div className="space-y-1.5">
          {[
            { value: 'date', label: 'Date (récent en premier)' },
            { value: 'rating', label: 'Note' },
            { value: 'distance', label: 'Distance' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sort"
                value={opt.value}
                checked={sort === opt.value}
                onChange={() => setSort(opt.value)}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* ── Sidebar filters (desktop only) ────────────────────── */}
      <aside className="hidden sm:block w-60 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
        {filterContent}
      </aside>

      {/* ── Mobile filter drawer overlay ──────────────────────── */}
      {showMobileFilters && (
        <div className="sm:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
          <div className="relative bg-white rounded-t-2xl overflow-y-auto max-h-[80vh] pb-20">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-base font-semibold text-gray-900">Filtres & Tri</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}

      {/* ── Activity cards ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h1 className="text-lg font-bold text-gray-900">Journal</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{displayed.length} activité{displayed.length !== 1 ? 's' : ''}</span>
            {/* Filter button — mobile only */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="sm:hidden flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtrer
              {(filters.types.size > 0 || filters.year || filters.country) && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {(filters.types.size > 0 ? 1 : 0) + (filters.year ? 1 : 0) + (filters.country ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">Aucune activité ne correspond à ces filtres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                coverUrl={covers[activity.id]}
                onClick={() => navigate('/', { state: { selectedActivityId: activity.id } })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ActivityCard({ activity, coverUrl, onClick }) {
  const type = DEFAULT_ACTIVITY_TYPES.find((t) => t.id === activity.activity_type)
  const color = type?.color || '#3B82F6'

  const formattedDate = activity.date
    ? new Date(activity.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : ''

  const distanceKm = activity.stats?.distance_m
    ? (activity.stats.distance_m / 1000).toFixed(1)
    : null

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
    >
      {/* Cover photo / gradient placeholder */}
      <div className="relative h-40 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">{getTypeEmoji(activity.activity_type)}</span>
            </div>
          </div>
        )}
        {/* Type badge overlay */}
        <span
          className="absolute top-2.5 left-2.5 text-xs font-semibold px-2 py-0.5 rounded-full text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          {type?.name || activity.activity_type}
        </span>
      </div>

      {/* Content */}
      <div className="px-3.5 py-3">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{activity.title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{formattedDate}</p>

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {(activity.country || activity.region) && (
            <span className="flex items-center gap-1 min-w-0 truncate">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{[activity.region, activity.country].filter(Boolean).join(', ')}</span>
            </span>
          )}
          {distanceKm && (
            <span className="flex-shrink-0">{distanceKm} km</span>
          )}
        </div>

        {activity.rating > 0 && (
          <div className="flex gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`text-xs ${s <= activity.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

function getTypeEmoji(type) {
  const map = {
    voyage: '✈️',
    randonnee: '🥾',
    course: '🏃',
    velo: '🚴',
    ski: '⛷️',
    escalade: '🧗',
  }
  return map[type] || '📍'
}
