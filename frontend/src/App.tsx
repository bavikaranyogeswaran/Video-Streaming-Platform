import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { useAuthStore } from './store/authStore.ts';

// Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage.tsx'));
const LoginPage = React.lazy(() => import('./pages/LoginPage.tsx'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage.tsx'));
const UploadPage = React.lazy(() => import('./pages/UploadPage.tsx'));
const VideoPage = React.lazy(() => import('./pages/VideoPage.tsx'));
const HealthPage = React.lazy(() => import('./pages/HealthPage.tsx'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <React.Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="video/:id" element={<VideoPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route 
              path="upload" 
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              } 
            />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};

export default App;
