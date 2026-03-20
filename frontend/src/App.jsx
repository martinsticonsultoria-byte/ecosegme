import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Companies from './pages/Companies';
import Employees from './pages/Employees';
import Conference from './pages/Conference';
import FieldSheetForm from './pages/FieldSheetForm';
import Reports from './pages/Reports';
import Users from './pages/Users';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/companies" element={<PrivateRoute><Companies /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
          <Route path="/field-sheet/new" element={<PrivateRoute><FieldSheetForm /></PrivateRoute>} />
          <Route path="/conference" element={<PrivateRoute><Conference /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/companies" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
