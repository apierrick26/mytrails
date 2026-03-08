import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePhotos } from '../hooks/usePhotos'
import { useActivities } from '../hooks/useActivities'
import { DEFAULT_ACTIVITY_TYPES } from '../lib/activityTypes'

export default function PhotosPage() {
  const { fetchAllPhotos, fetchUnclassifiedPhotos, attachPhotoToActivity } = usePhotos()
  const { fetchActivities } = useActivities()
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [unclassified, setUnclassified] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [attachTarget, setAttachTarget] = useState(null) // photo to attach
  const [attaching, setAttaching] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchAllPhotos(),
      fetchUnclassifiedPhotos(),
      fetchActivities(),
    ]).then(([{ photos: p }, { photos: u }, { data: acts }]) => {
      setPhotos(p || [])
      setUnclassified(u || [])
      setActivities(acts || [])
      setLoading(false)
    })
  }, [])

  async function handleAttach(storagePath, activityId) {
    setAttaching(true)
    const { error } = await attachPhotoToActivity(storagePath, activityId)
    setAttaching(false)
    if (!error) {
      setUnclassified((prev) => prev.filter((p) => p.url !== storagePath))
      setAttachTarget(null)
    }
  }

  // Group photos by month (from created_at)
  const grouped = groupByMonth(photos)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Chargement des photos...
      </div>
    )
  }

  if (photos.length === 0 && unclassified.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">Aucune photo pour l'instant.</p>
        <p className="text-xs text-gray-400">Ajoutez des photos depuis la fiche d'une activité.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white pb-20 sm:pb-0">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Unclassified photos ─────────────────────────────── */}
        {unclassified.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
                Photos non classées ({unclassified.length})
              </h2>
              <span className="text-xs text-gray-400">— non liées à une activité</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
              {unclassified.map((photo) => (
                <div key={photo.id} className="relative aspect-square bg-gray-100 overflow-hidden rounded group">
                  {photo.signed_url ? (
                    <img
                      src={photo.signed_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Overlay: attach button */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setAttachTarget(photo)}
                      className="flex items-center gap-1 bg-white text-gray-800 text-xs font-medium px-2.5 py-1.5 rounded-full shadow hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Rattacher
                    </button>
                  </div>
                  {/* Amber dot badge */}
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />
                </div>
              ))}
            </div>
          </section>
        )}

        {grouped.map(({ label, items }) => (
          <section key={label} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
              {items.map((photo) => {
                const globalIndex = photos.findIndex((p) => p.id === photo.id)
                return (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxIndex(globalIndex)}
                    className="relative aspect-square bg-gray-100 overflow-hidden rounded group"
                  >
                    {photo.signed_url ? (
                      <img
                        src={photo.signed_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* ── Attach modal ────────────────────────────────────── */}
      {attachTarget && (
        <AttachModal
          photo={attachTarget}
          activities={activities}
          attaching={attaching}
          onAttach={(activityId) => handleAttach(attachTarget.url, activityId)}
          onClose={() => setAttachTarget(null)}
        />
      )}

      {lightboxIndex !== null && (
        <PhotosLightbox
          photos={photos}
          index={lightboxIndex}
          onNavigate={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onViewActivity={(activityId) => {
            setLightboxIndex(null)
            navigate('/', { state: { selectedActivityId: activityId } })
          }}
        />
      )}
    </div>
  )
}

function PhotosLightbox({ photos, index, onNavigate, onClose, onViewActivity }) {
  const photo = photos[index]
  const activity = photo?.activities

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) onNavigate(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length])

  if (!photo) return null

  const type = DEFAULT_ACTIVITY_TYPES.find((t) => t.id === activity?.activity_type)

  const formattedDate = activity?.date
    ? new Date(activity.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col sm:flex-row">
      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-white/60 hover:text-white transition-colors p-2 rounded z-10"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Counter */}
        <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/40 text-sm z-10">
          {index + 1} / {photos.length}
        </span>

        {/* Prev */}
        {index > 0 && (
          <button
            onClick={() => onNavigate(index - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-3 transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next */}
        {index < photos.length - 1 && (
          <button
            onClick={() => onNavigate(index + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-3 transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {photo.signed_url && (
          <img
            src={photo.signed_url}
            alt=""
            className="max-w-full max-h-full object-contain"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          />
        )}
      </div>

      {/* Info bar — bottom strip on mobile, right sidebar on desktop */}
      <div className="sm:w-72 bg-gray-900 flex sm:flex-col text-white flex-shrink-0 sm:overflow-y-auto">
        <div className="p-4 sm:p-5 flex-1 flex sm:block items-center gap-3">
          {activity ? (
            <>
              {type && (
                <span
                  className="hidden sm:inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full text-white sm:mb-3"
                  style={{ backgroundColor: type.color }}
                >
                  {type.name}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-white leading-tight truncate">{activity.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400">{formattedDate}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Photo sans activité associée</p>
          )}
        </div>

        {activity && (
          <div className="p-4 sm:p-5 sm:border-t sm:border-white/10 flex-shrink-0">
            <button
              onClick={() => onViewActivity(activity.id)}
              className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
            >
              Voir sur la carte
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Attach modal ─────────────────────────────────────────────────────────────

function AttachModal({ photo, activities, attaching, onAttach, onClose }) {
  const [selectedId, setSelectedId] = useState('')

  const sorted = [...activities].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Rattacher à une activité</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{photo.url.split('/').pop()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview + selector */}
        <div className="px-5 py-4 space-y-4">
          {photo.signed_url && (
            <img src={photo.signed_url} alt="" className="w-full h-40 object-cover rounded-lg bg-gray-100" />
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Activité
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Choisir une activité —</option>
              {sorted.map((a) => {
                const type = DEFAULT_ACTIVITY_TYPES.find((t) => t.id === a.activity_type)
                const date = a.date
                  ? new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                  : ''
                return (
                  <option key={a.id} value={a.id}>
                    {type?.name || a.activity_type} · {a.title} · {date}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onAttach(selectedId)}
            disabled={!selectedId || attaching}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          >
            {attaching ? 'Rattachement...' : 'Rattacher'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupByMonth(photos) {
  const groups = {}
  const order = []

  for (const photo of photos) {
    const d = new Date(photo.created_at)
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    // Capitalize first letter
    const key = label.charAt(0).toUpperCase() + label.slice(1)
    if (!groups[key]) {
      groups[key] = []
      order.push(key)
    }
    groups[key].push(photo)
  }

  return order.map((label) => ({ label, items: groups[label] }))
}
