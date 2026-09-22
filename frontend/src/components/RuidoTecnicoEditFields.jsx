import EpiInput from './EpiInput';

export default function RuidoTecnicoEditFields({ form, setForm, epiOptions, setEpiOptions }) {
  return (
    <>
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
