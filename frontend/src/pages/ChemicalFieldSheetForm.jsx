import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const TIPO_AMOSTRADOR_OPTIONS = [
  'Tubo de Carvão Ativado',
  'Filtro de PVC',
  'Filtro de MCE',
  'Outro',
];

export default function ChemicalFieldSheetForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const prefilledCompanyId = searchParams.get('company_id');

  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(prefilledCompanyId || '');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeInput, setEmployeeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const empInputRef = useRef(null);

  const [form, setForm] = useState({
    funcao: '',
    matricula: '',
    setor: '',
    local: '',
    collection_date: new Date().toISOString().split('T')[0],
    numero_amostrador: '',
    tipo_amostrador: 'Tubo de Carvão Ativado',
    technician_name: '',
    situacao_ambiente: '',
    atividade: '',
    jornada_trabalho: '',
    volume_ar_amostrado: '',
    frequencia: '',
    tempo_exposicao_h: '',
    epi: '',
    observacoes: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedSheet, setSavedSheet] = useState(null);

  useEffect(() => {
    if (user?.name) setForm(f => ({ ...f, technician_name: user.name }));
    api.get('/companies').then(res => {
      setCompanies(res.data);
      if (prefilledCompanyId) {
        const c = res.data.find(c => String(c.id) === String(prefilledCompanyId));
        setCompany(c || null);
      }
    });
    if (prefilledCompanyId) {
      api.get(`/employees?company_id=${prefilledCompanyId}`).then(res => setEmployees(res.data));
    }
  }, [prefilledCompanyId, user]);

  const handleCompanyChange = (e) => {
    const cid = e.target.value;
    setSelectedCompanyId(cid);
    setSelectedEmployee(null);
    setEmployeeInput('');
    setEmployees([]);
    if (cid) {
      const c = companies.find(c => String(c.id) === cid);
      setCompany(c || null);
      api.get(`/employees?company_id=${cid}`).then(res => setEmployees(res.data));
    } else { setCompany(null); }
  };

  const filteredEmployees = employees.filter(e =>
    e.nome.toLowerCase().includes(employeeInput.toLowerCase())
  );

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setEmployeeInput(emp.nome);
    setShowSuggestions(false);
    // Pré-preencher campos do funcionário se disponíveis
    setForm(f => ({
      ...f,
      funcao:    emp.funcao    || f.funcao,
      matricula: emp.matricula || f.matricula,
      setor:     emp.setor     || f.setor,
      local:     emp.local     || f.local,
    }));
  };

  const handleEmployeeInputChange = (e) => {
    setEmployeeInput(e.target.value);
    setSelectedEmployee(null);
    setShowSuggestions(true);
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    // Validação dos campos obrigatórios
    const companyId = prefilledCompanyId || selectedCompanyId;
    if (!companyId) { setError('Selecione a empresa.'); return; }
    if (!employeeInput.trim()) { setError('Informe o nome do funcionário.'); return; }
    if (!form.funcao || !form.matricula || !form.setor || !form.local) {
      setError('Preencha os campos obrigatórios: Função, Matrícula, Setor e Local (*).');
      return;
    }
    if (!form.collection_date || !form.numero_amostrador || !form.tipo_amostrador || !form.technician_name) {
      setError('Preencha todos os campos de Identificação (*).');
      return;
    }
    setError(''); setLoading(true);
    try {
      const payload = {
        company_id:          parseInt(companyId),
        employee_id:         selectedEmployee ? selectedEmployee.id : null,
        employee_name_text:  selectedEmployee ? null : employeeInput.trim(),
        funcao:              form.funcao,
        matricula:           form.matricula,
        setor:               form.setor,
        local:               form.local,
        collection_date:     form.collection_date,
        numero_amostrador:   form.numero_amostrador,
        tipo_amostrador:     form.tipo_amostrador,
        technician_name:     form.technician_name,
        situacao_ambiente:   form.situacao_ambiente,
        atividade:           form.atividade   || null,
        jornada_trabalho:    form.jornada_trabalho || null,
        volume_ar_amostrado: form.volume_ar_amostrado || null,
        frequencia:          form.frequencia  || null,
        tempo_exposicao_h:   form.tempo_exposicao_h ? parseFloat(form.tempo_exposicao_h) : null,
        epi:                 form.epi         || null,
        observacoes:         form.observacoes || null,
        tipo_analise:        'Químico',
      };
      const res = await api.post('/chemical-field-sheets', payload);
      setSavedSheet(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) setError(detail.map(e => e.msg).join(', '));
      else setError(detail || err.message || 'Erro ao salvar ficha');
    } finally { setLoading(false); }
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (savedSheet) return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={() => navigate(`/companies/${prefilledCompanyId}`)}
            style={{ background: 'none', border: 'none', color: '#1a3d2b', fontSize: 14, cursor: 'pointer' }}
          >
            ← Voltar para a Empresa
          </button>
          <button
            onClick={() => navigate('/conference')}
            style={{ background: 'none', border: 'none', color: '#1a3d2b', fontSize: 14, cursor: 'pointer' }}
          >
            Avançar para Conferência →
          </button>
        </div>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 24, color: '#16a34a'
        }}>✓</div>
        <h2 style={{ color: '#16a34a', marginBottom: 8 }}>Ficha Química salva com sucesso!</h2>
        <p style={{ color: '#64748b', marginBottom: 32 }}>
          Funcionário: {savedSheet.employee_nome || employeeInput}<br />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            O Nº do Laudo e os agentes serão vinculados pelo admin na Conferência.
          </span>
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexDirection: 'column' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSavedSheet(null);
              setEmployeeInput('');
              setSelectedEmployee(null);
              setForm(f => ({
                ...f,
                funcao: '', matricula: '', setor: '', local: '',
                numero_amostrador: '', situacao_ambiente: '',
                atividade: '', jornada_trabalho: '', volume_ar_amostrado: '',
                frequencia: '', tempo_exposicao_h: '', epi: '', observacoes: '',
              }));
            }}
            style={{ padding: '12px 28px' }}
          >
            + Nova Ficha Química
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/companies/${prefilledCompanyId}`)}
            style={{ padding: '12px 28px' }}
          >
            Voltar para a Empresa
          </button>
        </div>
      </div>
    </div>
  );

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ficha de Campo Química</h1>
          <p className="page-subtitle">
            {company ? `Empresa: ${company.razao_social}` : 'Preencha os dados da coleta de agentes químicos'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
      </div>

      {/* ── SEÇÃO 1: Funcionário ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Funcionário</div>
        <div className="grid-2">

          {/* Seletor de empresa — só aparece quando não há company_id na URL */}
          {!prefilledCompanyId && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Empresa <span>*</span></label>
              <select className="form-input" value={selectedCompanyId} onChange={handleCompanyChange}>
                <option value="">Selecione a empresa...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
              </select>
            </div>
          )}

          {/* Campo de busca/nome do funcionário */}
          <div className="form-group" style={{ position: 'relative', gridColumn: '1 / -1' }}>
            <label className="form-label">Nome do Funcionário <span>*</span></label>
            <input
              ref={empInputRef}
              className="form-input"
              value={employeeInput}
              onChange={handleEmployeeInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Digite o nome do funcionário ou selecione do cadastro..."
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
                    {e.funcao && <div style={{ fontSize: 12, color: '#94a3b8' }}>{e.funcao}{e.matricula ? ` · ${e.matricula}` : ''}</div>}
                  </div>
                ))}
              </div>
            )}
            {selectedEmployee && (
              <span style={{ fontSize: 11, color: '#16a34a', marginTop: 4, display: 'block' }}>
                ✓ Funcionário do cadastro selecionado
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Função <span>*</span></label>
            <input name="funcao" className="form-input" value={form.funcao}
              onChange={handleChange} placeholder="Ex: Operador de Máquina" />
          </div>

          <div className="form-group">
            <label className="form-label">Matrícula <span>*</span></label>
            <input name="matricula" className="form-input" value={form.matricula}
              onChange={handleChange} placeholder="Ex: 12345" />
          </div>

          <div className="form-group">
            <label className="form-label">Setor <span>*</span></label>
            <input name="setor" className="form-input" value={form.setor}
              onChange={handleChange} placeholder="Ex: Produção" />
          </div>

          <div className="form-group">
            <label className="form-label">Local <span>*</span></label>
            <input name="local" className="form-input" value={form.local}
              onChange={handleChange} placeholder="Ex: Linha 02" />
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 2: Identificação ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Identificação</div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Data de Coleta <span>*</span></label>
            <input type="date" name="collection_date" className="form-input"
              value={form.collection_date} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Nº do Amostrador <span>*</span></label>
            <input name="numero_amostrador" className="form-input" value={form.numero_amostrador}
              onChange={handleChange} placeholder="Ex: AM-001" />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de Amostrador <span>*</span></label>
            <select name="tipo_amostrador" className="form-input" value={form.tipo_amostrador} onChange={handleChange}>
              {TIPO_AMOSTRADOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Técnico Responsável <span>*</span></label>
            <input name="technician_name" className="form-input" value={form.technician_name}
              onChange={handleChange} placeholder="Nome do técnico" />
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 3: Condições ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Condições do Ambiente</div>
        <div className="form-group">
          <label className="form-label">Situação do Ambiente</label>
          <textarea name="situacao_ambiente" className="form-input" value={form.situacao_ambiente}
            onChange={handleChange} rows={3}
            placeholder="Descreva as condições do ambiente durante a coleta (temperatura, ventilação, atividade em andamento...)" />
        </div>
      </div>

      {/* ── SEÇÃO 4: Dados Opcionais ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Dados Complementares <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>(opcionais)</span></div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Jornada de Trabalho</label>
            <input name="jornada_trabalho" className="form-input" value={form.jornada_trabalho}
              onChange={handleChange} placeholder="Ex: 44 Horas/Semanais" />
          </div>

          <div className="form-group">
            <label className="form-label">Volume de Ar Amostrado</label>
            <input name="volume_ar_amostrado" className="form-input" value={form.volume_ar_amostrado}
              onChange={handleChange} placeholder="Ex: 12,5 L" />
          </div>

          <div className="form-group">
            <label className="form-label">Frequência de Exposição</label>
            <input name="frequencia" className="form-input" value={form.frequencia}
              onChange={handleChange} placeholder="Ex: Diária" />
          </div>

          <div className="form-group">
            <label className="form-label">Tempo de Exposição (horas)</label>
            <input type="number" step="0.1" name="tempo_exposicao_h" className="form-input"
              value={form.tempo_exposicao_h} onChange={handleChange} placeholder="Ex: 8.5" />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Atividade Desenvolvida</label>
            <textarea name="atividade" className="form-input" value={form.atividade}
              onChange={handleChange} rows={2}
              placeholder="Descreva a atividade realizada durante a amostragem" />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">EPI Utilizado</label>
            <textarea name="epi" className="form-input" value={form.epi}
              onChange={handleChange} rows={2}
              placeholder="Liste os EPIs utilizados durante a coleta" />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Observações</label>
            <textarea name="observacoes" className="form-input" value={form.observacoes}
              onChange={handleChange} rows={2}
              placeholder="Outras observações relevantes" />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ padding: '12px 32px', fontSize: 15, flex: 1, justifyContent: 'center' }}
        >
          {loading ? 'Salvando...' : 'Salvar Ficha Química'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
