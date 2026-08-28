export default function MatriculaToggle({ mode, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[['matricula', 'Matrícula'], ['cpf', 'CPF']].map(([m, text]) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          style={{
            padding: '3px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid var(--border)',
            cursor: 'pointer',
            background: mode === m ? 'var(--green)' : 'white',
            color: mode === m ? 'white' : 'var(--text-2)',
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
