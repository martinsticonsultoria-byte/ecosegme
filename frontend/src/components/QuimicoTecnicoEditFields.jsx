import CatalogInput from './CatalogInput';

export default function QuimicoTecnicoEditFields({ form, setForm, matriculaTipo, numeroOptions, setNumeroOptions, tipoOptions, setTipoOptions }) {
  const matTipo = matriculaTipo !== undefined ? matriculaTipo : form.matricula_tipo;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nome do Funcionário</label>
          <input className="form-input" value={form.employee_name_text || ''}
            onChange={e => setForm(f => ({ ...f, employee_name_text: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Função</label>
          <input className="form-input" value={form.funcao || ''}
            onChange={e => setForm(f => ({ ...f, funcao: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              {matTipo === 'cpf' ? 'CPF' : 'Matrícula'}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['matricula', 'Matrícula'], ['cpf', 'CPF']].map(([mode, text]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, matricula_tipo: mode }))}
                  style={{
                    padding: '3px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: (form.matricula_tipo || matTipo) === mode ? 'var(--green)' : 'white',
                    color: (form.matricula_tipo || matTipo) === mode ? 'white' : 'var(--text-2)',
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
          <input className="form-input" value={form.matricula || ''}
            onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Setor</label>
          <input className="form-input" value={form.setor || ''}
            onChange={e => setForm(f => ({ ...f, setor: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Local</label>
          <input className="form-input" value={form.local || ''}
            onChange={e => setForm(f => ({ ...f, local: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Técnico Responsável</label>
          <input className="form-input" value={form.technician_name || ''}
            onChange={e => setForm(f => ({ ...f, technician_name: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nº Ficha de Campo <span style={{ fontWeight: 400, color: '#94a3b8' }}>(controle interno)</span></label>
          <input className="form-input" value={form.numero_ficha_campo || ''}
            onChange={e => setForm(f => ({ ...f, numero_ficha_campo: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Data de Coleta</label>
          <input className="form-input" type="date" value={form.collection_date || ''}
            onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nº do Amostrador</label>
          <CatalogInput categoria="numero" value={form.numero_amostrador || ''}
            onChange={v => setForm(f => ({ ...f, numero_amostrador: v }))}
            options={numeroOptions} setOptions={setNumeroOptions} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Tipo de Amostrador</label>
          <CatalogInput categoria="tipo" value={form.tipo_amostrador || ''}
            onChange={v => setForm(f => ({ ...f, tipo_amostrador: v }))}
            options={tipoOptions} setOptions={setTipoOptions} />
        </div>
        <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
          <label className="form-label">Situação do Ambiente</label>
          <input className="form-input" value={form.situacao_ambiente || ''}
            onChange={e => setForm(f => ({ ...f, situacao_ambiente: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Jornada de Trabalho</label>
          <input className="form-input" value={form.jornada_trabalho || ''}
            onChange={e => setForm(f => ({ ...f, jornada_trabalho: e.target.value }))} />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Observações</label>
        <textarea className="form-input" rows={2} value={form.observacoes || ''}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
      </div>
    </>
  );
}
