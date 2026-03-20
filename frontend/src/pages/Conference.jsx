import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function Conference() {
  const [searchParams] = useSearchParams();
  const [sheetId, setSheetId] = useState(searchParams.get('sheet_id') || '');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);

  const handleUpload = async () => {
    if (!sheetId || !file) { setError('Preencha o ID da ficha e selecione o PDF'); return; }
    setLoading(true); setError(''); setResult(null); setReport(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/uploads/sonus/${sheetId}`, formData);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar PDF');
    } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try {
      const res = await api.post(`/reports/generate/${sheetId}`);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao gerar laudo');
    } finally { setGenerating(false); }
  };

  const handleDownload = async () => {
    const res = await api.get(report.download_url, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = report.filename; a.click();
    window.URL.revokeObjectURL(url);
  };

  const Row = ({ label, value, mono }) => (
    <tr>
      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#5a6478', fontSize: 13, width: 180, background: '#f8fafb', borderBottom: '1px solid #e2e8f0' }}>{label}</td>
      <td style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', fontSize: mono ? 12 : 14 }}>{value || '—'}</td>
    </tr>
  );

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tela de Conferência</h1>
          <p className="page-subtitle">Envie o PDF do SONUS 2 e confira os dados antes de gerar o laudo</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Upload do PDF</div>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ID da Ficha <span style={{color:'red'}}>*</span></label>
            <input type="number" className="form-input" value={sheetId}
              onChange={e => setSheetId(e.target.value)} placeholder="Ex: 1" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">PDF do SONUS 2 <span style={{color:'red'}}>*</span></label>
            <input type="file" accept=".pdf" className="form-input"
              onChange={e => setFile(e.target.files[0])}
              style={{ padding: '7px 14px', cursor: 'pointer' }} />
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 16, marginBottom: 0 }}>{error}</div>}

        <button className="btn btn-primary" onClick={handleUpload} disabled={loading}
          style={{ marginTop: 20, padding: '10px 28px' }}>
          {loading ? '⏳ Processando...' : '🔍 Enviar e Conferir'}
        </button>
      </div>

      {result && (
        <div>
          {result.name_alert ? (
            <div className="alert alert-warning">
              ⚠️ {result.name_alert}
            </div>
          ) : (
            <div className="alert alert-success">
              ✅ Nome do funcionário confirmado com o cadastro
            </div>
          )}

          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Dados Extraídos do PDF</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <Row label="Funcionário" value={result.parsed_data.funcionario} />
                <Row label="Início" value={result.parsed_data.inicio} />
                <Row label="Fim" value={result.parsed_data.fim} />
                <Row label="Dose Diária [%]" value={result.parsed_data.dose_diaria} />
                <Row label="NE [dB]" value={result.parsed_data.ne_db} />
                <Row label="NEN [dB]" value={result.parsed_data.nen_db} />
                <Row label="SHA-256" value={result.sha256} mono />
              </tbody>
            </table>
          </div>

          {!report && (
            <button className="btn btn-blue" onClick={handleGenerate} disabled={generating}
              style={{ padding: '12px 32px', fontSize: 15 }}>
              {generating ? '⏳ Gerando Laudo...' : '📄 Gerar Laudo PDF'}
            </button>
          )}

          {report && (
            <div className="card" style={{ borderLeft: '4px solid #1a7a3c' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a7a3c', marginBottom: 4 }}>✅ Laudo gerado com sucesso!</div>
                  <div style={{ fontSize: 13, color: '#5a6478', marginBottom: 2 }}>{report.filename}</div>
                  <div style={{ fontSize: 11, color: '#8a93a8', fontFamily: 'JetBrains Mono, monospace' }}>SHA-256: {report.sha256}</div>
                </div>
                <button className="btn btn-primary" onClick={handleDownload}>
                  ⬇ Baixar Laudo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
