import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, GlobeAltIcon, FolderIcon, SparklesIcon, ClockIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { path: 'http://localhost:5174', icon: GlobeAltIcon, label: 'Clone a Website', external: true },
    { path: '/saved', icon: FolderIcon, label: 'Saved Components' },
    { path: '/adapt', icon: SparklesIcon, label: 'AI Adaptation' },
    { path: '/history', icon: ClockIcon, label: 'History' },
    { path: '/settings', icon: Cog6ToothIcon, label: 'Settings' },
  ];

  return (
    <div className="w-64 h-screen bg-gray-800 text-white fixed left-0 top-0">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-8">CloneIT</h1>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = !item.external && location.pathname === item.path;
            return item.external ? (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 p-2 rounded-lg ${
                  isActive ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 w-full mt-8">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar; 