import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const links = [
    ...(user?.role === 'admin_staff' ? [{ to: '/companies', label: 'Empresas' }] : []),
    { to: '/field-sheet/new', label: 'Ficha de Campo' },
    ...(user?.role === 'admin_staff' ? [
      { to: '/conference', label: 'Conferência' },
      { to: '/users', label: 'Usuários' },
    ] : []),
  ];

  return (
    <>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ paddingRight: 20, marginRight: 20, borderRight: '1px solid #e2e8f0' }}>
            <img src="/logo.png" alt="EcoSegme" style={{ height: 26, display: 'block' }} />
          </div>
          {/* Links desktop */}
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {links.map(l => <NavItem key={l.to} to={l.to}>{l.label}</NavItem>)}
          </div>
        </div>

        {/* Direita */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="nav-user-desktop" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13, fontWeight: 700 }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>{user.role === 'admin_staff' ? 'Administrativo' : 'Técnico'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="nav-logout-desktop" style={{ padding: '6px 16px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Sair
          </button>

          {/* Hamburguer mobile */}
          <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} style={{ display: 'none', flexDirection: 'column', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <span style={{ width: 22, height: 2, background: '#475569', borderRadius: 2, display: 'block' }} />
            <span style={{ width: 22, height: 2, background: '#475569', borderRadius: 2, display: 'block' }} />
            <span style={{ width: 22, height: 2, background: '#475569', borderRadius: 2, display: 'block' }} />
          </button>
        </div>
      </nav>

      {/* Menu mobile dropdown */}
      {menuOpen && (
        <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '12px 24px 16px', position: 'sticky', top: 56, zIndex: 99 }}>
          {links.map(l => (
            <div key={l.to} onClick={() => { navigate(l.to); setMenuOpen(false); }} style={{
              padding: '12px 0', fontSize: 15, fontWeight: location.pathname === l.to ? 600 : 500,
              color: location.pathname === l.to ? '#16a34a' : '#0f172a',
              borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
            }}>
              {l.label}
            </div>
          ))}
          <div style={{ paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{user.name} · {user.role === 'admin_staff' ? 'Admin' : 'Técnico'}</span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      )}
    </>
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
