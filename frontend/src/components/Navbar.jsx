import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 58,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Esquerda: logo + separador + links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <div style={{ paddingRight: 24, marginRight: 24, borderRight: '1px solid #e2e8f0' }}>
          <img src="/logo.png" alt="EcoSegme" style={{ height: 26, display: 'block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user?.role === 'admin_staff' && <NavItem to="/companies">Empresas</NavItem>}
          <NavItem to="/field-sheet/new">Ficha de Campo</NavItem>
          {user?.role === 'admin_staff' && <NavItem to="/conference">Conferência</NavItem>}
          {user?.role === 'admin_staff' && <NavItem to="/users">Usuários</NavItem>}
        </div>
      </div>

      {/* Direita: usuário + sair */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569', fontSize: 13, fontWeight: 700,
          }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>
              {user.role === 'admin_staff' ? 'Administrativo' : 'Técnico'}
            </div>
          </div>
        </div>

        <button onClick={handleLogout} style={{
          padding: '6px 16px',
          background: 'transparent',
          color: '#64748b',
          border: '1px solid #e2e8f0',
          borderRadius: 999,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      color: isActive ? '#16a34a' : '#64748b',
      textDecoration: 'none',
      fontSize: 14,
      fontWeight: isActive ? 600 : 500,
      padding: '5px 12px',
      borderRadius: 8,
      background: isActive ? '#f0fdf4' : 'transparent',
      transition: 'all 0.12s',
      letterSpacing: '0.01em',
    })}>
      {children}
    </NavLink>
  );
}
