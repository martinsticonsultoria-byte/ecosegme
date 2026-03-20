import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const linkStyle = ({ isActive }) => ({
    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: isActive ? 700 : 500,
    padding: '6px 14px',
    borderRadius: 6,
    background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: 'all 0.15s',
  });

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #1a7a3c 0%, #145f2e 100%)',
      padding: '0 28px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 56,
      boxShadow: '0 2px 8px rgba(26,122,60,0.25)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ marginRight: 20, display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="EcoSegme" style={{ height: 32 }} />
          </div>
        </div>
        <NavLink to="/companies" style={linkStyle}>Empresas</NavLink>
        <NavLink to="/field-sheet/new" style={linkStyle}>Nova Ficha</NavLink>
        <NavLink to="/conference" style={linkStyle}>Conferência</NavLink>
        <NavLink to="/reports" style={linkStyle}>Laudos</NavLink>
        {user?.role === 'admin_staff' && (
          <NavLink to="/users" style={linkStyle}>Usuários</NavLink>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{user.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{user.role === 'admin_staff' ? 'Administrativo' : 'Técnico'}</div>
        </div>
        <button onClick={handleLogout} style={{
          padding: '6px 14px', background: 'rgba(255,255,255,0.15)',
          color: 'white', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s',
        }}>
          Sair
        </button>
      </div>
    </nav>
  );
}
