import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './features/auth/AuthProvider';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { RequireRole } from './features/auth/RequireRole';
import { SessionLayout } from './features/auth/SessionLayout';
import { PlaceholderPage } from './shared/layout/PlaceholderPage';
import { createQueryClient } from './shared/queryClient';
import { ToastProvider } from './shared/ui';

/**
 * Rutas de spec §9. `/login` es pública; el resto exige sesión y `/admin/*` exige `ADMIN` (RN-21). Las pantallas son
 * marcadores hasta sus tareas (T07b, T08, T09, T10…).
 */
export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<SessionLayout />}>
                  <Route index element={<Navigate to="/agenda" replace />} />
                  <Route path="/agenda" element={<PlaceholderPage title="Agenda" />} />
                  <Route path="/my-bookings" element={<PlaceholderPage title="Mis reservas" />} />
                  <Route path="/account" element={<PlaceholderPage title="Mi cuenta" />} />
                  <Route path="/admin" element={<RequireRole role="ADMIN" />}>
                    <Route index element={<Navigate to="/agenda" replace />} />
                    <Route path="rooms" element={<PlaceholderPage title="Salas" />} />
                    <Route path="users" element={<PlaceholderPage title="Usuarios" />} />
                    <Route path="closures" element={<PlaceholderPage title="Cierres" />} />
                    <Route path="audit" element={<PlaceholderPage title="Auditoría" />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/agenda" replace />} />
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
