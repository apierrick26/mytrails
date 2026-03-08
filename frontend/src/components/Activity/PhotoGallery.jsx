import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePhotos } from '../../hooks/usePhotos'

const ACCEPTED = '.jpg,.jpeg,.png,.heic,.heif'

export default function PhotoGallery({ activityId }) {
  const { uploadPhotos, fetchActivityPhotos, deletePhoto, setCoverPhoto } = usePhotos()
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!activityId) return
    fetchActivityPhotos(activityId).then(({ photos: p }) => {
      if (p) setPhotos(p)
    })
  }, [activityId])

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return

    setUploading(true)
    const { error } = await uploadPhotos(activityId, files)
    setUploading(false)

    if (!error) {
      const { photos: p } = await fetchActivityPhotos(activityId)
      if (p) setPhotos(p)
    }
  }

  async function handleDelete(photo) {
    const { error } = await deletePhoto(photo)
    if (!error) {
      const updated = photos.filter((p) => p.id !== photo.id)
      setPhotos(updated)
      if (lightboxIndex !== null) {
        if (updated.length === 0) setLightboxIndex(null)
        else setLightboxIndex(Math.min(lightboxIndex, updated.length - 1))
      }
    }
  }

  async function handleSetCover(photo) {
    const { error } = await setCoverPhoto(photo.id, activityId)
    if (error) return

    // Await the reload so state updates atomically with lightbox position
    const { photos: updated } = await fetchActivityPhotos(activityId)
    if (updated) {
      setPhotos(updated)
      // Photo is now position 0; update lightbox to show it there
      const newIdx = updated.findIndex((p) => p.id === photo.id)
      setLightboxIndex(newIdx >= 0 ? newIdx : 0)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Photos {photos.length > 0 && `(${photos.length})`}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {uploading ? 'Upload...' : 'Ajouter'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {photos.length === 0 && !uploading && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
        >
          Cliquer pour ajouter des photos
        </button>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="relative aspect-square rounded overflow-hidden bg-gray-100 group"
            >
              {photo.signed_url ? (
                <img
                  src={photo.signed_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  ★
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Rendered via portal so it is NEVER a DOM descendant of <form> */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onNavigate={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
          onSetCover={handleSetCover}
        />
      )}
    </div>
  )
}

function Lightbox({ photos, index, onNavigate, onClose, onDelete, onSetCover }) {
  const photo = photos[index]
  const isCover = index === 0
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [settingCover, setSettingCover] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) onNavigate(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length])

  useEffect(() => { setConfirmDelete(false) }, [index])

  async function handleSetCover() {
    setSettingCover(true)
    await onSetCover(photo)
    setSettingCover(false)
    // Lightbox stays open; gallery updates in place with new cover badge at index 0
  }

  // Render into document.body — completely outside any <form> element
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">{index + 1} / {photos.length}</span>
          {isCover ? (
            <span className="text-amber-400 text-xs font-semibold flex items-center gap-1">
              ★ Couverture
            </span>
          ) : (
            <button
              onClick={handleSetCover}
              disabled={settingCover}
              className="text-white/60 hover:text-amber-400 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              ☆ {settingCover ? '...' : 'Définir comme couverture'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-white/60 hover:text-red-400 transition-colors p-1.5 rounded"
              title="Supprimer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Supprimer ?</span>
              <button
                onClick={() => { onDelete(photo); setConfirmDelete(false) }}
                className="text-red-400 hover:text-red-300 text-sm font-medium px-2 py-1 rounded bg-red-900/30"
              >
                Oui
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-white/60 hover:text-white text-sm px-2 py-1"
              >
                Non
              </button>
            </div>
          )}
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1.5 rounded">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      {index > 0 && (
        <button
          onClick={() => onNavigate(index - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={() => onNavigate(index + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {photo?.signed_url && (
        <img
          src={photo.signed_url}
          alt=""
          className="max-w-[90vw] max-h-[85vh] object-contain rounded shadow-2xl"
        />
      )}
    </div>,
    document.body
  )
}
