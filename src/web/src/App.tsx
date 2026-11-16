import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AccountPage } from './features/auth/AccountPage';
import { AuthProvider } from './features/auth/AuthProvider';
import { LoginPage } from './features/auth/LoginPage';
import { AgendaPage } from './features/bookings/AgendaPage';
import { MyBookingsPage } from './features/bookings/MyBookingsPage';
import { AdminClosuresPage } from './features/closures/AdminClosuresPage';
import { AdminRoomsPage } from './features/rooms/AdminRoomsPage';
import { AdminUsersPage } from './features/users/AdminUsersPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { RequireRole } from './features/auth/RequireRole';
import { SessionLayout } from './features/auth/SessionLayout';
import { PlaceholderPage } from './shared/layout/PlaceholderPage';
import { createQueryClient } from './shared/queryClient';
import { ToastProvider } from './shared/ui';

/**
 * Rutas de spec §9. `/login` es pública; el resto exige sesión y `/admin/*` exige `ADMIN` (RN-21). `/admin/audit`
 * muestra un aviso: su pantalla (T10c) se recortó (D-34).
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
                  <Route path="/agenda" element={<AgendaPage />} />
                  <Route path="/my-bookings" element={<MyBookingsPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/admin" element={<RequireRole role="ADMIN" />}>
                    <Route index element={<Navigate to="/agenda" replace />} />
                    <Route path="rooms" element={<AdminRoomsPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="closures" element={<AdminClosuresPage />} />
                    <Route
                      path="audit"
                      element={
                        <PlaceholderPage title="Auditoría" notice="Esta sección se recortó de esta versión">
                          La pantalla de consulta de la auditoría no se incluyó por falta de tiempo. Todas las
                          operaciones se siguen registrando en la auditoría y se pueden consultar a través del API.
                        </PlaceholderPage>
                      }
                    />
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
