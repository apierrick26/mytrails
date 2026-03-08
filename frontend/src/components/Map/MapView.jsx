import { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAPBOX_TOKEN, DEFAULT_MAP_STYLE } from '../../lib/mapboxConfig'
import { DEFAULT_ACTIVITY_TYPES } from '../../lib/activityTypes'
import MapStyleSelector from './MapStyleSelector'

mapboxgl.accessToken = MAPBOX_TOKEN

const DRAW_SOURCE = 'draw-route'
const DRAW_LAYER = 'draw-route-line'
const ACT_SOURCE = 'activities'
const ACT_LINES_LAYER = 'activities-lines'
const ACT_POINTS_LAYER = 'activities-points'

function buildGeoJSON(activities) {
  return {
    type: 'FeatureCollection',
    features: activities
      .filter((a) => a.geometry)
      .map((a) => ({
        type: 'Feature',
        geometry: a.geometry,
        properties: {
          id: a.id,
          title: a.title,
          activity_type: a.activity_type,
          color: DEFAULT_ACTIVITY_TYPES.find((t) => t.id === a.activity_type)?.color || '#3B82F6',
          date: a.date,
        },
      })),
  }
}

export default function MapView({ mode, activities = [], selectedActivityId, onActivityClick, onLocationPicked, onDrawComplete }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const clickMarker = useRef(null)
  const drawMarkers = useRef([])
  const drawRouteCoords = useRef([])
  const modeRef = useRef(mode)
  const activitiesRef = useRef(activities)
  const onActivityClickRef = useRef(onActivityClick)
  const [mapStyle, setMapStyle] = useState(
    () => localStorage.getItem('mapStyle') || DEFAULT_MAP_STYLE.url
  )
  const [drawWaypoints, setDrawWaypoints] = useState([])
  const [snapToRoad, setSnapToRoad] = useState(true)
  const [drawLoading, setDrawLoading] = useState(false)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { activitiesRef.current = activities }, [activities])
  useEffect(() => { onActivityClickRef.current = onActivityClick }, [onActivityClick])

  // Stable click handler
  const handleMapClick = useCallback((e) => {
    const { lng, lat } = e.lngLat
    if (modeRef.current === 'place-marker') {
      if (clickMarker.current) clickMarker.current.remove()
      const el = document.createElement('div')
      el.style.cssText = 'width:14px;height:14px;background:#2563EB;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)'
      clickMarker.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat]).addTo(map.current)
      onLocationPicked?.({ lng, lat })
    } else if (modeRef.current === 'draw') {
      handleAddWaypoint({ lng, lat })
    }
  }, [onLocationPicked])

  // Initialize map
  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [2.3522, 46.2276],
      zoom: 5,
    })
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')
    map.current.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      'bottom-right'
    )
    map.current.on('load', () => {
      // --- Activities layers ---
      map.current.addSource(ACT_SOURCE, {
        type: 'geojson',
        data: buildGeoJSON([]),
      })
      // Lines (traces GPX / drawn routes)
      map.current.addLayer({
        id: ACT_LINES_LAYER,
        type: 'line',
        source: ACT_SOURCE,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.85,
        },
      })
      // Points (single markers)
      map.current.addLayer({
        id: ACT_POINTS_LAYER,
        type: 'circle',
        source: ACT_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Highlight layers for selected activity
      map.current.addLayer({
        id: 'selected-line', type: 'line', source: ACT_SOURCE,
        filter: ['==', ['get', 'id'], ''],
        paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 1 },
      })
      map.current.addLayer({
        id: 'selected-point', type: 'circle', source: ACT_SOURCE,
        filter: ['==', ['get', 'id'], ''],
        paint: { 'circle-color': ['get', 'color'], 'circle-radius': 11, 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' },
      })

      // Click on activity features → open detail panel
      ;[ACT_LINES_LAYER, ACT_POINTS_LAYER].forEach((layer) => {
        map.current.on('mouseenter', layer, () => {
          map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current.on('mouseleave', layer, () => {
          map.current.getCanvas().style.cursor =
            modeRef.current === 'place-marker' || modeRef.current === 'draw' ? 'crosshair' : ''
        })
        map.current.on('click', layer, (e) => {
          const id = e.features[0].properties.id
          onActivityClickRef.current?.(id)
          e.stopPropagation()
        })
      })

      // --- Draw layer ---
      map.current.addSource(DRAW_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      })
      map.current.addLayer({
        id: DRAW_LAYER, type: 'line', source: DRAW_SOURCE,
        paint: { 'line-color': '#3B82F6', 'line-width': 3, 'line-dasharray': [2, 1] },
      })
    })
    map.current.on('click', handleMapClick)
  }, [handleMapClick])

  // Update activities on the map whenever the list changes
  useEffect(() => {
    if (!map.current) return
    const geojson = buildGeoJSON(activities)
    const update = () => map.current.getSource(ACT_SOURCE)?.setData(geojson)
    if (map.current.isStyleLoaded()) {
      update()
    } else {
      map.current.once('load', update)
    }
  }, [activities])

  // Highlight selected activity
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return
    const id = selectedActivityId || ''
    map.current.getLayer('selected-line') && map.current.setFilter('selected-line', ['==', ['get', 'id'], id])
    map.current.getLayer('selected-point') && map.current.setFilter('selected-point', ['==', ['get', 'id'], id])
  }, [selectedActivityId])

  // Fly to selected activity
  useEffect(() => {
    if (!map.current || !selectedActivityId) return
    const activity = activitiesRef.current.find((a) => a.id === selectedActivityId)
    if (!activity?.geometry) return
    if (activity.geometry.type === 'Point') {
      map.current.flyTo({ center: activity.geometry.coordinates, zoom: 12, duration: 700 })
    } else if (activity.geometry.type === 'LineString') {
      const coords = activity.geometry.coordinates
      if (coords.length < 2) return
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      )
      map.current.fitBounds(bounds, { padding: 80, duration: 700, maxZoom: 14 })
    }
  }, [selectedActivityId])

  // Cursor & mode cleanup
  useEffect(() => {
    if (!map.current) return
    const canvas = map.current.getCanvas()
    canvas.style.cursor = (mode === 'place-marker' || mode === 'draw') ? 'crosshair' : ''
    if (mode !== 'place-marker' && clickMarker.current) {
      clickMarker.current.remove(); clickMarker.current = null
    }
    if (mode !== 'draw') clearDraw()
  }, [mode])

  function clearDraw() {
    drawMarkers.current.forEach((m) => m.remove())
    drawMarkers.current = []
    drawRouteCoords.current = []
    setDrawWaypoints([])
    setDrawLoading(false)
    updateDrawLine([])
  }

  function updateDrawLine(coords) {
    const c = coords ?? drawRouteCoords.current
    map.current?.getSource(DRAW_SOURCE)?.setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: c },
    })
  }

  function addWaypointMarker(lngLat) {
    const el = document.createElement('div')
    el.style.cssText = 'width:10px;height:10px;background:#2563EB;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)'
    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lngLat.lng, lngLat.lat]).addTo(map.current)
    drawMarkers.current.push(marker)
  }

  async function handleAddWaypoint(lngLat) {
    addWaypointMarker(lngLat)

    setDrawWaypoints((prev) => {
      const next = [...prev, lngLat]
      if (next.length === 1) {
        drawRouteCoords.current = [[lngLat.lng, lngLat.lat]]
        updateDrawLine()
      } else {
        const from = next[next.length - 2]
        fetchSegment(from, lngLat)
      }
      return next
    })
  }

  async function fetchSegment(from, to) {
    if (snapToRoad) {
      setDrawLoading(true)
      try {
        const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        )
        const json = await res.json()
        if (json.routes?.[0]) {
          const routeCoords = json.routes[0].geometry.coordinates
          drawRouteCoords.current = [...drawRouteCoords.current, ...routeCoords.slice(1)]
        } else {
          drawRouteCoords.current = [...drawRouteCoords.current, [to.lng, to.lat]]
        }
      } catch {
        drawRouteCoords.current = [...drawRouteCoords.current, [to.lng, to.lat]]
      }
      setDrawLoading(false)
    } else {
      drawRouteCoords.current = [...drawRouteCoords.current, [to.lng, to.lat]]
    }
    updateDrawLine()
  }

  function undoLastWaypoint() {
    if (drawWaypoints.length === 0) return
    drawMarkers.current.pop()?.remove()
    setDrawWaypoints((prev) => {
      const next = prev.slice(0, -1)
      if (!snapToRoad) {
        drawRouteCoords.current = next.map((wp) => [wp.lng, wp.lat])
      } else if (next.length <= 1) {
        drawRouteCoords.current = next.length === 1 ? [[next[0].lng, next[0].lat]] : []
      }
      updateDrawLine()
      return next
    })
  }

  function handleFinishDraw() {
    const coords = drawRouteCoords.current
    if (coords.length < 2) return
    const totalDistance = coords.slice(1).reduce((acc, c, i) => {
      return acc + haversine(coords[i][1], coords[i][0], c[1], c[0])
    }, 0)
    onDrawComplete?.({
      geometry: { type: 'LineString', coordinates: coords },
      stats: { distance_m: Math.round(totalDistance), num_points: coords.length },
    })
  }

  function handleStyleChange(styleUrl) {
    setMapStyle(styleUrl)
    localStorage.setItem('mapStyle', styleUrl)
    map.current?.setStyle(styleUrl)
    map.current?.once('style.load', () => {
      // Re-add activities source + layers
      if (!map.current.getSource(ACT_SOURCE)) {
        map.current.addSource(ACT_SOURCE, { type: 'geojson', data: buildGeoJSON(activitiesRef.current) })
        map.current.addLayer({
          id: ACT_LINES_LAYER, type: 'line', source: ACT_SOURCE,
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': 0.85 },
        })
        map.current.addLayer({
          id: ACT_POINTS_LAYER, type: 'circle', source: ACT_SOURCE,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: { 'circle-color': ['get', 'color'], 'circle-radius': 7, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff' },
        })
        const selId = selectedActivityId || ''
        map.current.addLayer({
          id: 'selected-line', type: 'line', source: ACT_SOURCE,
          filter: ['==', ['get', 'id'], selId],
          paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 1 },
        })
        map.current.addLayer({
          id: 'selected-point', type: 'circle', source: ACT_SOURCE,
          filter: ['==', ['get', 'id'], selId],
          paint: { 'circle-color': ['get', 'color'], 'circle-radius': 11, 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff' },
        })
      }
      // Re-add draw layer
      if (!map.current.getSource(DRAW_SOURCE)) {
        map.current.addSource(DRAW_SOURCE, {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: drawRouteCoords.current } },
        })
        map.current.addLayer({
          id: DRAW_LAYER, type: 'line', source: DRAW_SOURCE,
          paint: { 'line-color': '#3B82F6', 'line-width': 3, 'line-dasharray': [2, 1] },
        })
      }
    })
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <MapStyleSelector currentStyle={mapStyle} onStyleChange={handleStyleChange} />

      {mode === 'place-marker' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none select-none">
          Cliquez sur la carte pour placer un marqueur
        </div>
      )}

      {mode === 'draw' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">
            {drawWaypoints.length === 0
              ? 'Cliquez pour démarrer votre tracé'
              : `${drawWaypoints.length} point${drawWaypoints.length > 1 ? 's' : ''} placé${drawWaypoints.length > 1 ? 's' : ''}`}
          </span>
          {drawLoading && <span className="text-xs text-blue-500">Calcul itinéraire...</span>}
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={snapToRoad}
              onChange={(e) => setSnapToRoad(e.target.checked)}
              className="rounded accent-blue-600"
            />
            Snap to road
          </label>
          {drawWaypoints.length > 0 && (
            <button
              onClick={undoLastWaypoint}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Annuler dernier
            </button>
          )}
          {drawWaypoints.length >= 2 && (
            <button
              onClick={handleFinishDraw}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Terminer le tracé
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180
  const dp = ((lat2 - lat1) * Math.PI) / 180
  const dl = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
