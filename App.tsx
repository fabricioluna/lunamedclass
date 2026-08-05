import React from 'react';
import ErrorBoundary from './components/layout/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
