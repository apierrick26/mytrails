import { useState, useRef, useEffect } from 'react'
import { MAPBOX_TOKEN } from '../../lib/mapboxConfig'

export default function GeocodingSearch({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=6&language=fr`
        const res = await fetch(url)
        const json = await res.json()
        setSuggestions(json.features || [])
      } catch {
        setSuggestions([])
      }
      setLoading(false)
    }, 300)
  }, [query])

  function handleSelect(feature) {
    const [lng, lat] = feature.center
    // Extract country and region from context
    const context = feature.context || []
    const countryCtx = context.find((c) => c.id.startsWith('country.'))
    const regionCtx = context.find((c) => c.id.startsWith('region.'))

    onSelect({
      lngLat: { lng, lat },
      location: {
        place_name: feature.place_name,
        country: countryCtx?.text || '',
        region: regionCtx?.text || '',
      },
    })
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un lieu dans le monde..."
            className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400"
          />
          {loading && (
            <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors ml-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="border-t border-gray-100">
            {suggestions.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleSelect(feature)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-start gap-2.5 border-b border-gray-50 last:border-0"
              >
                <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-gray-900">{feature.text}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{feature.place_name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
