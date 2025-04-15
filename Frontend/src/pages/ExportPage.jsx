import { useState } from 'react';

const ExportPage = () => {
  const [activeTab, setActiveTab] = useState('html');

  const tabs = [
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' },
    { id: 'jsx', label: 'React JSX' },
  ];

  const sampleCode = {
    html: `<div class="container">
  <header class="header">
    <h1>Welcome to CloneIT</h1>
  </header>
  <main class="content">
    <p>Your cloned content here</p>
  </main>
</div>`,
    css: `.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.content {
  margin-top: 20px;
}`,
    jsx: `import React from 'react';

const ClonedComponent = () => {
  return (
    <div className="container">
      <header className="header">
        <h1>Welcome to CloneIT</h1>
      </header>
      <main className="content">
        <p>Your cloned content here</p>
      </main>
    </div>
  );
};

export default ClonedComponent;`,
  };

  const handleCopy = () => {
    // Implement copy functionality
    console.log('Code copied to clipboard');
  };

  const handleDownload = () => {
    // Implement download functionality
    console.log('Downloading ZIP file');
  };

  const handleSave = () => {
    // Implement save functionality
    console.log('Saving to library');
  };

  return (
    <div className="p-6 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Export Code</h1>

        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-medium ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="relative">
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <code>{sampleCode[activeTab]}</code>
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Download ZIP
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Save to Library
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage; 