import { useState } from 'react';
import { Link } from 'react-router-dom';

const ClonePage = () => {
  const [url, setUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  const handleStartCloning = () => {
    setIsCloning(true);
    // Simulate cloning process
    setTimeout(() => {
      setIsCloning(false);
    }, 2000);
  };

  return (
    <div className="p-6 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Clone a Website</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-6">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <div className="flex space-x-4">
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleStartCloning}
                disabled={!url || isCloning}
                className={`px-4 py-2 rounded-lg text-white ${
                  !url || isCloning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isCloning ? 'Cloning...' : 'Start Cloning'}
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4 min-h-[400px] bg-gray-50">
            <div className="text-center text-gray-500">
              {isCloning ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p>Analyzing website structure...</p>
                </div>
              ) : (
                <p>Preview will appear here</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            to="/adapt"
            className={`px-6 py-2 rounded-lg text-white ${
              !isCloning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            Next: Adapt with AI
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClonePage; 