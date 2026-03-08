import { useState } from 'react'

const METHODS = [
  {
    id: 'place-marker',
    label: 'Poser un marqueur',
    desc: 'Cliquez sur la carte',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'geocode',
    label: 'Rechercher un lieu',
    desc: 'Recherche avec autocomplétion',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'import-gpx',
    label: 'Importer un GPX',
    desc: 'Strava, Garmin, Komoot...',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    id: 'draw',
    label: "Dessiner un itinéraire",
    desc: 'Tracez votre parcours à la main',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
]

export default function AddActivityMenu({ onSelectMode }) {
  const [open, setOpen] = useState(false)

  function handleSelect(modeId) {
    setOpen(false)
    onSelectMode(modeId)
  }

  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-64 mb-1">
          {METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelect(method.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left"
            >
              <span className="text-blue-600 flex-shrink-0">{method.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-900">{method.label}</div>
                <div className="text-xs text-gray-400">{method.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-2xl font-light transition-all ${
          open
            ? 'bg-gray-700 text-white rotate-45'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title="Ajouter une activité"
      >
        +
      </button>
    </div>
  )
}
