import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Employees from './pages/Employees';
import Conference from './pages/Conference';
import FieldSheetForm from './pages/FieldSheetForm';
import FieldSheetMobile from './pages/FieldSheetMobile';
import Reports from './pages/Reports';
import Users from './pages/Users';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/companies" element={<PrivateRoute adminOnly><Companies /></PrivateRoute>} />
          <Route path="/companies/:id" element={<PrivateRoute adminOnly><CompanyDetail /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute adminOnly><Employees /></PrivateRoute>} />
          <Route path="/field-sheet/new" element={<PrivateRoute><FieldSheetMobile /></PrivateRoute>} />
          <Route path="/field-sheet/admin" element={<PrivateRoute adminOnly><FieldSheetForm /></PrivateRoute>} />
          <Route path="/conference" element={<PrivateRoute adminOnly><Conference /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute adminOnly><Reports /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/field-sheet/new" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
