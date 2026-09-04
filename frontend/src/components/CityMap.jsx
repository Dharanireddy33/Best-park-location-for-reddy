import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, FeatureGroup, useMapEvents } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import L from 'leaflet'
import { area as turfArea, centroid as turfCentroid } from '@turf/turf'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let defaultIcon = L.Icon.Default.prototype.options
defaultIcon.iconRetinaUrl = markerIcon2x
defaultIcon.iconUrl = markerIcon
defaultIcon.shadowUrl = markerShadow

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng)
    },
  })
  return null
}

export default function CityMap({ location, onSelectionChange }) {
  const [clickedPosition, setClickedPosition] = useState(null)
  const [drawnAreas, setDrawnAreas] = useState([])
  const featureGroupRef = useRef(null)
  const center = useMemo(() => {
    if (!location) {
      return [13.0827, 80.2707]
    }
    return [Number(location.lat), Number(location.lon)]
  }, [location])

  useEffect(() => {
    setClickedPosition(null)
    setDrawnAreas([])
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers()
    }
    onSelectionChange?.(null)
  }, [location, onSelectionChange])

  const computeArea = (layer) => {
    try {
      const geoJson = layer.toGeoJSON()
      const sqm = turfArea(geoJson)
      return sqm
    } catch {
      return 0
    }
  }

  const formatArea = (sqm) => {
    return {
      sqm: sqm.toFixed(2),
      acres: (sqm * 0.000247105).toFixed(4),
      hectares: (sqm * 0.0001).toFixed(4),
    }
  }

  const updateDrawnAreas = () => {
    const featureGroup = featureGroupRef.current
    if (!featureGroup) {
      setDrawnAreas([])
      onSelectionChange?.(null)
      return
    }
    const layers = featureGroup.getLayers() || []
    const shapes = layers.map((layer, index) => {
      const sqm = computeArea(layer)
      return {
        id: layer._leaflet_id || index,
        type: layer instanceof L.Circle ? 'Circle' : layer instanceof L.Polygon ? 'Polygon' : 'Shape',
        ...formatArea(sqm),
        geoJson: layer.toGeoJSON(),
      }
    })

    setDrawnAreas(shapes)

    if (shapes.length === 0) {
      onSelectionChange?.(null)
      return
    }

    const featureCollection = {
      type: 'FeatureCollection',
      features: shapes.map((shape) => shape.geoJson),
    }

    const totalArea = shapes.reduce((sum, shape) => sum + Number(shape.sqm), 0)
    const centroidFeature = turfCentroid(featureCollection)
    const centroidCoords = centroidFeature?.geometry?.coordinates || [center[1], center[0]]
    const bounds = featureGroup.getBounds()
    const bbox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()]

    onSelectionChange?.({
      geoJson: featureCollection,
      totalArea,
      centroid: [centroidCoords[1], centroidCoords[0]],
      bbox,
      shapes,
    })
  }

  const handleCreated = (e) => {
    const layer = e.layer
    const featureGroup = featureGroupRef.current
    if (featureGroup && layer) {
      featureGroup.addLayer(layer)
      updateDrawnAreas()
    }
  }

  const handleEdited = () => {
    updateDrawnAreas()
  }

  const handleDeleted = () => {
    updateDrawnAreas()
  }

  return (
    <div className="city-map">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        style={{ minHeight: '480px', borderRadius: '16px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              rectangle: true,
              polygon: true,
              circle: true,
              circlemarker: false,
              polyline: false,
              marker: false,
            }}
            edit={{
              edit: true,
              remove: true,
            }}
          />
        </FeatureGroup>
        {location && (
          <Marker position={center}>
            <Popup>{location.name}</Popup>
          </Marker>
        )}
        <ClickHandler onClick={setClickedPosition} />
        {clickedPosition && (
          <Marker position={[clickedPosition.lat, clickedPosition.lng]}>
            <Popup>
              Clicked at {clickedPosition.lat.toFixed(5)}, {clickedPosition.lng.toFixed(5)}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {drawnAreas.length > 0 && (
        <div className="drawn-area-summary">
          <h3>Selected land areas</h3>
          <ul>
            {drawnAreas.map((shape) => (
              <li key={shape.id}>
                <strong>{shape.type}</strong>: {shape.sqm} m² • {shape.hectares} ha • {shape.acres} acres
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
