import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { currentUser } = useAuth();

  const recentSessions = [
    { id: 1, name: 'E-commerce Homepage', date: '2024-04-14' },
    { id: 2, name: 'Landing Page', date: '2024-04-13' },
    { id: 3, name: 'Dashboard UI', date: '2024-04-12' },
  ];

  const popularLayouts = [
    'E-commerce',
    'Blog',
    'Portfolio',
    'Dashboard',
    'Landing Page',
  ];

  return (
    <div className="p-6 ml-64 mt-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Hey {currentUser?.displayName || 'User'}, ready to clone some UIs?
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <a
          href="http://localhost:5174"
          target="_blank"
          rel="noopener noreferrer"
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Clone from URL</h2>
          <p className="text-gray-600">Start cloning a website by entering its URL</p>
        </a>

        <div className="p-6 bg-gray-100 rounded-lg shadow-md opacity-50 cursor-not-allowed">
          <h2 className="text-xl font-semibold mb-2">Upload Screenshot</h2>
          <p className="text-gray-600">Coming soon</p>
        </div>

        <Link
          to="/new-project"
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Start New Project</h2>
          <p className="text-gray-600">Create a new project from scratch</p>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Sessions</h2>
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center"
              >
                <div>
                  <h3 className="font-medium">{session.name}</h3>
                  <p className="text-sm text-gray-500">{session.date}</p>
                </div>
                <div className="space-x-2">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Popular Layouts</h2>
          <div className="grid grid-cols-2 gap-4">
            {popularLayouts.map((layout) => (
              <div
                key={layout}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              >
                <h3 className="font-medium">{layout}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 