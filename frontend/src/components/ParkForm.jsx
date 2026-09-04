import React, { useState } from 'react'

export default function ParkForm({ onPrediction }){
  const [form, setForm] = useState({
    Population: '',
    ExistingParks: '',
    LandArea: '',
    AQI: '',
    GreenCover: '',
    Schools: '',
    Hospitals: '',
    Roads: ''
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    // Basic validation
    const required = ['Population','ExistingParks','LandArea','AQI','GreenCover','Schools','Hospitals','Roads']
    for (const key of required){
      if (form[key] === '' || form[key] == null){
        setError('Please fill all fields')
        return
      }
    }

    const payload = {
      Population: Number(form.Population),
      ExistingParks: Number(form.ExistingParks),
      LandArea: Number(form.LandArea),
      AQI: Number(form.AQI),
      GreenCover: Number(form.GreenCover),
      Schools: Number(form.Schools),
      Hospitals: Number(form.Hospitals),
      Roads: Number(form.Roads),
    }

    setLoading(true)
    try{
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      const nextResult = {
        score: data.score ?? (data.prediction === 1 ? 92 : 28),
        recommended: data.recommended ?? (data.prediction === 1 ? 'Recommended' : 'Not Recommended'),
        stars: data.stars ?? (data.prediction === 1 ? 5 : 2),
      }
      setResult(nextResult)
      if (typeof onPrediction === 'function') {
        onPrediction({ values: payload, result: nextResult })
      }
    }catch(err){
      setError(err.message)
    }finally{
      setLoading(false)
    }
  }

  return (
    <form className="park-form" onSubmit={handleSubmit}>
      <div className="row">
        <label>Population</label>
        <input name="Population" value={form.Population} onChange={handleChange} type="number" />
      </div>
      <div className="row">
        <label>Existing Parks</label>
        <input name="ExistingParks" value={form.ExistingParks} onChange={handleChange} type="number" />
      </div>
      <div className="row">
        <label>Land Area (m²)</label>
        <input name="LandArea" value={form.LandArea} onChange={handleChange} type="number" />
      </div>
      <div className="row">
        <label>AQI</label>
        <input name="AQI" value={form.AQI} onChange={handleChange} type="number" />
      </div>
      <div className="row">
        <label>Green Cover (%)</label>
        <input name="GreenCover" value={form.GreenCover} onChange={handleChange} type="number" />
      </div>
      <div className="row">
        <label>Schools</label>
        <input name="Schools" value={form.Schools} onChange={handleChange} type="number" />
      </div>
      <div className="row">
        <label>Hospitals</label>
        <input name="Hospitals" value={form.Hospitals} onChange={handleChange} type="number" />
      </div>
      <div className="row">
        <label>Roads</label>
        <input name="Roads" value={form.Roads} onChange={handleChange} type="number" />
      </div>

      <div className="actions">
        <button type="submit" disabled={loading}>{loading ? 'Predicting...' : 'Predict'}</button>
      </div>

      {error && <div className="error">{error}</div>}
      {result && (
        <div className="area-score">
          <h2>Suitability Score</h2>
          <div className="score-badge">
            <div className="percent">{result.score}%</div>
            <div className="label">{result.recommended}</div>
            <div className="stars" aria-label={`${result.stars} out of 5 stars`}>
              {"★".repeat(result.stars)}{"☆".repeat(5 - result.stars)}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
