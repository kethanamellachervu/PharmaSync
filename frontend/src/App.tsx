import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          {/* Default active Dashboard route */}
          <Route index element={<DashboardPage />} />

          {/* Placeholders for upcoming phases */}
          <Route path="inventory" element={<PlaceholderPage />} />
          <Route path="sales" element={<PlaceholderPage />} />
          <Route path="suppliers" element={<PlaceholderPage />} />
          <Route path="reports" element={<PlaceholderPage />} />
          <Route path="forecasting" element={<PlaceholderPage />} />
          <Route path="settings" element={<PlaceholderPage />} />

          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
