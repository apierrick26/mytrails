import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { MAP_STYLES } from '../lib/mapboxConfig'
import { usePreferences } from '../hooks/usePreferences'

export default function SettingsPage() {
  const { loadPreferences, savePreferences } = usePreferences()
  const [user, setUser] = useState(null)
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    loadPreferences().then((p) => setPrefs(p || {}))
  }, [])

  async function handleStyleChange(styleId) {
    const next = { ...prefs, default_map_style: styleId }
    setPrefs(next)
    setSaving(true)
    await savePreferences(next)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const registeredDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  if (!prefs) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Chargement...
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 pb-20 sm:pb-6">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>

        {/* Account info */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Mon compte</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <Row label="Email" value={user?.email} />
            {registeredDate && <Row label="Membre depuis" value={registeredDate} />}
          </div>
        </section>

        {/* Default map style */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Fond de carte par défaut</h2>
            {saving && <span className="text-xs text-blue-500">Sauvegarde...</span>}
            {saved && !saving && <span className="text-xs text-green-500">Sauvegardé ✓</span>}
          </div>
          <div className="px-5 py-4 space-y-3">
            {MAP_STYLES.map((style) => (
              <label key={style.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="mapStyle"
                  value={style.id}
                  checked={(prefs.default_map_style || 'outdoors') === style.id}
                  onChange={() => handleStyleChange(style.id)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-800">{style.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Logout */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <button
              onClick={handleLogout}
              className="w-full text-red-500 text-sm font-medium py-2.5 hover:bg-red-50 rounded-lg transition-colors active:bg-red-100"
            >
              Se déconnecter
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right truncate">{value}</span>
    </div>
  )
}
