import { useState } from 'react'
import { MAP_STYLES } from '../../lib/mapboxConfig'

export default function MapStyleSelector({ currentStyle, onStyleChange }) {
  const [open, setOpen] = useState(false)

  const current = MAP_STYLES.find((s) => s.url === currentStyle) || MAP_STYLES[0]

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="bg-white shadow-md rounded-lg px-3 py-2 text-sm font-medium text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          {current.label}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden min-w-[160px]">
            {MAP_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  onStyleChange(style.url)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  style.url === currentStyle ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
