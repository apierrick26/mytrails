export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export const MAP_STYLES = [
  {
    id: 'outdoors',
    label: 'Topographique',
    url: 'mapbox://styles/mapbox/outdoors-v12',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
  {
    id: 'streets',
    label: 'Classique',
    url: 'mapbox://styles/mapbox/streets-v12',
  },
  {
    id: 'light',
    label: 'Minimaliste',
    url: 'mapbox://styles/mapbox/light-v11',
  },
  {
    id: 'dark',
    label: 'Nuit',
    url: 'mapbox://styles/mapbox/dark-v11',
  },
]

export const DEFAULT_MAP_STYLE = MAP_STYLES[0]
