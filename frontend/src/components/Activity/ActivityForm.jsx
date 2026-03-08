import { useState, useEffect, useRef } from 'react'
import { DEFAULT_ACTIVITY_TYPES } from '../../lib/activityTypes'
import { useActivities } from '../../hooks/useActivities'
import { usePhotos } from '../../hooks/usePhotos'
import StatsCard from './StatsCard'
import PhotoGallery from './PhotoGallery'

const WEATHER_OPTIONS = [
  { value: 'soleil', label: 'Soleil' },
  { value: 'nuageux', label: 'Nuageux' },
  { value: 'pluie', label: 'Pluie' },
  { value: 'neige', label: 'Neige' },
  { value: 'orage', label: 'Orage' },
]

const ACCEPTED = '.jpg,.jpeg,.png,.heic,.heif'

// editActivity: existing Activity object for edit mode (optional)
export default function ActivityForm({ pendingActivity, editActivity, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const { createActivity, updateActivity } = useActivities()
  const { uploadPhotos } = usePhotos()
  const isEdit = Boolean(editActivity)

  const [form, setForm] = useState({
    title: editActivity?.title || pendingActivity?.title || '',
    activity_type: editActivity?.activity_type || DEFAULT_ACTIVITY_TYPES[0].id,
    date: editActivity?.date || today,
    country: editActivity?.country || pendingActivity?.location?.country || '',
    region: editActivity?.region || pendingActivity?.location?.region || '',
    description: editActivity?.description || '',
    weather: editActivity?.weather || '',
    temperature: editActivity?.temperature != null ? String(editActivity.temperature) : '',
    rating: editActivity?.rating || 0,
    tags: editActivity?.tags?.join(', ') || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Photo staging for create mode
  const [stagedFiles, setStagedFiles] = useState([]) // File[]
  const [previews, setPreviews] = useState([])       // blob URL[]
  const fileInputRef = useRef(null)

  // Regenerate blob previews when staged files change; clean up on unmount
  useEffect(() => {
    const urls = stagedFiles.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [stagedFiles])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function addStagedFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) setStagedFiles((prev) => [...prev, ...files])
  }

  function removeStagedFile(idx) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function setAsStagedCover(idx) {
    setStagedFiles((prev) => {
      const next = [...prev]
      const [picked] = next.splice(idx, 1)
      return [picked, ...next]
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const tagsArray = form.tags
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const payload = {
      title: form.title,
      activity_type: form.activity_type,
      date: form.date,
      country: form.country || null,
      region: form.region || null,
      description: form.description || null,
      weather: form.weather || null,
      temperature: form.temperature ? parseInt(form.temperature) : null,
      rating: form.rating || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      geometry: isEdit ? editActivity.geometry : (pendingActivity?.geometry || null),
      stats: isEdit ? editActivity.stats : (pendingActivity?.stats || null),
      gpx_file_url: isEdit ? editActivity.gpx_file_url : (pendingActivity?.gpx_file_url || null),
    }

    let activity, err
    if (isEdit) {
      ;({ activity, error: err } = await updateActivity(editActivity.id, payload))
    } else {
      ;({ activity, error: err } = await createActivity(payload))
    }

    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }

    // Upload staged photos after activity creation (positions 0, 1, 2… → first = cover)
    if (!isEdit && stagedFiles.length > 0) {
      await uploadPhotos(activity.id, stagedFiles)
    }

    setLoading(false)
    onSaved(activity)
  }

  return (
    <div className="fixed sm:absolute bottom-14 sm:bottom-auto right-0 sm:top-0 h-[85vh] sm:h-full w-full sm:w-[420px] bg-white shadow-2xl flex flex-col z-30 rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-200">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">
          {isEdit ? "Modifier l'activité" : 'Nouvelle activité'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Type d'activité */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Type d'activité *
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {DEFAULT_ACTIVITY_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => set('activity_type', type.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  form.activity_type === type.id
                    ? 'border-2 bg-opacity-10 text-gray-900'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={
                  form.activity_type === type.id
                    ? { borderColor: type.color, backgroundColor: `${type.color}15` }
                    : {}
                }
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: type.color }}
                />
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Titre *
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Ex : Tour du Mont Blanc J1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Date *
          </label>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Lieu */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Pays
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              placeholder="France"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Région
            </label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="Haute-Savoie"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Description / Ressenti
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Conditions, impressions, anecdotes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Météo + Température */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Météo
            </label>
            <select
              value={form.weather}
              onChange={(e) => set('weather', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">—</option>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Température (°C)
            </label>
            <input
              type="number"
              value={form.temperature}
              onChange={(e) => set('temperature', e.target.value)}
              placeholder="Ex : 18"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Note personnelle
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => set('rating', form.rating === star ? 0 : star)}
                className={`text-2xl leading-none transition-colors ${
                  star <= form.rating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Tags (séparés par des virgules)
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="alpes, hors-piste, famille"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ── Photos ─────────────────────────────────────────── */}
        <div>
          {isEdit ? (
            /* Edit mode: full connected gallery (upload, delete, set cover) */
            <PhotoGallery activityId={editActivity.id} />
          ) : (
            /* Create mode: stage files locally, upload after save */
            <StagedPhotoSection
              files={stagedFiles}
              previews={previews}
              fileInputRef={fileInputRef}
              onAdd={addStagedFiles}
              onRemove={removeStagedFile}
              onSetCover={setAsStagedCover}
            />
          )}
        </div>

        {/* Stats GPX (create mode only) */}
        {!isEdit && pendingActivity?.stats && (
          <StatsCard stats={pendingActivity.stats} />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ── Staged photo section (create mode) ──────────────────────────────────────

function StagedPhotoSection({ files, previews, fileInputRef, onAdd, onRemove, onSetCover }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Photos {files.length > 0 && `(${files.length})`}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={onAdd}
        />
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg py-5 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
        >
          Cliquer pour ajouter des photos
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {previews.map((url, idx) => (
            <div key={idx} className="relative aspect-square rounded overflow-hidden bg-gray-100 group">
              <img src={url} alt="" className="w-full h-full object-cover" />

              {/* Cover badge */}
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  ★
                </span>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => onSetCover(idx)}
                    title="Définir comme couverture"
                    className="bg-amber-400 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-amber-500 transition-colors"
                  >
                    ★
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  title="Retirer"
                  className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-1.5">
          ★ = photo de couverture · Survoler pour changer
        </p>
      )}
    </div>
  )
}
