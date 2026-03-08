import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import MapView from '../components/Map/MapView'
import AddActivityMenu from '../components/Map/AddActivityMenu'
import GeocodingSearch from '../components/Map/GeocodingSearch'
import ActivityForm from '../components/Activity/ActivityForm'
import ActivityDetail from '../components/Activity/ActivityDetail'
import FilterPanel from '../components/Filters/FilterPanel'
import { useActivities } from '../hooks/useActivities'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const DEFAULT_FILTERS = { types: new Set(), year: '', country: '' }

export default function MapPage() {
  const location = useLocation()
  const [mode, setMode] = useState('view')
  const [activities, setActivities] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedActivityId, setSelectedActivityId] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [pendingActivity, setPendingActivity] = useState(null)
  const [gpxLoading, setGpxLoading] = useState(false)
  const [gpxError, setGpxError] = useState(null)
  const fileInputRef = useRef(null)
  const { fetchActivities } = useActivities()

  // Load all activities on mount; handle incoming selectedActivityId from navigation
  useEffect(() => {
    fetchActivities().then(({ data }) => {
      if (data) {
        setActivities(data)
        // If navigated here from ListPage/PhotosPage with a pre-selected activity
        const incoming = location.state?.selectedActivityId
        if (incoming) setSelectedActivityId(incoming)
      }
    })
  }, [])

  // Filter activities for the map
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (filters.types.size > 0 && !filters.types.has(a.activity_type)) return false
      if (filters.year && a.date?.split('-')[0] !== filters.year) return false
      if (filters.country && a.country !== filters.country) return false
      return true
    })
  }, [activities, filters])

  // The full activity object for the selected detail panel
  const selectedActivity = selectedActivityId
    ? activities.find((a) => a.id === selectedActivityId) || null
    : null

  // Determine which right-panel to show (priority: edit > add > detail)
  const showEditForm = Boolean(editingActivity)
  const showAddForm = Boolean(pendingActivity) && !showEditForm
  const showDetail = Boolean(selectedActivity) && !showEditForm && !showAddForm

  // ── Mode handling ──────────────────────────────────────────
  function handleSelectMode(selectedMode) {
    setMode(selectedMode)
    setPendingActivity(null)
    setSelectedActivityId(null)
    setEditingActivity(null)
    setGpxError(null)
    if (selectedMode === 'import-gpx') {
      setTimeout(() => fileInputRef.current?.click(), 50)
    }
  }

  function cancelMode() {
    setMode('view')
    setPendingActivity(null)
    setGpxError(null)
  }

  // ── Method C: click on map ──────────────────────────────────
  function handleLocationPicked(lngLat) {
    setSelectedActivityId(null)
    setPendingActivity({
      geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] },
    })
  }

  // ── Method D: geocoding ────────────────────────────────────
  function handleGeocodingSelect({ lngLat, location }) {
    setMode('view')
    setSelectedActivityId(null)
    setPendingActivity({
      geometry: { type: 'Point', coordinates: [lngLat.lng, lngLat.lat] },
      location,
    })
  }

  // ── Method A: GPX import ───────────────────────────────────
  async function handleGpxFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) { setMode('view'); return }

    setGpxLoading(true)
    setGpxError(null)
    setMode('view')
    setSelectedActivityId(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/gpx/parse`, { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        setGpxError(json.detail || 'Erreur lors du parsing GPX')
        return
      }

      // Embed elevation_profile inside stats so it persists in Supabase
      setPendingActivity({
        geometry: json.geometry,
        stats: { ...json.stats, elevation_profile: json.elevation_profile },
        title: file.name.replace(/\.gpx$/i, ''),
      })
    } catch {
      setGpxError('Impossible de contacter le serveur. Vérifiez que le backend est démarré.')
    } finally {
      setGpxLoading(false)
    }
  }

  // ── Method B: draw ─────────────────────────────────────────
  function handleDrawComplete({ geometry, stats }) {
    setMode('view')
    setSelectedActivityId(null)
    setPendingActivity({ geometry, stats })
  }

  // ── Add activity saved ─────────────────────────────────────
  function handleAddSaved(activity) {
    setPendingActivity(null)
    setMode('view')
    setActivities((prev) => [activity, ...prev])
    setSelectedActivityId(activity.id)
  }

  // ── Activity detail interactions ───────────────────────────
  function handleActivityClick(id) {
    // Don't open detail when in add/draw mode
    if (mode !== 'view') return
    setSelectedActivityId(id)
    setPendingActivity(null)
    setEditingActivity(null)
  }

  function handleDetailClose() {
    setSelectedActivityId(null)
  }

  function handleEdit(activity) {
    setEditingActivity(activity)
  }

  function handleEditSaved(updatedActivity) {
    setActivities((prev) => prev.map((a) => (a.id === updatedActivity.id ? updatedActivity : a)))
    setEditingActivity(null)
    setSelectedActivityId(updatedActivity.id)
  }

  function handleEditClose() {
    setEditingActivity(null)
  }

  function handleDeleted(id) {
    setActivities((prev) => prev.filter((a) => a.id !== id))
    setSelectedActivityId(null)
  }

  return (
    <div className="relative w-full h-full">
      <MapView
        mode={mode}
        activities={filteredActivities}
        selectedActivityId={selectedActivityId}
        onActivityClick={handleActivityClick}
        onLocationPicked={handleLocationPicked}
        onDrawComplete={handleDrawComplete}
      />

      {/* Filter panel — left */}
      {mode === 'view' && (
        <FilterPanel
          activities={activities}
          filters={filters}
          onChange={setFilters}
        />
      )}

      {/* Geocoding search bar */}
      {mode === 'geocode' && (
        <GeocodingSearch onSelect={handleGeocodingSelect} onClose={cancelMode} />
      )}

      {/* GPX hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        className="hidden"
        onChange={handleGpxFile}
      />

      {/* GPX loading overlay */}
      {gpxLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl shadow-lg px-6 py-4 text-sm text-gray-700 flex items-center gap-3">
            <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Analyse du fichier GPX...
          </div>
        </div>
      )}

      {/* GPX error banner */}
      {gpxError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 max-w-md">
          <span className="flex-1">{gpxError}</span>
          <button onClick={() => setGpxError(null)} className="text-red-400 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Cancel banner — place-marker mode */}
      {mode === 'place-marker' && !pendingActivity && (
        <button
          onClick={cancelMode}
          className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10 bg-white text-gray-700 text-sm px-4 py-2 rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
        >
          Annuler
        </button>
      )}

      {/* Cancel banner — draw mode */}
      {mode === 'draw' && (
        <button
          onClick={cancelMode}
          className="absolute bottom-36 right-20 z-10 bg-white text-gray-700 text-sm px-4 py-2 rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
        >
          Annuler dessin
        </button>
      )}

      {/* Add button — hidden during draw / when a right panel is open */}
      {mode !== 'draw' && !showAddForm && !showEditForm && !showDetail && (
        <AddActivityMenu onSelectMode={handleSelectMode} />
      )}

      {/* Right panel: edit form */}
      {showEditForm && (
        <ActivityForm
          editActivity={editingActivity}
          onClose={handleEditClose}
          onSaved={handleEditSaved}
        />
      )}

      {/* Right panel: add form */}
      {showAddForm && (
        <ActivityForm
          pendingActivity={pendingActivity}
          onClose={() => { setPendingActivity(null); setMode('view') }}
          onSaved={handleAddSaved}
        />
      )}

      {/* Right panel: activity detail */}
      {showDetail && (
        <ActivityDetail
          activity={selectedActivity}
          onClose={handleDetailClose}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
