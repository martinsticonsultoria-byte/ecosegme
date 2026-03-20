import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function FieldSheetForm() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextNumber, setNextNumber] = useState(null);
  const [form, setForm] = useState({
    company_id: '', employee_id: '', dosimeter_number: '',
    collection_date: '', epi: '', activity: '', machine_noise: '',
    technician_name: '', technician_name_2: '', signature_date: '', turno: '', codigo_esocial: '',
    pre_verificacao_db: '', pos_verificacao_db: '',
  });

  useEffect(() => {
    api.get('/companies').then(res => setCompanies(res.data));
    api.get('/field-sheets/next-number').then(res => setNextNumber(res.data.next_number));
  }, []);

  const handleCompanyChange = (e) => {
    const company_id = e.target.value;
    setForm({ ...form, company_id, employee_id: '' });
    if (company_id) api.get(`/employees?company_id=${company_id}`).then(res => setEmployees(res.data));
    else setEmployees([]);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.company_id || !form.employee_id || !form.dosimeter_number || !form.collection_date || !form.technician_name || !form.signature_date) {
      setError('Preencha todos os campos obrigatórios (*)'); return;
    }
    setError(''); setLoading(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      payload.company_id = parseInt(payload.company_id);
      payload.employee_id = parseInt(payload.employee_id);
      payload.dosimeter_number = parseInt(payload.dosimeter_number);
      const res = await api.post('/field-sheets', payload);
      navigate(`/conference?sheet_id=${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar ficha');
    } finally { setLoading(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nova Ficha de Campo</h1>
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
          <div className="form-group">
            <label className="form-label">Funcionário <span>*</span></label>
            <select name="employee_id" className="form-input" value={form.employee_id} onChange={handleChange} disabled={!form.company_id}>
              <option value="">Selecione...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nº do Laudo</label>
            <input className="form-input" value={nextNumber ? `#${nextNumber} (gerado automaticamente)` : 'Carregando...'} disabled style={{ background: '#f1f5f9', color: '#8a93a8' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Nº Dosímetro <span>*</span></label>
            <input type="number" name="dosimeter_number" className="form-input" value={form.dosimeter_number} onChange={handleChange} placeholder="Ex: 42" />
          </div>
          <div className="form-group">
            <label className="form-label">Data de Coleta <span>*</span></label>
            <input type="date" name="collection_date" className="form-input" value={form.collection_date} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            <input type="text" name="turno" className="form-input" value={form.turno} onChange={handleChange} placeholder="Ex: Manhã" />
          </div>
          <div className="form-group">
            <label className="form-label">Código eSocial</label>
            <input type="text" name="codigo_esocial" className="form-input" value={form.codigo_esocial} onChange={handleChange} placeholder="Ex: 01.01.021" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Condições de Exposição</div>
        <div className="form-group">
          <label className="form-label">EPI Utilizado</label>
          <input type="text" name="epi" className="form-input" value={form.epi} onChange={handleChange} placeholder="Ex: Protetor auricular tipo concha" />
        </div>
        <div className="form-group">
          <label className="form-label">Atividade Desenvolvida</label>
          <textarea name="activity" className="form-input" value={form.activity} onChange={handleChange} placeholder="Descreva a atividade realizada durante a medição" />
        </div>
        <div className="form-group">
          <label className="form-label">Máquinas/Equipamentos Geradores de Ruído</label>
          <textarea name="machine_noise" className="form-input" value={form.machine_noise} onChange={handleChange} placeholder="Liste as máquinas e equipamentos presentes" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Calibração e Assinatura</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Pré Verificação [dB]</label>
            <input type="text" name="pre_verificacao_db" className="form-input" value={form.pre_verificacao_db} onChange={handleChange} placeholder="Ex: 114,00" />
          </div>
          <div className="form-group">
            <label className="form-label">Pós Verificação [dB]</label>
            <input type="text" name="pos_verificacao_db" className="form-input" value={form.pos_verificacao_db} onChange={handleChange} placeholder="Ex: 114,00" />
          </div>
          <div className="form-group">
            <label className="form-label">Técnico Responsável <span>*</span></label>
            <input type="text" name="technician_name" className="form-input" value={form.technician_name} onChange={handleChange} placeholder="Nome do técnico" />
          </div>
          <div className="form-group">
            <label className="form-label">2º Técnico (colaborador)</label>
            <input type="text" name="technician_name_2" className="form-input" value={form.technician_name_2} onChange={handleChange} placeholder="Opcional — assina junto ao laudo" />
          </div>
          <div className="form-group">
            <label className="form-label">Data de Assinatura <span>*</span></label>
            <input type="date" name="signature_date" className="form-input" value={form.signature_date} onChange={handleChange} />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: '12px 32px', fontSize: 15 }}>
          {loading ? 'Salvando...' : '✓ Salvar e Ir para Conferência'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/companies')}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
