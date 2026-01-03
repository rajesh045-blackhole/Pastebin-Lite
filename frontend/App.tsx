import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CreatePasteForm } from './components/CreatePasteForm';
import { ViewPaste } from './components/ViewPaste';

const HealthCheck = () => {
  const status = { ok: true, timestamp: new Date().toISOString() };
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow font-mono text-sm">
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CreatePasteForm />} />
          <Route path="/p/:id" element={<ViewPaste />} />
          <Route path="/api/healthz" element={<HealthCheck />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
