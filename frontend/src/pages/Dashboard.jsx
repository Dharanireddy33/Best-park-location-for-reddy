import React, { useState } from 'react'
import api from '../services/api'
import Map from '../components/Map'

function Dashboard() {
  const [query, setQuery] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    if (!query.trim()) {
      setError('Please enter a city or urban area name.')
      setLoading(false)
      return
    }

    try {
      const response = await api.get('/api/location/analysis', {
        params: { location: query },
      })
      setAnalysis(response.data)
    } catch (err) {
      setAnalysis(null)
      setError(err.response?.data?.detail || 'Location not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Park Planning Dashboard</h1>
          <p>Search an urban area to evaluate park location demand.</p>
        </div>

        <form className="dashboard-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search city or area"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
      </div>

      {error && <p className="dashboard-error">{error}</p>}

      {analysis ? (
        <div className="final-results-layout">
          <section className="result-summary-card">
            <h2>PARK LOCATION ANALYSIS</h2>
            <div className="result-row">
              <span>Area:</span>
              <strong>{analysis.name}</strong>
            </div>
            <div className="analysis-grid">
              <div className="data-row">
                <span>Population</span>
                <strong>{analysis.population.toLocaleString()}</strong>
              </div>
              <div className="data-row">
                <span>Density</span>
                <strong>{analysis.population_density.toLocaleString()} /km²</strong>
              </div>
              <div className="data-row">
                <span>AQI</span>
                <strong>{analysis.pollution.aqi}</strong>
              </div>
              <div className="data-row">
                <span>Existing Parks</span>
                <strong>{analysis.existing_parks.count}</strong>
              </div>
              <div className="data-row">
                <span>Available Land</span>
                <strong>{analysis.available_land_km2} ha</strong>
              </div>
              <div className="data-row">
                <span>Nearest Park</span>
                <strong>{analysis.existing_parks.nearest_park} ({analysis.existing_parks.nearest_distance_km} km)</strong>
              </div>
            </div>

            <div className="demand-summary">
              <div>
                <span>Park Demand Score</span>
                <strong>{analysis.demand_score}/100</strong>
              </div>
            </div>

            <div className="recommendation-block">
              <span>RECOMMENDATION</span>
              <h3>{analysis.recommendation}</h3>
              <p>Recommended Area: {analysis.recommended_area}</p>
            </div>
          </section>

          <section className="result-map-card">
            <div className="map-card-header">
              <h3>Map</h3>
              <p>📍 Selected location and nearby park insights</p>
            </div>
            <Map position={[analysis.latitude, analysis.longitude]} />
          </section>

          <section className="dataset-details-card">
            <h2>COMPLETE DATASET DETAILS</h2>
            <div className="dataset-details-grid">
              {Object.entries(analysis.dataset_details || {}).map(([key, value]) => (
                <div className="data-row" key={key}>
                  <span>{key}</span>
                  <strong>{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 6 }) : value}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="dashboard-empty">
          <p>Search for an urban area like "Chennai" or "Anna Nagar" to display location analysis and map results.</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard
