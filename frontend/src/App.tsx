import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Investigations } from './pages/Investigations';
import { InvestigationDetail } from './pages/InvestigationDetail';
import { InvestigationCreate } from './pages/InvestigationCreate';
import { AICopilot } from './pages/AICopilot';
import { Approvals } from './pages/Approvals';
import { Audit } from './pages/Audit';
import { Imports } from './pages/Imports';
import { Payments } from './pages/Payments';
import { PaymentDetail } from './pages/PaymentDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Overview />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/:id" element={<PaymentDetail />} />
        <Route path="investigations" element={<Investigations />} />
        <Route path="investigations/new" element={<InvestigationCreate />} />
        <Route path="investigations/:id" element={<InvestigationDetail />} />
        <Route path="ai-copilot" element={<AICopilot />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="approvals/new" element={<div className="p-6 text-center text-gray-500">Create Approval — navigate from Investigation Detail</div>} />
        <Route path="approvals/:id" element={<div className="p-6 text-center text-gray-500">Approval Detail — not yet implemented</div>} />
        <Route path="audit" element={<Audit />} />
        <Route path="imports" element={<Imports />} />
        <Route path="settings" element={<div className="p-6 text-center text-gray-500">Settings (Coming Soon)</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;