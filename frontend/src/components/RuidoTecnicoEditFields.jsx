import EpiInput from './EpiInput';

export default function RuidoTecnicoEditFields({ form, setForm, epiOptions, setEpiOptions }) {
  const matTipo = form.matricula_tipo || 'matricula';
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
                    background: matTipo === mode ? 'var(--green)' : 'white',
                    color: matTipo === mode ? 'white' : 'var(--text-2)',
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nº Dosímetro</label>
          <input className="form-input" type="number" value={form.dosimeter_number}
            onChange={e => setForm(f => ({ ...f, dosimeter_number: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Data da Coleta</label>
          <input className="form-input" type="date" value={form.collection_date}
            onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">EPI Utilizado</label>
          <EpiInput
            value={form.epi}
            onChange={val => setForm(f => ({ ...f, epi: val }))}
            options={epiOptions}
            setOptions={setEpiOptions} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Atividade Desenvolvida</label>
          <textarea className="form-input" rows={2} value={form.activity}
            onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Máquinas/Equipamentos</label>
          <textarea className="form-input" rows={2} value={form.machine_noise}
            onChange={e => setForm(f => ({ ...f, machine_noise: e.target.value }))} />
        </div>
      </div>
    </>
  );
}
