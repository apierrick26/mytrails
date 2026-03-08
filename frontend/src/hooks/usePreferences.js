import { supabase } from '../lib/supabaseClient'
import { MAP_STYLES, DEFAULT_MAP_STYLE } from '../lib/mapboxConfig'

const LS_KEY = 'mytrails_prefs'

export function usePreferences() {
  // Load preferences from Supabase (with localStorage sync for instant reads)
  async function loadPreferences() {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .maybeSingle()

    if (!error && data) {
      // Sync the stored map style to localStorage so MapView picks it up on next init
      const style = MAP_STYLES.find((s) => s.id === data.default_map_style)
      if (style) localStorage.setItem('mapStyle', style.url)
      localStorage.setItem(LS_KEY, JSON.stringify(data))
      return data
    }

    // Fallback: cached localStorage value
    try {
      const cached = localStorage.getItem(LS_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }

    return { default_map_style: DEFAULT_MAP_STYLE.id }
  }

  // Save preferences to both Supabase and localStorage
  async function savePreferences(prefs) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }

    // Keep localStorage in sync immediately (no wait for network)
    localStorage.setItem(LS_KEY, JSON.stringify(prefs))
    if (prefs.default_map_style) {
      const style = MAP_STYLES.find((s) => s.id === prefs.default_map_style)
      if (style) localStorage.setItem('mapStyle', style.url)
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )

    return { error }
  }

  return { loadPreferences, savePreferences }
}
