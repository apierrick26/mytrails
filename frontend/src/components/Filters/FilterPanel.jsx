import { useMemo, useState } from 'react'
import { DEFAULT_ACTIVITY_TYPES } from '../../lib/activityTypes'

export default function FilterPanel({ activities, filters, onChange }) {
  const [collapsed, setCollapsed] = useState(false)

  const years = useMemo(() => {
    const ys = new Set(activities.map((a) => a.date?.split('-')[0]).filter(Boolean))
    return [...ys].sort((a, b) => b - a)
  }, [activities])

  const countries = useMemo(() => {
    const cs = new Set(activities.map((a) => a.country).filter(Boolean))
    return [...cs].sort()
  }, [activities])

  function toggleType(typeId) {
    let next
    if (filters.types.size === 0) {
      // All shown → uncheck one → show all except that one
      next = new Set(DEFAULT_ACTIVITY_TYPES.map((t) => t.id).filter((id) => id !== typeId))
    } else if (filters.types.has(typeId)) {
      next = new Set(filters.types)
      next.delete(typeId)
      if (next.size === 0) next = new Set() // empty = show all
    } else {
      next = new Set(filters.types)
      next.add(typeId)
      if (next.size === DEFAULT_ACTIVITY_TYPES.length) next = new Set() // all = no filter
    }
    onChange({ ...filters, types: next })
  }

  const hasActiveFilters = filters.types.size > 0 || filters.year || filters.country

  const activeCount = (filters.types.size > 0 ? 1 : 0) + (filters.year ? 1 : 0) + (filters.country ? 1 : 0)

  return (
    <div className="absolute left-4 top-4 z-10 w-56 sm:w-60 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-semibold text-gray-900">Filtres</span>
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <>
          {/* Type filter */}
          <div className="px-4 pb-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-3 mb-2">Type d'activité</p>
            <div className="space-y-2">
              {DEFAULT_ACTIVITY_TYPES.map((type) => {
                const checked = filters.types.size === 0 || filters.types.has(type.id)
                return (
                  <label key={type.id} className="flex items-center gap-2.5 cursor-pointer group">
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
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm text-gray-700 leading-none">{type.name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Year filter */}
          {years.length > 1 && (
            <div className="px-4 pb-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-3 mb-2">Année</p>
              <select
                value={filters.year}
                onChange={(e) => onChange({ ...filters, year: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les années</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Country filter */}
          {countries.length > 1 && (
            <div className="px-4 pb-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-3 mb-2">Pays</p>
              <select
                value={filters.country}
                onChange={(e) => onChange({ ...filters, country: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les pays</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reset */}
          {hasActiveFilters && (
            <div className="px-4 pb-3 border-t border-gray-100 pt-2">
              <button
                onClick={() => onChange({ types: new Set(), year: '', country: '' })}
                className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium py-1"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
