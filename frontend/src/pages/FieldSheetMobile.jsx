import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  saveOfflineSheet, getPendingSheets, markSynced,
  saveOfflineCache, getOfflineCache
} from '../offlineStorage'
import EpiInput from '../components/EpiInput'
import MatriculaToggle from '../components/MatriculaToggle'

export default function FieldSheetMobile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employeeInput, setEmployeeInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [newEmpFields, setNewEmpFields] = useState({ funcao: '', matricula: '', setor: '', local: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedSheet, setSavedSheet] = useState(null)
  const [epiOptions, setEpiOptions] = useState([])
  const [matriculaMode, setMatriculaMode] = useState('matricula')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const empInputRef = useRef(null)

  const [form, setForm] = useState({
    company_id: '',
    tipo_analise: 'Ruído',
    dosimeter_number: '',
    collection_date: new Date().toISOString().split('T')[0],
    epi: '',
    activity: '',
    machine_noise: '',
    technician_name_2: '',
    pre_verificacao_db: '114,00',
    pos_verificacao_db: '',
  })

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/companies')
        setCompanies(res.data)
        await saveOfflineCache('companies', res.data)
      } catch {
        const cached = await getOfflineCache('companies')
        if (cached) setCompanies(cached)
      }
      try {
        const res = await api.get('/epis')
        setEpiOptions(res.data)
        await saveOfflineCache('epis', res.data)
      } catch {
        const cached = await getOfflineCache('epis')
        if (cached) setEpiOptions(cached)
      }
    }
    load()
    getPendingSheets().then(p => setPendingCount(p.length))
  }, [])

  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine) return
      const pending = await getPendingSheets()
      for (const sheet of pending) {
        try {
          const { localId, savedAt, synced, ...payload } = sheet
          await api.post('/field-sheets', payload)
          await markSynced(localId)
        } catch (err) {
          console.error('Sync error:', localId, err)
        }
      }
      getPendingSheets().then(p => setPendingCount(p.length))
    }
    window.addEventListener('online', sync)
    sync()
    return () => window.removeEventListener('online', sync)
  }, [])

  const handleCompanyChange = async (e) => {
    const company_id = e.target.value
    setForm({ ...form, company_id })
    setSelectedEmployee(null)
    setEmployeeInput('')
    setNewEmpFields({ funcao: '', matricula: '', setor: '', local: '' })
    if (company_id) {
      try {
        const res = await api.get(`/employees?company_id=${company_id}`)
        setEmployees(res.data)
        await saveOfflineCache(`employees_${company_id}`, res.data)
      } catch {
        const cached = await getOfflineCache(`employees_${company_id}`)
        if (cached) setEmployees(cached)
      }
    } else setEmployees([])
  }

  const filteredEmployees = employees.filter(e =>
    e.nome.toLowerCase().includes(employeeInput.toLowerCase())
  )

  const isNewEmployee = employeeInput.trim() && !selectedEmployee

  const handleEmployeeInputChange = (e) => {
    setEmployeeInput(e.target.value)
    setSelectedEmployee(null)
    setShowSuggestions(true)
  }

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp)
    setEmployeeInput(emp.nome)
    setShowSuggestions(false)
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async () => {
    if (!form.company_id || !form.dosimeter_number ||
        !form.collection_date || !form.epi ||
        !form.activity || !form.machine_noise) {
      setError('Preencha todos os campos obrigatórios (*)')
      return
    }
    if (!selectedEmployee && !employeeInput.trim()) {
      setError('Informe o nome do funcionário.')
      return
    }
    const payload = {
      ...form,
      company_id: parseInt(form.company_id),
      dosimeter_number: parseInt(form.dosimeter_number),
      technician_name: user?.name || '',
      employee_id: selectedEmployee ? selectedEmployee.id : null,
      employee_name_text: selectedEmployee ? null : employeeInput.trim(),
      employee_funcao: selectedEmployee ? null : (newEmpFields.funcao || null),
      employee_matricula: selectedEmployee ? null : (newEmpFields.matricula || null),
      employee_setor: selectedEmployee ? null : (newEmpFields.setor || null),
      employee_local: selectedEmployee ? null : (newEmpFields.local || null),
      matricula_tipo: matriculaMode,
    }
    if (!navigator.onLine) {
      await saveOfflineSheet(payload)
      setSavedSheet({ offline: true, employee_nome: selectedEmployee?.nome || employeeInput.trim() })
      return
    }
    setError('')
    setLoading(true)
    try {
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
      if (form.epi) api.post('/epis', { name: form.epi }).catch(() => {})
      const res = await api.post('/field-sheets', payload)
      setSavedSheet({ ...res.data, offline: false })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg).join(', '))
      } else {
        setError(detail || err.message || 'Erro ao salvar ficha')
      }
    } finally { setLoading(false) }
  }

  const resetForm = () => {
    setSavedSheet(null)
    setEmployeeInput('')
    setSelectedEmployee(null)
    setNewEmpFields({ funcao: '', matricula: '', setor: '', local: '' })
    setMatriculaMode('matricula')
    setForm(f => ({ ...f, dosimeter_number: '', epi: '', activity: '', machine_noise: '', pos_verificacao_db: '' }))
    setError('')
    getPendingSheets().then(p => setPendingCount(p.length))
  }

  if (savedSheet) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 360, width: '100%' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: '#16a34a' }}>✓</div>
        <h2 style={{ color: '#16a34a', marginBottom: 8, fontSize: 20 }}>
          {savedSheet.offline ? 'Ficha salva localmente!' : 'Ficha salva com sucesso!'}
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>
          Funcionário: {savedSheet.employee_nome || '—'}
        </p>
        {savedSheet.offline && (
          <p style={{ color: '#d97706', fontSize: 13, marginBottom: 8 }}>
            Será sincronizada automaticamente quando houver conexão.
          </p>
        )}
        <button
          onClick={resetForm}
          style={{ marginTop: 16, width: '100%', padding: '14px 0', fontSize: 16, background: '#1a3d2b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
        >
          + Nova Ficha
        </button>
      </div>
    </div>
  )

  const ReadOnly = ({ label, value }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={value || '—'} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ficha de Campo - Ruído</h1>
          <p className="page-subtitle">Preencha os dados da coleta de dosimetria</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`badge ${isOnline ? 'badge-green' : 'badge-blue'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingCount > 0 && (
            <span className="badge badge-blue">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
          )}
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Funcionário</div>
        <div className="grid-2">

          <div className="form-group">
            <label className="form-label">Empresa <span>*</span></label>
            <select name="company_id" className="form-input" value={form.company_id} onChange={handleCompanyChange}>
              <option value="">Selecione...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Funcionário <span>*</span></label>
            <input
              ref={empInputRef}
              className="form-input"
              value={employeeInput}
              onChange={handleEmployeeInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={form.company_id ? 'Digite o nome do funcionário...' : 'Selecione a empresa primeiro'}
              disabled={!form.company_id}
              autoComplete="off"
            />
            {showSuggestions && filteredEmployees.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto' }}>
                {filteredEmployees.map(e => (
                  <div key={e.id}
                    onMouseDown={() => handleSelectEmployee(e)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontWeight: 500 }}>{e.nome}</div>
                    {e.funcao && <div style={{ fontSize: 12, color: '#94a3b8' }}>{e.funcao}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedEmployee && (
            <>
              <ReadOnly label="Função" value={selectedEmployee.funcao} />
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>{matriculaMode === 'cpf' ? 'CPF' : 'Matrícula'}</label>
                  <MatriculaToggle mode={matriculaMode} onChange={setMatriculaMode} />
                </div>
                <input className="form-input" value={selectedEmployee.matricula || '—'} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
              </div>
              <ReadOnly label="Setor" value={selectedEmployee.setor} />
              <ReadOnly label="Local" value={selectedEmployee.local} />
            </>
          )}

          {isNewEmployee && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 16px', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 10 }}>
                  Novo funcionário — preencha os dados adicionais (opcional)
                </div>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Função</label>
                    <input className="form-input" value={newEmpFields.funcao} onChange={e => setNewEmpFields(f => ({ ...f, funcao: e.target.value }))} placeholder="Ex: Operador de Máquina" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>{matriculaMode === 'cpf' ? 'CPF' : 'Matrícula'}</label>
                      <MatriculaToggle mode={matriculaMode} onChange={setMatriculaMode} />
                    </div>
                    <input className="form-input" value={newEmpFields.matricula} onChange={e => setNewEmpFields(f => ({ ...f, matricula: e.target.value }))} placeholder={matriculaMode === 'cpf' ? 'Ex: 123.456.789-00' : 'Ex: 12345'} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Setor</label>
                    <input className="form-input" value={newEmpFields.setor} onChange={e => setNewEmpFields(f => ({ ...f, setor: e.target.value }))} placeholder="Ex: Produção" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Local</label>
                    <input className="form-input" value={newEmpFields.local} onChange={e => setNewEmpFields(f => ({ ...f, local: e.target.value }))} placeholder="Ex: Linha 02" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Identificação</div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Tipo de Análise</label>
            <select name="tipo_analise" className="form-input" value={form.tipo_analise} onChange={e => {
              if (e.target.value === 'Químico') {
                navigate(form.company_id ? `/chemical-field-sheet/new?company_id=${form.company_id}` : '/chemical-field-sheet/new')
                return
              }
              handleChange(e)
            }}>
              <option value="Ruído">Ruído</option>
              <option value="Temperatura">Temperatura</option>
              <option value="Iluminância">Iluminância</option>
              <option value="Químico">Químico</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nº Dosímetro <span>*</span></label>
            <input type="number" name="dosimeter_number" className="form-input" value={form.dosimeter_number} onChange={handleChange} placeholder="Ex: 42" />
          </div>

          <div className="form-group">
            <label className="form-label">Data de Coleta <span>*</span></label>
            <input type="date" name="collection_date" className="form-input" value={form.collection_date} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Condições de Exposição</div>
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">EPI Utilizado <span>*</span></label>
          <EpiInput
            value={form.epi}
            onChange={val => setForm(f => ({ ...f, epi: val }))}
            options={epiOptions}
            setOptions={setEpiOptions}
            placeholder="Digite o EPI utilizado..." />
        </div>
        <div className="form-group">
          <label className="form-label">Atividade Desenvolvida <span>*</span></label>
          <textarea name="activity" className="form-input" value={form.activity} onChange={handleChange} placeholder="Descreva a atividade realizada durante a medição" />
        </div>
        <div className="form-group">
          <label className="form-label">Máquinas/Equipamentos Geradores de Ruído <span>*</span></label>
          <textarea name="machine_noise" className="form-input" value={form.machine_noise} onChange={handleChange} placeholder="Liste as máquinas e equipamentos presentes" />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: '12px 32px', fontSize: 15, flex: 1, justifyContent: 'center' }}>
          {loading ? 'Salvando...' : isOnline ? 'Salvar Ficha' : 'Salvar Offline'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ flex: 1, justifyContent: 'center' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
