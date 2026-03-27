import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Carregando...</p>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin_staff') return <Navigate to="/field-sheet/new" />;
  return children;
}
