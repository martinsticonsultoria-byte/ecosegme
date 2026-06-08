import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  saveOfflineSheet, getPendingSheets, markSynced,
  saveOfflineCache, getOfflineCache
} from '../offlineStorage'

export default function FieldSheetMobile() {
  const { user } = useAuth()
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
        const opts = [...res.data.predefined, ...res.data.custom]
        setEpiOptions(opts)
        await saveOfflineCache('epis', opts)
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

  const inputStyle = { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, boxSizing: 'border-box', background: 'white' }
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }
  const fieldStyle = { marginBottom: 12 }
  const sectionStyle = { background: 'white', borderRadius: 12, padding: '16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }

  const ReadOnly = ({ label, value }) => (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }} value={value || '—'} disabled />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f0', paddingBottom: 24 }}>
      <div style={{ background: '#1a3d2b', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Ficha de Campo</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>EcoSegme Campo</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: isOnline ? 'rgba(255,255,255,0.15)' : 'rgba(255,200,0,0.2)', padding: '4px 10px', borderRadius: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#4ade80' : '#fbbf24', display: 'inline-block' }} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {pendingCount > 0 && (
            <div style={{ fontSize: 11, background: 'rgba(251,191,36,0.25)', color: '#fde68a', padding: '2px 8px', borderRadius: 20 }}>
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={sectionStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3d2b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Identificação</div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Empresa <span style={{ color: 'red' }}>*</span></label>
            <select name="company_id" style={inputStyle} value={form.company_id} onChange={handleCompanyChange}>
              <option value="">Selecione...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
            </select>
          </div>

          <div style={{ ...fieldStyle, position: 'relative' }}>
            <label style={labelStyle}>Funcionário <span style={{ color: 'red' }}>*</span></label>
            <input
              ref={empInputRef}
              style={{ ...inputStyle, background: form.company_id ? 'white' : '#f8fafc' }}
              value={employeeInput}
              onChange={handleEmployeeInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={form.company_id ? 'Digite o nome...' : 'Selecione a empresa primeiro'}
              disabled={!form.company_id}
              autoComplete="off"
            />
            {showSuggestions && filteredEmployees.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', border: '1px solid #d1d5db', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto' }}>
                {filteredEmployees.map(e => (
                  <div key={e.id}
                    onMouseDown={() => handleSelectEmployee(e)}
                    style={{ padding: '12px 14px', cursor: 'pointer', fontSize: 15, borderBottom: '1px solid #f1f5f9' }}
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
              <ReadOnly label="Matrícula" value={selectedEmployee.matricula} />
              <ReadOnly label="Setor" value={selectedEmployee.setor} />
              <ReadOnly label="Local" value={selectedEmployee.local} />
            </>
          )}

          {isNewEmployee && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 10 }}>Novo funcionário — dados opcionais</div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Função</label>
                <input style={inputStyle} value={newEmpFields.funcao} onChange={e => setNewEmpFields(f => ({ ...f, funcao: e.target.value }))} placeholder="Ex: Operador de Máquina" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Matrícula</label>
                <input style={inputStyle} value={newEmpFields.matricula} onChange={e => setNewEmpFields(f => ({ ...f, matricula: e.target.value }))} placeholder="Ex: 12345" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Setor</label>
                <input style={inputStyle} value={newEmpFields.setor} onChange={e => setNewEmpFields(f => ({ ...f, setor: e.target.value }))} placeholder="Ex: Produção" />
              </div>
              <div>
                <label style={labelStyle}>Local</label>
                <input style={inputStyle} value={newEmpFields.local} onChange={e => setNewEmpFields(f => ({ ...f, local: e.target.value }))} placeholder="Ex: Linha 02" />
              </div>
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Tipo de Análise</label>
            <select name="tipo_analise" style={inputStyle} value={form.tipo_analise} onChange={handleChange}>
              <option value="Ruído">Ruído</option>
              <option value="Temperatura">Temperatura</option>
              <option value="Iluminância">Iluminância</option>
              <option value="Químico">Químico</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Nº Dosímetro <span style={{ color: 'red' }}>*</span></label>
            <input type="number" name="dosimeter_number" style={inputStyle} value={form.dosimeter_number} onChange={handleChange} placeholder="Ex: 42" />
          </div>

          <div>
            <label style={labelStyle}>Data de Coleta <span style={{ color: 'red' }}>*</span></label>
            <input type="date" name="collection_date" style={inputStyle} value={form.collection_date} onChange={handleChange} />
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3d2b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Condições de Exposição</div>

          <div style={fieldStyle}>
            <label style={labelStyle}>EPI Utilizado <span style={{ color: 'red' }}>*</span></label>
            <input list="epi-list-mobile" name="epi" style={inputStyle}
              placeholder="Digite o EPI utilizado..."
              value={form.epi}
              onChange={e => setForm(f => ({ ...f, epi: e.target.value }))}
              autoComplete="off" />
            <datalist id="epi-list-mobile">
              {epiOptions.map(o => <option key={o} value={o} />)}
            </datalist>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Atividade Desenvolvida <span style={{ color: 'red' }}>*</span></label>
            <textarea name="activity" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.activity} onChange={handleChange} placeholder="Descreva a atividade realizada durante a medição" />
          </div>

          <div>
            <label style={labelStyle}>Máquinas/Equipamentos Geradores de Ruído <span style={{ color: 'red' }}>*</span></label>
            <textarea name="machine_noise" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.machine_noise} onChange={handleChange} placeholder="Liste as máquinas e equipamentos presentes" />
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 14, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '16px 0', fontSize: 17, fontWeight: 700, background: loading ? '#94a3b8' : '#1a3d2b', color: 'white', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Salvando...' : isOnline ? 'Salvar Ficha' : 'Salvar Offline'}
        </button>
      </div>
    </div>
  )
}
