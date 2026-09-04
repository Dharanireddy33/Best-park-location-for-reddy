import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { area as turfArea, point as turfPoint, nearestPointOnLine, distance as turfDistance } from '@turf/turf'
import ParkForm from './ParkForm'
import CityMap from './CityMap'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const RECENT_SEARCHES_KEY = 'recent_searches'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [searchMessage, setSearchMessage] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedResult, setSelectedResult] = useState(null)
  const [selectedGeometry, setSelectedGeometry] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [airQuality, setAirQuality] = useState(null)
  const [airQualityLoading, setAirQualityLoading] = useState(false)
  const [airQualityError, setAirQualityError] = useState('')
  const [predictionResult, setPredictionResult] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      navigate('/login')
      return
    }

    const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (storedSearches) {
      try {
        setRecentSearches(JSON.parse(storedSearches))
      } catch {
        setRecentSearches([])
      }
    }

    const getProfile = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        })
        const data = await response.json()
        setUser(data)
      } catch (err) {
        localStorage.removeItem('access_token')
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }
    getProfile()
  }, [navigate])

  const saveSearch = (newSearch) => {
    const nextSearches = [newSearch, ...recentSearches].slice(0, 5)
    setRecentSearches(nextSearches)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextSearches))
  }

  const handlePrediction = (prediction) => {
    setPredictionResult(prediction)
  }

  const handleSelectionChange = (selection) => {
    setSelectedGeometry(selection)
  }

  const normalizeResult = (item) => {
    const address = item.address || {}
    const cityName = address.city || address.town || address.village || address.hamlet || address.county || item.display_name
    const district = address.state_district || address.city_district || address.county || address.suburb || address.state || 'Unknown district'
    const population = item.extratags?.population || 'Unknown'
    const coordinates = `${item.lat}, ${item.lon}`
    const bbox = item.boundingbox || []
    const mapUrl = bbox.length === 4
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox[2]}%2C${bbox[0]}%2C${bbox[3]}%2C${bbox[1]}&layer=mapnik&marker=${item.lat}%2C${item.lon}`
      : `https://www.openstreetmap.org/export/embed.html?marker=${item.lat}%2C${item.lon}`

    return {
      id: item.place_id,
      name: cityName,
      population,
      district,
      coordinates,
      lat: item.lat,
      lon: item.lon,
      mapUrl,
      link: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=13/${item.lat}/${item.lon}`,
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    setError('')
    setSearchMessage('')
    setSearchResults([])
    setAnalysis(null)

    const cityValue = city.trim()
    const areaValue = area.trim()
    if (!cityValue && !areaValue) {
      setSearchMessage('Please search for a city or area.')
      return
    }

    const query = [cityValue, areaValue].filter(Boolean).join(' ')
    saveSearch({ query, date: new Date().toLocaleString() })
    setSearchLoading(true)
    setSearchMessage(`Searching for ${query}`)

    try {
      const response = await fetch(
        `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&extratags=1&limit=5&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      )
      if (!response.ok) {
        throw new Error('Location search failed')
      }
      const payload = await response.json()
      const results = payload.map(normalizeResult)
      setSearchResults(results)
      setSelectedResult(results[0] || null)
      setSearchMessage(`Showing ${payload.length} result(s) for ${query}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSearchLoading(false)
      setCity('')
      setArea('')
    }
  }

  const getQueryBounds = () => {
    if (selectedGeometry?.bbox?.length === 4) {
      return selectedGeometry.bbox.join(',')
    }
    if (selectedResult) {
      const lat = Number(selectedResult.lat)
      const lon = Number(selectedResult.lon)
      const delta = 0.0125
      return `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`
    }
    return null
  }

  const getQueryCenter = () => {
    if (selectedGeometry?.centroid) {
      return selectedGeometry.centroid
    }
    if (selectedResult) {
      return [Number(selectedResult.lat), Number(selectedResult.lon)]
    }
    return null
  }

  const fetchAirQuality = async (signal) => {
    const center = getQueryCenter()
    if (!center) {
      setAirQuality(null)
      return
    }

    setAirQualityLoading(true)
    setAirQualityError('')
    try {
      const [lat, lon] = center
      const response = await fetch(`${API_BASE_URL}/air-quality?lat=${lat}&lon=${lon}`, {
        signal,
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Air quality lookup failed')
      }
      const payload = await response.json()
      setAirQuality(payload)
    } catch (err) {
      if (signal.aborted) return
      setAirQualityError(err.message)
      setAirQuality(null)
    } finally {
      setAirQualityLoading(false)
    }
  }

  const generateReport = async () => {
    if (!analysis || !predictionResult) {
      setReportError('Report generation requires a prediction and selected land analysis.')
      return
    }

    setReportLoading(true)
    setReportError('')

    const populationValue = Number(predictionResult?.values?.Population || selectedResult?.population || '')
    const reportPayload = {
      location_name: selectedResult?.name,
      selected_area_description: selectedResult?.name || 'Selected land area',
      area_sqm: analysis.landArea,
      area_hectares: analysis.landAreaHectares,
      area_acres: analysis.landAreaAcres,
      population: !Number.isNaN(populationValue) && populationValue > 0 ? populationValue : undefined,
      aqi: airQuality?.aqi,
      air_quality_category: airQuality?.category,
      pm2_5: airQuality?.pm2_5,
      pm10: airQuality?.pm10,
      co: airQuality?.co,
      no2: airQuality?.no2,
      o3: airQuality?.o3,
      suitability_score: predictionResult.result.score,
      recommendation: predictionResult.result.recommended,
      stars: predictionResult.result.stars,
    }

    try {
      const response = await fetch(`${API_BASE_URL}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Unable to generate report')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'park-report.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setReportError(err.message)
    } finally {
      setReportLoading(false)
    }
  }

  const fetchAnalysis = async (signal) => {
    const bounds = getQueryBounds()
    const center = getQueryCenter()
    if (!bounds || !center) {
      setAnalysis(null)
      return
    }

    setAnalysisLoading(true)
    setAnalysisError('')
    try {
      const query = `
[out:json][timeout:25];
(
  node["amenity"="school"](${bounds});
  way["amenity"="school"](${bounds});
  node["amenity"="hospital"](${bounds});
  way["amenity"="hospital"](${bounds});
  node["leisure"="park"](${bounds});
  way["leisure"="park"](${bounds});
  node["landuse"="recreation_ground"](${bounds});
  way["landuse"="recreation_ground"](${bounds});
  node["natural"~"wood|grass|scrub|wetland"](${bounds});
  way["natural"~"wood|grass|scrub|wetland"](${bounds});
  node["landuse"~"forest|grass|meadow|orchard|vineyard"](${bounds});
  way["landuse"~"forest|grass|meadow|orchard|vineyard"](${bounds});
  node["building"](${bounds});
  way["building"](${bounds});
  node["highway"](${bounds});
  way["highway"](${bounds});
  node["waterway"](${bounds});
  way["waterway"](${bounds});
  node["natural"="water"](${bounds});
  way["natural"="water"](${bounds});
);
out center geom qt;
`

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        signal,
        headers: {
          'Content-Type': 'text/plain',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch land analysis')
      }

      const data = await response.json()
      const elements = data.elements || []

      const counts = {
        schools: 0,
        hospitals: 0,
        parks: 0,
        buildings: 0,
        waterBodies: 0,
        roadFeatures: 0,
      }
      const roadDistances = []
      let greenArea = 0
      const centerPoint = turfPoint([center[1], center[0]])

      elements.forEach((element) => {
        const tags = element.tags || {}
        if (tags.amenity === 'school') counts.schools += 1
        if (tags.amenity === 'hospital') counts.hospitals += 1
        if (tags.leisure === 'park' || tags.landuse === 'recreation_ground') counts.parks += 1
        if (tags.building) counts.buildings += 1
        if (tags.waterway || tags.natural === 'water') counts.waterBodies += 1
        if (tags.highway) counts.roadFeatures += 1

        if (tags.highway && element.geometry) {
          const lineCoords = element.geometry.map((point) => [point.lon, point.lat])
          const lineFeature = {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: lineCoords },
          }
          try {
            const nearest = nearestPointOnLine(lineFeature, centerPoint, { units: 'kilometers' })
            const dist = turfDistance(centerPoint, nearest, { units: 'kilometers' })
            roadDistances.push(dist * 1000)
          } catch {
            // ignore invalid geometry
          }
        }

        if ((tags.natural || tags.landuse || tags.leisure) && element.geometry) {
          const geojson = {
            type: 'Feature',
            geometry: element.type === 'node'
              ? { type: 'Point', coordinates: [element.lon, element.lat] }
              : { type: 'Polygon', coordinates: [element.geometry.map((point) => [point.lon, point.lat])] },
          }
          try {
            greenArea += turfArea(geojson)
          } catch {
            // ignore geometry errors
          }
        }
      })

      const landAreaSqm = selectedGeometry?.totalArea || (Math.PI * 1000 * 1000)
      const greenCover = selectedGeometry?.totalArea
        ? Math.min(100, Math.round((greenArea / selectedGeometry.totalArea) * 100))
        : Math.min(100, Math.round((counts.parks + counts.waterBodies) * 7))
      const roadDistanceMeters = roadDistances.length > 0 ? Math.min(...roadDistances) : null

      setAnalysis({
        landArea: landAreaSqm,
        landAreaAcres: landAreaSqm * 0.000247105,
        landAreaHectares: landAreaSqm * 0.0001,
        nearbySchools: counts.schools,
        existingParks: counts.parks,
        buildingsNearby: counts.buildings,
        hospitalsNearby: counts.hospitals,
        waterBodies: counts.waterBodies,
        roadDistance: roadDistanceMeters,
        greenCover,
      })
    } catch (err) {
      if (signal.aborted) return
      setAnalysisError(err.message)
      setAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedResult && !selectedGeometry) {
      return
    }

    const controller = new AbortController()
    fetchAnalysis(controller.signal)
    fetchAirQuality(controller.signal)
    return () => controller.abort()
  }, [selectedResult, selectedGeometry])

  const logout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  if (loading) {
    return <div className="page"><div className="card">Loading your dashboard�</div></div>
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-top card">
        <div>
          <h1>Welcome {user?.full_name || 'Park planner'}</h1>
          <p>Search a city or area to find coordinates, district, population, and a map powered by OpenStreetMap.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="button button-secondary" to="/">Home</Link>
          <button className="button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="user-profile card">
          <h2>Profile</h2>
          <p><strong>Name:</strong> {user?.full_name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
        </section>

        <section className="search-panel card">
          <h2>Search City / Area</h2>
          <form className="search-form" onSubmit={handleSearch}>
            <label>Search City</label>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Chennai, Coimbatore, Anna Nagar"
            />
            <label>Search Area</label>
            <input
              type="text"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              placeholder="District, neighborhood, or city area"
            />
            <button type="submit" disabled={searchLoading}>
              {searchLoading ? 'Searching�' : 'Search location'}
            </button>
          </form>
          {searchMessage && <div className="message">{searchMessage}</div>}
          {error && <div className="error">{error}</div>}
        </section>

        <section className="recent-searches card">
          <h2>Recent Searches</h2>
          {recentSearches.length === 0 ? (
            <p>No recent searches yet. Use the search form to get started.</p>
          ) : (
            <ul>
              {recentSearches.map((item, index) => (
                <li key={`${item.query}-${index}`}>
                  <strong>{item.query}</strong>
                  <span>{item.date}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="prediction-panel card">
          <h2>Park suitability predictor</h2>
          <ParkForm onPrediction={handlePrediction} />
        </section>
      </div>

      {searchResults.length > 0 ? (
        <>
          <section className="search-results card">
            <h2>Search Results</h2>
            <div className="results-grid">
              {searchResults.map((item) => (
                <article
                  key={item.id}
                  className={`result-card ${selectedResult?.id === item.id ? 'selected' : ''}`}
                >
                  <div className="result-info">
                    <h3>{item.name}</h3>
                    <p><strong>District:</strong> {item.district}</p>
                    <p><strong>Population:</strong> {item.population}</p>
                    <p><strong>Coordinates:</strong> {item.coordinates}</p>
                    <div className="result-actions">
                      <button type="button" className="button button-secondary" onClick={() => setSelectedResult(item)}>
                        Show on map
                      </button>
                      <a href={item.link} target="_blank" rel="noreferrer" className="button button-secondary">
                        OpenStreetMap
                      </a>
                    </div>
                  </div>
                  {selectedResult?.id === item.id && (
                    <div className="map-embed-wrapper">
                      <iframe
                        title={`map-${item.id}`}
                        src={item.mapUrl}
                        width="100%"
                        height="240"
                        style={{ border: 0, borderRadius: '16px' }}
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="interactive-map card">
            <h2>Interactive City Map</h2>
            <CityMap location={selectedResult} onSelectionChange={handleSelectionChange} />
          </section>

          <section className="land-analysis card">
            <h2>Land Analysis</h2>
            {analysisLoading ? (
              <p>Analyzing selected land and surroundings…</p>
            ) : analysisError ? (
              <div className="error">{analysisError}</div>
            ) : analysis ? (
              <>
                <div className="analysis-grid">
                  <div className="analysis-card">
                    <strong>Land Area</strong>
                    <span>{analysis.landArea.toFixed(2)} m²</span>
                    <span>{analysis.landAreaHectares.toFixed(4)} ha</span>
                    <span>{analysis.landAreaAcres.toFixed(4)} acres</span>
                  </div>
                  <div className="analysis-card">
                    <strong>Nearby Schools</strong>
                    <span>{analysis.nearbySchools}</span>
                  </div>
                  <div className="analysis-card">
                    <strong>Road Distance</strong>
                    <span>{analysis.roadDistance != null ? `${analysis.roadDistance.toFixed(0)} m` : 'No road data'}</span>
                  </div>
                  <div className="analysis-card">
                    <strong>Green Cover</strong>
                    <span>{analysis.greenCover}%</span>
                  </div>
                  {airQuality && (
                    <div className="analysis-card">
                      <strong>Air Quality</strong>
                      <span>AQI {airQuality.aqi}</span>
                      <span>{airQuality.category}</span>
                    </div>
                  )}
                </div>
                {airQualityLoading && <p>Loading air quality data…</p>}
                {airQualityError && <div className="error">{airQualityError}</div>}
                {predictionResult && (
                  <div className="report-actions">
                    <button type="button" className="button" onClick={generateReport} disabled={reportLoading}>
                      {reportLoading ? 'Generating PDF report…' : 'Download PDF Report'}
                    </button>
                    {reportError && <div className="error">{reportError}</div>}
                  </div>
                )}
              </>
            ) : (
              <p>Select or draw a boundary on the map to see land analysis.</p>
            )}
            {analysis && (
              <div className="analysis-summary">
                <p><strong>Existing parks:</strong> {analysis.existingParks}</p>
                <p><strong>Buildings nearby:</strong> {analysis.buildingsNearby}</p>
                <p><strong>Hospitals:</strong> {analysis.hospitalsNearby}</p>
                <p><strong>Water bodies:</strong> {analysis.waterBodies}</p>
                {airQuality && (
                  <>
                    <p><strong>PM2.5:</strong> {airQuality.pm2_5} μg/m³</p>
                    <p><strong>PM10:</strong> {airQuality.pm10} μg/m³</p>
                    <p><strong>CO:</strong> {airQuality.co} μg/m³</p>
                    <p><strong>NO₂:</strong> {airQuality.no2} μg/m³</p>
                    <p><strong>O₃:</strong> {airQuality.o3} μg/m³</p>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
