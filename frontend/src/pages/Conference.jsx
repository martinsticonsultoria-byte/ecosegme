import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// ─── Visão de detalhe: tabela de fichas de uma empresa ───────────────────────
function ConferenceDetail({ group, onBack, onReload }) {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState(group.sheets);
  const [uploadFile, setUploadFile] = useState({});
  const [uploading, setUploading] = useState({});
  const [uploadResult, setUploadResult] = useState({});
  const [generating, setGenerating] = useState({});
  const [reports, setReports] = useState({});
  const [approving, setApproving] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [expandedUpload, setExpandedUpload] = useState(null);
  const [genBulkPdf, setGenBulkPdf] = useState(false);
  const [genBulkXls, setGenBulkXls] = useState(false);
  const [errors, setErrors] = useState({});

  const StatusBadge = ({ status }) => {
    const s = status === 'aprovada'
      ? { bg: '#dcfce7', color: '#166534', label: 'Aprovada' }
      : { bg: '#fef9c3', color: '#854d0e', label: 'Pendente' };
    return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  const handleApprove = async (sheetId) => {
    setApproving(a => ({ ...a, [sheetId]: true }));
    try {
      await api.patch(`/field-sheets/${sheetId}/status`, { status: 'aprovada' });
      setSheets(s => s.map(x => x.id === sheetId ? { ...x, status: 'aprovada' } : x));
      onReload();
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao aprovar' }));
    } finally { setApproving(a => ({ ...a, [sheetId]: false })); }
  };

  const handleDownloadFicha = async (sheet) => {
    try {
      const res = await api.get(`/field-sheets/${sheet.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha_${String(sheet.laudo_number).padStart(4, '0')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { setErrors(e => ({ ...e, [sheet.id]: 'Erro ao baixar ficha.' })); }
  };

  const handleUpload = async (sheetId) => {
    const file = uploadFile[sheetId];
    if (!file) return;
    setUploading(u => ({ ...u, [sheetId]: true }));
    setErrors(e => ({ ...e, [sheetId]: '' }));
    setUploadResult(r => ({ ...r, [sheetId]: null }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/uploads/sonus/${sheetId}`, fd);
      setUploadResult(r => ({ ...r, [sheetId]: res.data }));
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao enviar PDF' }));
    } finally { setUploading(u => ({ ...u, [sheetId]: false })); }
  };

  const handleGenerate = async (sheetId) => {
    setGenerating(g => ({ ...g, [sheetId]: true }));
    setErrors(e => ({ ...e, [sheetId]: '' }));
    try {
      const res = await api.post(`/reports/generate/${sheetId}`);
      setReports(r => ({ ...r, [sheetId]: res.data }));
      onReload();
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao gerar laudo' }));
    } finally { setGenerating(g => ({ ...g, [sheetId]: false })); }
  };

  const handleDownloadLaudo = async (reportData) => {
    try {
      const res = await api.get(`/reports/download/${reportData.id}`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = reportData.filename || `laudo_${reportData.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch { alert('Erro ao baixar laudo.'); }
  };

  const blobDownload = async (url, filename, setLoading) => {
    setLoading(true);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename; a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      let msg = 'Erro ao gerar relatório.';
      if (err.response?.data instanceof Blob) {
        try { const t = await err.response.data.text(); msg = JSON.parse(t).detail || msg; } catch {}
      }
      alert(msg);
    } finally { setLoading(false); }
  };

  const startEdit = (sheet) => {
    setEditingId(sheet.id);
    setEditForm({
      epi: sheet.epi || '',
      activity: sheet.activity || '',
      machine_noise: sheet.machine_noise || '',
      technician_name_2: sheet.technician_name_2 || '',
      pos_verificacao_db: sheet.pos_verificacao_db || '',
      dosimeter_number: sheet.dosimeter_number || '',
    });
  };

  const handleSaveEdit = async (sheetId) => {
    setSaving(true);
    try {
      await api.patch(`/field-sheets/${sheetId}/edit`, editForm);
      setEditingId(null);
      const res = await api.get('/field-sheets/pending');
      const updated = res.data.find(s => s.id === sheetId);
      if (updated) setSheets(s => s.map(x => x.id === sheetId ? updated : x));
      onReload();
    } catch (err) {
      setErrors(e => ({ ...e, [sheetId]: err.response?.data?.detail || 'Erro ao salvar' }));
    } finally { setSaving(false); }
  };

  const params = new URLSearchParams({ company_id: group.company_id, tipo_analise: group.tipo_analise });

  const thStyle = {
    background: '#f8fafc',
    padding: '8px 10px',
    fontWeight: 600,
    fontSize: 11,
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };

  const tdStyle = {
    padding: '8px 10px',
    fontSize: 12,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
    maxWidth: 180,
  };

  const tdSmall = { ...tdStyle, color: '#64748b', fontSize: 11 };

  return (
    <div className="page">
      {/* Cabeçalho */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 8 }}>
          ← Voltar para Conferência
        </button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">{group.company_nome}</h1>
            <p className="page-subtitle">{group.tipo_analise} · {sheets.length} ficha{sheets.length !== 1 ? 's' : ''} · {group.tecnicos.join(', ')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary"
              onClick={() => blobDownload(`/reports/generate-bulk-pdf?${params}`, `relatorio_${group.tipo_analise}_${group.company_nome?.slice(0,20)}.pdf`, setGenBulkPdf)}
              disabled={genBulkPdf}>
              {genBulkPdf ? 'Gerando...' : 'Gerar Relatório PDF'}
            </button>
            <button className="btn btn-secondary"
              onClick={() => blobDownload(`/reports/generate-bulk?${params}`, `relatorio_${group.tipo_analise}_${group.company_nome?.slice(0,20)}.xlsx`, setGenBulkXls)}
              disabled={genBulkXls}>
              {genBulkXls ? 'Gerando...' : 'Gerar Relatório Excel'}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate(`/companies/${group.company_id}`)}>
              Ver Empresa
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de fichas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Dosímetro</th>
                <th style={thStyle}>Ordem</th>
                <th style={thStyle}>Data Coleta</th>
                <th style={thStyle}>Funcionário</th>
                <th style={thStyle}>Função</th>
                <th style={thStyle}>Matrícula</th>
                <th style={thStyle}>Setor</th>
                <th style={thStyle}>Local</th>
                <th style={thStyle}>EPI</th>
                <th style={thStyle}>Atividade</th>
                <th style={thStyle}>Máquinas/Equip.</th>
                <th style={thStyle}>Técnico</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet, idx) => (
                <>
                  {/* Linha principal da ficha */}
                  <tr key={sheet.id} style={{ background: editingId === sheet.id ? '#f0faf6' : undefined }}>
                    <td style={tdStyle}>
                      <span className="badge badge-blue">#{String(sheet.laudo_number).padStart(4, '0')}</span>
                    </td>
                    <td style={tdSmall}>{sheet.dosimeter_number}</td>
                    <td style={tdSmall}>{idx + 1}</td>
                    <td style={tdSmall}>{new Date(sheet.collection_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{sheet.employee_nome || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td style={tdSmall}>{sheet.employee_funcao || '—'}</td>
                    <td style={tdSmall}>{sheet.employee_matricula || '—'}</td>
                    <td style={tdSmall}>{sheet.employee_setor || '—'}</td>
                    <td style={tdSmall}>{sheet.employee_local || '—'}</td>
                    <td style={{ ...tdSmall, maxWidth: 120 }}>{sheet.epi || '—'}</td>
                    <td style={{ ...tdSmall, maxWidth: 140 }}>{sheet.activity || '—'}</td>
                    <td style={{ ...tdSmall, maxWidth: 140 }}>{sheet.machine_noise || '—'}</td>
                    <td style={tdSmall}>{sheet.technician_name}</td>
                    <td style={tdStyle}><StatusBadge status={sheet.status} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {sheet.status === 'pendente' ? (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => editingId === sheet.id ? setEditingId(null) : startEdit(sheet)}>
                            {editingId === sheet.id ? 'Cancelar' : 'Editar'}
                          </button>
                          <button className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(sheet.id)} disabled={approving[sheet.id]}>
                            {approving[sheet.id] ? '...' : 'Aprovar'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadFicha(sheet)}>
                            Ficha
                          </button>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedUpload(id => id === sheet.id ? null : sheet.id)}>
                            {expandedUpload === sheet.id ? '▲' : '▼ SONUS'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Erro inline */}
                  {errors[sheet.id] && (
                    <tr key={`err-${sheet.id}`}>
                      <td colSpan={15} style={{ padding: '4px 12px', background: '#fff5f5' }}>
                        <span style={{ color: '#dc2626', fontSize: 12 }}>{errors[sheet.id]}</span>
                      </td>
                    </tr>
                  )}

                  {/* Linha de edição expandida */}
                  {editingId === sheet.id && (
                    <tr key={`edit-${sheet.id}`}>
                      <td colSpan={15} style={{ padding: '14px 16px', background: '#f8fff8', borderBottom: '2px solid #bbf7d0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 860 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">EPI Utilizado</label>
                            <select className="form-input" value={editForm.epi} onChange={e => setEditForm(f => ({ ...f, epi: e.target.value }))}>
                              <option value="">Selecione...</option>
                              {['Protetor Auricular - Plug de Inserção','Protetor Auricular - Tipo Concha','Protetor Auricular - Semi-auricular','Capacete de Segurança','Óculos de Proteção','Luvas de Proteção','Abafador de Ruído','Máscara de Proteção Respiratória','Calçado de Segurança','Ausência de EPI'].map(o => <option key={o}>{o}</option>)}
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Nº Dosímetro</label>
                            <input className="form-input" type="number" value={editForm.dosimeter_number} onChange={e => setEditForm(f => ({ ...f, dosimeter_number: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Pós Verificação [dB]</label>
                            <input className="form-input" value={editForm.pos_verificacao_db} onChange={e => setEditForm(f => ({ ...f, pos_verificacao_db: e.target.value }))} placeholder="Ex: 114,00" />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Atividade Desenvolvida</label>
                            <textarea className="form-input" rows={2} value={editForm.activity} onChange={e => setEditForm(f => ({ ...f, activity: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Máquinas/Equipamentos</label>
                            <textarea className="form-input" rows={2} value={editForm.machine_noise} onChange={e => setEditForm(f => ({ ...f, machine_noise: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Resp. pelo Acompanhamento</label>
                            <input className="form-input" value={editForm.technician_name_2} onChange={e => setEditForm(f => ({ ...f, technician_name_2: e.target.value }))} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(sheet.id)} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Upload SONUS expandido */}
                  {expandedUpload === sheet.id && sheet.status === 'aprovada' && (
                    <tr key={`upload-${sheet.id}`}>
                      <td colSpan={15} style={{ padding: '12px 16px', background: '#f0f9ff', borderBottom: '2px solid #bae6fd' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>Upload de Laudo (SONUS 2)</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 600 }}>
                          <input type="file" accept=".pdf" className="form-input"
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, flex: 1 }}
                            onChange={e => setUploadFile(f => ({ ...f, [sheet.id]: e.target.files[0] }))} />
                          <button className="btn btn-primary btn-sm"
                            onClick={() => handleUpload(sheet.id)}
                            disabled={uploading[sheet.id] || !uploadFile[sheet.id]}>
                            {uploading[sheet.id] ? 'Enviando...' : 'Conferir'}
                          </button>
                        </div>

                        {uploadResult[sheet.id] && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#0f172a', marginBottom: 10 }}>
                              <span>Início: <b>{uploadResult[sheet.id].parsed_data?.inicio}</b></span>
                              <span>Fim: <b>{uploadResult[sheet.id].parsed_data?.fim}</b></span>
                              <span>NE: <b>{uploadResult[sheet.id].parsed_data?.ne_db} dB</b></span>
                            </div>
                            {!reports[sheet.id]
                              ? <button className="btn btn-primary btn-sm" onClick={() => handleGenerate(sheet.id)} disabled={generating[sheet.id]}>
                                  {generating[sheet.id] ? 'Gerando...' : 'Gerar Laudo PDF'}
                                </button>
                              : <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                  <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>Laudo gerado</span>
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadLaudo(reports[sheet.id])}>Baixar</button>
                                </div>
                            }
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Visão principal: lista de grupos ────────────────────────────────────────
export default function Conference() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const load = () => {
    setLoading(true);
    api.get('/field-sheets/pending')
      .then(res => setSheets(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Agrupa por empresa + tipo_analise
  const grupos = Object.values(
    sheets.reduce((acc, s) => {
      const key = `${s.company_id}||${s.tipo_analise || 'Ruído'}`;
      if (!acc[key]) acc[key] = {
        key, company_id: s.company_id, company_nome: s.company_nome,
        tipo_analise: s.tipo_analise || 'Ruído', sheets: [], tecnicos: new Set(),
      };
      acc[key].sheets.push(s);
      if (s.technician_name) acc[key].tecnicos.add(s.technician_name);
      return acc;
    }, {})
  ).map(g => ({ ...g, tecnicos: [...g.tecnicos] }));

  const statusGrupo = (sheets) => {
    if (sheets.every(s => s.status === 'aprovada')) return 'aprovada';
    if (sheets.some(s => s.status === 'aprovada')) return 'parcial';
    return 'pendente';
  };

  const StatusBadge = ({ status }) => {
    const map = {
      aprovada: { bg: '#dcfce7', color: '#166534', label: 'Aprovada' },
      parcial:  { bg: '#fef9c3', color: '#854d0e', label: 'Parcial' },
      pendente: { bg: '#fee2e2', color: '#991b1b', label: 'Pendente' },
    };
    const s = map[status] || map.pendente;
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  if (selectedGroup) {
    return <ConferenceDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} onReload={load} />;
  }

  if (loading) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Carregando...</div></div>;

  const gruposFiltrados = grupos.filter(g => {
    const st = statusGrupo(g.sheets);
    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'pendente') return st !== 'aprovada';
    if (filtroStatus === 'aprovada') return st === 'aprovada';
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conferência</h1>
          <p className="page-subtitle">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {sheets.length} ficha{sheets.length !== 1 ? 's' : ''} no total</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>Atualizar</button>
      </div>

      {grupos.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#6b7280' }}>Nenhuma ficha pendente de conferência.</p>
        </div>
      )}

      {grupos.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            {[
              { key: 'todos',    label: `Todos (${grupos.length})` },
              { key: 'pendente', label: `Pendentes (${grupos.filter(g => statusGrupo(g.sheets) !== 'aprovada').length})` },
              { key: 'aprovada', label: `Aprovados (${grupos.filter(g => statusGrupo(g.sheets) === 'aprovada').length})` },
            ].map(f => (
              <button key={f.key} onClick={() => setFiltroStatus(f.key)} style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: filtroStatus === f.key ? 'white' : 'transparent',
                color: filtroStatus === f.key ? '#1a7a3c' : '#8a93a8',
                borderBottom: filtroStatus === f.key ? '2px solid #16a34a' : '2px solid transparent',
                marginBottom: -1,
              }}>{f.label}</button>
            ))}
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Tipo de Análise</th>
                <th>Fichas</th>
                <th>Técnico(s)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gruposFiltrados.map(group => (
                <tr key={group.key} style={{ cursor: 'pointer' }} onClick={() => setSelectedGroup(group)}>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 14, textDecoration: 'underline' }}>
                      {group.company_nome}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'middle', fontSize: 13 }}>{group.tipo_analise}</td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span className="badge badge-blue">{group.sheets.length}</span>
                  </td>
                  <td style={{ verticalAlign: 'middle', color: '#64748b', fontSize: 13 }}>{group.tecnicos.join(', ') || '—'}</td>
                  <td style={{ verticalAlign: 'middle' }}><StatusBadge status={statusGrupo(group.sheets)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
