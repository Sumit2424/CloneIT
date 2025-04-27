import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './components/layout/ToastProvider';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './pages/Dashboard';
import ClonePage from './pages/ClonePage';
import AdaptPage from './pages/AdaptPage';
import ExportPage from './pages/ExportPage';
import SavedLibrary from './pages/SavedLibrary';
import HistoryPage from './pages/HistoryPage';

// Private Route component to protect routes that require authentication
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

// Layout component to wrap authenticated pages
function Layout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main>{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/adapt"
              element={
                <PrivateRoute>
                  <Layout>
                    <AdaptPage />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/export"
              element={
                <PrivateRoute>
                  <Layout>
                    <ExportPage />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/saved"
              element={
                <PrivateRoute>
                  <Layout>
                    <SavedLibrary />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/history"
              element={
                <PrivateRoute>
                  <Layout>
                    <HistoryPage />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 