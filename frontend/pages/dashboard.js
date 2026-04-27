import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('vulnerabilities')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [loading, setLoading] = useState(false)
  const [pocStatus, setPocStatus] = useState(null)
  const [patchStatus, setPatchStatus] = useState(null)
  const [selectedPocId, setSelectedPocId] = useState(1)
  const [pocContent, setPocContent] = useState('')
  const [generatedPocPath, setGeneratedPocPath] = useState('')
  const [selectedViewPocId, setSelectedViewPocId] = useState(1)
  const [viewPocContent, setViewPocContent] = useState('')
  const [viewPocStatus, setViewPocStatus] = useState(null)

  useEffect(() => {
    if (activeTab === 'vulnerabilities') {
      fetchVulnerabilities()
    }
  }, [activeTab])

  const fetchVulnerabilities = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/vulnerabilities`)
      setVulnerabilities(response.data)
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error)
    }
    setLoading(false)
  }

  const generatePOC = async (id = selectedPocId) => {
    setPocStatus({ type: 'info', message: `Generating POC ${id}...` })
    setPocContent('')
    setGeneratedPocPath('')

    try {
      const response = await axios.post(`${API_BASE}/poc/generate/${id}`)
      const message = response.data.message || `POC ${id} generated successfully`
      setPocStatus({ type: 'success', message })
      setPocContent(response.data.content || '')
      setGeneratedPocPath(response.data.poc_path || '')
    } catch (error) {
      console.error(error)
      setPocStatus({ type: 'error', message: 'Failed to generate POC' })
    }
  }

  const applyPOC = async (id = selectedPocId) => {
    setPocStatus({ type: 'info', message: `Applying POC ${id} to CyberGym...` })
    try {
      const response = await axios.post(`${API_BASE}/poc/apply/${id}`)
      setPocStatus({ type: 'success', message: response.data.message })
    } catch (error) {
      console.error(error)
      setPocStatus({ type: 'error', message: 'Failed to apply POC' })
    }
  }

  const viewPOC = async (id = selectedViewPocId) => {
    setViewPocStatus({ type: 'info', message: `Loading POC ${id}...` })
    setViewPocContent('')
    
    try {
      const response = await axios.get(`${API_BASE}/poc/view/${id}`)
      
      if (response.data.success) {
        setViewPocStatus({ type: 'success', message: response.data.message })
        setViewPocContent(response.data.content || '')
      } else {
        setViewPocStatus({ type: 'warning', message: response.data.message })
        setViewPocContent('')
      }
    } catch (error) {
      console.error(error)
      setViewPocStatus({ type: 'error', message: 'Failed to load POC' })
    }
  }

  const generatePatch = async () => {
    setPatchStatus({ type: 'info', message: 'Generating patch...' })
    try {
      const response = await axios.post(`${API_BASE}/patch/generate`)
      setPatchStatus({ type: 'success', message: `Patch generated: ${response.data.patch_path}` })
    } catch (error) {
      setPatchStatus({ type: 'error', message: 'Failed to generate patch' })
    }
  }

  const applyPatch = async () => {
    setPatchStatus({ type: 'info', message: 'Applying patch...' })
    try {
      const response = await axios.post(`${API_BASE}/patch/apply`)
      setPatchStatus({ type: 'success', message: response.data.message })
    } catch (error) {
      setPatchStatus({ type: 'error', message: 'Failed to apply patch' })
    }
  }

  return (
    <div className="dashboard">
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          GraphicsMagick
        </div>
        <div className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'vulnerabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('vulnerabilities')}
          >
            View Vulnerabilities
          </div>
          <div 
            className={`nav-item ${activeTab === 'poc' ? 'active' : ''}`}
            onClick={() => setActiveTab('poc')}
          >
            POC Generation
          </div>
          <div 
            className={`nav-item ${activeTab === 'patch' ? 'active' : ''}`}
            onClick={() => setActiveTab('patch')}
          >
            Patch Generation
          </div>
        </div>
        <button 
          className="collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <div className="main-content">
        <div className="content-header">
          <h1>
            {activeTab === 'vulnerabilities' && 'Vulnerabilities'}
            {activeTab === 'poc' && 'Proof of Concept (POC) Generation'}
            {activeTab === 'patch' && 'Patch Generation'}
          </h1>
        </div>

        {activeTab === 'vulnerabilities' && (
          <div className="vulnerability-list">
            {loading && <div>Loading vulnerabilities...</div>}
            {!loading && vulnerabilities.map((vuln, idx) => (
              <div key={idx} className="vuln-card">
                <div className="vuln-title">Vulnerability {idx + 1}</div>
                <div className="vuln-error">
                  <strong>Error Log:</strong>
                  <pre>{vuln.error_log}</pre>
                </div>
                <div className="vuln-description">
                  <strong>Description:</strong>
                  <p>{vuln.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'poc' && (
          <div>
            <div className="button-group">
              <label className="poc-dropdown-wrapper">
                <span>POC #</span>
                <select
                  value={selectedPocId}
                  onChange={(e) => setSelectedPocId(Number(e.target.value))}
                  className="poc-dropdown"
                >
                  {[1, 2, 3, 4, 5, 6].map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" onClick={() => generatePOC(selectedPocId)}>
                Generate POC
              </button>
              <button className="btn btn-primary" onClick={() => applyPOC(selectedPocId)}>
                Apply POC to CyberGym
              </button>
            </div>
            <div className="button-group">
              <label className="poc-dropdown-wrapper">
                <span>View POC #</span>
                <select
                  value={selectedViewPocId}
                  onChange={(e) => setSelectedViewPocId(Number(e.target.value))}
                  className="poc-dropdown"
                >
                  {[1, 2, 3, 4, 5, 6].map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-secondary" onClick={() => viewPOC(selectedViewPocId)}>
                View Generated POC
              </button>
            </div>
            {pocStatus && (
              <div className={`status-message ${pocStatus.type === 'error' ? 'status-error' : 'status-success'}`}>
                {pocStatus.message}
              </div>
            )}
            {viewPocStatus && (
              <div className={`status-message ${viewPocStatus.type === 'error' ? 'status-error' : viewPocStatus.type === 'warning' ? 'status-warning' : 'status-success'}`}>
                {viewPocStatus.message}
              </div>
            )}
            {pocContent && (
              <div className="poc-preview">
                <div className="poc-preview-header">
                  <strong>Generated POC #{selectedPocId}</strong>
                  {generatedPocPath && <span> — {generatedPocPath}</span>}
                </div>
                <pre>{pocContent}</pre>
              </div>
            )}
            {viewPocContent && (
              <div className="poc-preview">
                <div className="poc-preview-header">
                  <strong>Viewing POC #{selectedViewPocId}</strong>
                </div>
                <pre>{viewPocContent}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'patch' && (
          <div>
            <div className="button-group">
              <button className="btn btn-primary" onClick={generatePatch}>
                Generate Patch
              </button>
              <button className="btn btn-primary" onClick={applyPatch}>
                Apply Patch
              </button>
            </div>
            {patchStatus && (
              <div className={`status-message ${patchStatus.type === 'error' ? 'status-error' : 'status-success'}`}>
                {patchStatus.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
