import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function FieldSheetForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const prefilledCompanyId = searchParams.get('company_id');
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeInput, setEmployeeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextNumber, setNextNumber] = useState(null);
  const [savedSheet, setSavedSheet] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const empInputRef = useRef(null);

  const [form, setForm] = useState({
    company_id: prefilledCompanyId || '',
    tipo_analise: 'Ruído',
    dosimeter_number: '',
    collection_date: new Date().toISOString().split('T')[0],
    epi: '',
    activity: '',
    machine_noise: '',
    technician_name_2: '',
    pre_verificacao_db: '114,00',
    pos_verificacao_db: '',
  });

  useEffect(() => {
    api.get('/companies').then(res => setCompanies(res.data));
    api.get('/field-sheets/next-number').then(res => setNextNumber(res.data.next_number));
    if (prefilledCompanyId) {
      api.get(`/employees?company_id=${prefilledCompanyId}`).then(res => setEmployees(res.data));
    }
  }, []);

  const handleCompanyChange = (e) => {
    const company_id = e.target.value;
    setForm({ ...form, company_id });
    setSelectedEmployee(null);
    setEmployeeInput('');
    if (company_id) api.get(`/employees?company_id=${company_id}`).then(res => setEmployees(res.data));
    else setEmployees([]);
  };

  const filteredEmployees = employees.filter(e =>
    e.nome.toLowerCase().includes(employeeInput.toLowerCase())
  );

  const handleEmployeeInputChange = (e) => {
    setEmployeeInput(e.target.value);
    setSelectedEmployee(null);
    setShowSuggestions(true);
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setEmployeeInput(emp.nome);
    setShowSuggestions(false);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.company_id || !form.dosimeter_number || !form.collection_date || !form.epi || !form.activity || !form.machine_noise) {
      setError('Preencha todos os campos obrigatórios (*)'); return;
    }
    setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        company_id: parseInt(form.company_id),
        dosimeter_number: parseInt(form.dosimeter_number),
        technician_name: user?.name || '',
        employee_id: selectedEmployee ? selectedEmployee.id : null,
        employee_name_text: selectedEmployee ? null : employeeInput.trim(),
      };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      const res = await api.post('/field-sheets', payload);
      setSavedSheet(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg).join(', '));
      } else {
        setError(detail || err.message || 'Erro ao salvar ficha');
      }
    } finally { setLoading(false); }
  };

  const handleDownloadFicha = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/field-sheets/${savedSheet.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha_${String(savedSheet.laudo_number).padStart(4, '0')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Erro ao baixar ficha PDF.');
    } finally { setDownloading(false); }
  };

  if (savedSheet) return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: '#16a34a' }}>✓</div>
        <h2 style={{ color: '#16a34a', marginBottom: 8 }}>Ficha salva com sucesso!</h2>
        <p style={{ color: '#64748b', marginBottom: 32 }}>
          Ordem de Realização #{savedSheet.laudo_number} — {savedSheet.employee_nome || ''}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleDownloadFicha} disabled={downloading} style={{ padding: '12px 28px' }}>
            {downloading ? 'Gerando PDF...' : 'Baixar Ficha PDF'}
          </button>
          <button className="btn btn-primary" onClick={() => { setSavedSheet(null); setEmployeeInput(''); setSelectedEmployee(null); setNextNumber(n => n + 1); }} style={{ padding: '12px 28px' }}>
            + Nova Ficha
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/companies')} style={{ padding: '12px 28px' }}>
            Voltar para Empresas
          </button>
        </div>
      </div>
    </div>
  );

  const ReadOnly = ({ label, value }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={value || '—'} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ficha de Campo</h1>
          <p className="page-subtitle">Preencha os dados da coleta de dosimetria</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Identificação</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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
              placeholder={form.company_id ? 'Digite ou selecione o nome...' : 'Selecione a empresa primeiro'}
              disabled={!form.company_id}
              autoComplete="off"
            />
            {showSuggestions && filteredEmployees.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'white', border: '1px solid #d1d5db', borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto'
              }}>
                {filteredEmployees.map(e => (
                  <div key={e.id}
                    onMouseDown={() => handleSelectEmployee(e)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontWeight: 500 }}>{e.nome}</div>
                    {e.funcao && <div style={{ fontSize: 12, color: '#94a3b8' }}>{e.funcao} {e.matricula ? `· ${e.matricula}` : ''}</div>}
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

          <div className="form-group">
            <label className="form-label">Tipo de Análise</label>
            <select name="tipo_analise" className="form-input" value={form.tipo_analise} onChange={handleChange}>
              <option value="Ruído">Ruído</option>
              <option value="Temperatura">Temperatura</option>
              <option value="Iluminância">Iluminância</option>
              <option value="Químico">Químico</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ordem de Realização</label>
            <input className="form-input" value={nextNumber ? `#${nextNumber} (automático)` : 'Carregando...'} disabled style={{ background: '#f8fafc', color: '#94a3b8' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Nº Dosímetro <span>*</span></label>
            <input type="number" name="dosimeter_number" className="form-input" value={form.dosimeter_number} onChange={handleChange} placeholder="Ex: 42" />
          </div>

          <div className="form-group">
            <label className="form-label">Data de Coleta <span>*</span></label>
            <input type="date" name="collection_date" className="form-input" value={form.collection_date} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
          </div>

        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Condições de Exposição</div>
        <div className="form-group">
          <label className="form-label">EPI Utilizado <span>*</span></label>
          <select name="epi" className="form-input" value={form.epi} onChange={handleChange}>
            <option value="">Selecione o EPI...</option>
            <option>Protetor Auricular - Plug de Inserção</option>
            <option>Protetor Auricular - Tipo Concha</option>
            <option>Protetor Auricular - Semi-auricular</option>
            <option>Capacete de Segurança</option>
            <option>Óculos de Proteção</option>
            <option>Luvas de Proteção</option>
            <option>Abafador de Ruído</option>
            <option>Máscara de Proteção Respiratória</option>
            <option>Calçado de Segurança</option>
            <option>Ausência de EPI</option>
          </select>
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

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: '12px 32px', fontSize: 15 }}>
          {loading ? 'Salvando...' : 'Salvar Ficha'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/companies')}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
