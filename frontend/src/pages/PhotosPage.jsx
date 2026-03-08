import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePhotos } from '../hooks/usePhotos'
import { DEFAULT_ACTIVITY_TYPES } from '../lib/activityTypes'

export default function PhotosPage() {
  const { fetchAllPhotos } = usePhotos()
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    fetchAllPhotos().then(({ photos: p }) => {
      setPhotos(p || [])
      setLoading(false)
    })
  }, [])

  // Group photos by month (from created_at)
  const grouped = groupByMonth(photos)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Chargement des photos...
      </div>
    )
  }

  if (photos.length === 0) {
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
