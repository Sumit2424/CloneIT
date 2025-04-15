import { useState } from 'react';
import { Link } from 'react-router-dom';

const AdaptPage = () => {
  const [selectedDomain, setSelectedDomain] = useState('');
  const [suggestions, setSuggestions] = useState([
    {
      id: 1,
      type: 'text',
      content: 'Consider using more engaging headlines for better user retention',
    },
    {
      id: 2,
      type: 'icon',
      content: 'Add social media icons in the footer for better engagement',
    },
    {
      id: 3,
      type: 'layout',
      content: 'Implement a card-based layout for product showcase',
    },
  ]);

  const domains = [
    'EdTech',
    'FinTech',
    'E-commerce',
    'Healthcare',
    'Social Media',
    'Blog',
  ];

  const handleRegenerate = () => {
    // Simulate regenerating suggestions
    setSuggestions([
      ...suggestions,
      {
        id: suggestions.length + 1,
        type: 'layout',
        content: 'New suggestion: Add a testimonial section',
      },
    ]);
  };

  return (
    <div className="p-6 ml-64 mt-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Adaptation</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-6">
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Select Domain
            </label>
            <select
              id="domain"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a domain</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">AI Suggestions</h2>
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-4 border rounded-lg bg-gray-50 flex items-start space-x-4"
                >
                  <div className="flex-shrink-0">
                    {suggestion.type === 'text' && (
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    )}
                    {suggestion.type === 'icon' && (
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    )}
                    {suggestion.type === 'layout' && (
                      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    )}
                  </div>
                  <p className="flex-1">{suggestion.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4 min-h-[400px] bg-gray-50 mb-6">
            <div className="text-center text-gray-500">
              <p>Live preview will appear here</p>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleRegenerate}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Regenerate Suggestions
            </button>
            <Link
              to="/export"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Apply & Export
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptPage; 