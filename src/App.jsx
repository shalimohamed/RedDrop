import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { isFirebaseConfigured } from './firebase/config';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireDonor, RequireFacility } from './routes/guards';
import Layout from './components/layout/Layout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterChoicePage from './pages/RegisterChoicePage';
import RegisterDonorPage from './pages/RegisterDonorPage';
import RegisterFacilityPage from './pages/RegisterFacilityPage';
import BloodAppealsPage from './pages/BloodAppealsPage';
import AppealDetailPage from './pages/AppealDetailPage';
import BloodDriveEventsPage from './pages/BloodDriveEventsPage';
import NearbyFacilitiesPage from './pages/NearbyFacilitiesPage';
import DonorDashboardPage from './pages/DonorDashboardPage';
import FacilityDashboardPage from './pages/FacilityDashboardPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';
import SetupNeededPage from './pages/SetupNeededPage';

export default function App() {
  if (!isFirebaseConfigured) {
    return <SetupNeededPage />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/appeals" element={<BloodAppealsPage />} />
            <Route path="/appeals/:appealId" element={<AppealDetailPage />} />
            <Route path="/drives" element={<BloodDriveEventsPage />} />
            <Route path="/facilities" element={<NearbyFacilitiesPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterChoicePage />} />
            <Route path="/register/donor" element={<RegisterDonorPage />} />
            <Route path="/register/facility" element={<RegisterFacilityPage />} />

            <Route
              path="/donor/dashboard"
              element={
                <RequireDonor>
                  <DonorDashboardPage />
                </RequireDonor>
              }
            />

            <Route
              path="/facility/dashboard"
              element={
                <RequireFacility>
                  <FacilityDashboardPage />
                </RequireFacility>
              }
            />

            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <NotificationsPage />
                </RequireAuth>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
