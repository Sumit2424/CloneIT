import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';

// Private Route component to protect routes that require authentication
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

// Dashboard component (protected route)
function Dashboard() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CloneIT</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser?.email}</span>
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <div className="bg-indigo-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-indigo-900">Total Projects</h3>
                <p className="text-3xl font-bold text-indigo-600 mt-2">12</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-purple-900">Active Tasks</h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">8</p>
              </div>
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-900">Completed</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">24</p>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="divide-y divide-gray-200">
                  <li className="py-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-medium">JD</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">Project Update</p>
                        <p className="text-sm text-gray-500">Updated the landing page design</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">2h ago</span>
                      </div>
                    </div>
                  </li>
                  <li className="py-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-medium">AS</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">New Task</p>
                        <p className="text-sm text-gray-500">Added new feature request</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">4h ago</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App; 