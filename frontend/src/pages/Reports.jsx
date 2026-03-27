import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Reports() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => { api.get('/companies').then(res => setCompanies(res.data)); }, []);

  const handleCompanyChange = async (e) => {
    const id = e.target.value;
    setSelectedCompany(id);
    if (!id) { setReports([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/reports/list/${id}`);
      setReports(res.data);
    } finally { setLoading(false); }
  };

  const handleDownload = async (report) => {
    setDownloadError('');
    try {
      const urlRes = await api.get(`/reports/url/${report.id}`);
      const { url, local } = urlRes.data;
      if (local) {
        const res = await api.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = report.filename; a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        window.open(url, '_blank');
      }
    } catch {
      setDownloadError('Erro ao baixar laudo. O arquivo pode não estar disponível no servidor.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Histórico de Laudos</h1>
          <p className="page-subtitle">Consulte e baixe laudos gerados por empresa</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Filtrar por Empresa</div>
        <select className="form-input" style={{ maxWidth: 400 }} value={selectedCompany} onChange={handleCompanyChange}>
          <option value="">Selecione uma empresa...</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Carregando laudos...</div>
      )}

      {downloadError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{downloadError}</div>}

      {!loading && selectedCompany && reports.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#6b7280' }}>Nenhum laudo gerado para esta empresa.</p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Laudos Gerados</div>
            <span className="badge badge-green">{reports.length} laudo{reports.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Arquivo</th>
                <th>Gerado em</th>
                <th>SHA-256</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td><span className="badge badge-blue">{r.id}</span></td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{r.filename}</td>
                  <td style={{ color: '#64748b', fontSize: 13 }}>{new Date(r.generated_at).toLocaleString('pt-BR')}</td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#94a3b8' }}>
                      {r.sha256.substring(0, 16)}...
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => handleDownload(r)}>
                      Baixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
