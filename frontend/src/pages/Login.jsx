import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/companies');
    } catch {
      setError('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg, #1a7a3c, #145f2e)',
            borderRadius: 16, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 26, marginBottom: 16,
            boxShadow: '0 8px 24px rgba(26,122,60,0.3)',
          }}>🌿</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1f2e', marginBottom: 4 }}>EcoSegme</h1>
          <p style={{ color: '#5a6478', fontSize: 14 }}>Sistema de Laudos Técnicos</p>
        </div>

        <div style={{
          background: 'white', borderRadius: 16, padding: 36,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          border: '1px solid rgba(226,232,240,0.8)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: '#1a1f2e' }}>Entrar na conta</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#8a93a8', fontSize: 12, marginTop: 24 }}>
          EcoSegme Consultoria Ambiental © 2026
        </p>
      </div>
    </div>
  );
}

