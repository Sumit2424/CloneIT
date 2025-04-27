import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const HistoryPage = () => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/history', {
          params: { userId: currentUser?.uid }
        });
        setHistoryData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError('Failed to load history data. Please try again later.');
        setLoading(false);
      }
    };

    if (currentUser?.uid) {
      fetchHistoryData();
    } else {
      setLoading(false);
      setError('Please log in to view your history.');
    }
  }, [currentUser]);

  const handleViewDetails = async (itemId) => {
    try {
      if (selectedItem && selectedItem._id === itemId) {
        // Toggle off if already selected
        setSelectedItem(null);
        return;
      }
      
      const response = await axios.get(`/api/history/${itemId}`);
      setSelectedItem(response.data);
    } catch (err) {
      console.error('Error fetching item details:', err);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatJsonData = (jsonData) => {
    if (!jsonData) return null;
    
    try {
      // If it's already an object, stringify it properly
      const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
      return (
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
          {jsonString}
        </pre>
      );
    } catch (err) {
      console.error('Error formatting JSON:', err);
      return <span className="text-red-500">Invalid JSON data</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 ml-64 mt-16 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading history data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 ml-64 mt-16">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="p-6 ml-64 mt-16">
        <h1 className="text-3xl font-bold mb-6">History</h1>
        <div className="bg-gray-100 p-8 rounded-lg text-center">
          <p className="text-gray-600 text-lg">You don't have any history records yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 ml-64 mt-16">
      <h1 className="text-3xl font-bold mb-6">History</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {historyData.map((item) => (
          <div key={item._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {item.imageUrl && (
              <div className="h-48 overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt={item.projectName || 'Project image'} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{item.projectName || 'Untitled Project'}</h2>
              
              <div className="text-sm text-gray-500 mb-3">
                Created: {formatTimestamp(item.timeStamp)}
              </div>
              
              {item.prompt && (
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Prompt:</h3>
                  <p className="text-gray-600 text-sm">{
                    item.prompt.length > 100 
                      ? `${item.prompt.substring(0, 100)}...` 
                      : item.prompt
                  }</p>
                </div>
              )}
              
              <div className="flex justify-between mt-4">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  item.status === 'generated' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {item.status}
                </span>
                
                <button 
                  className="text-blue-600 hover:text-blue-800 font-medium" 
                  onClick={() => handleViewDetails(item._id)}
                >
                  {selectedItem && selectedItem._id === item._id ? 'Hide Details' : 'View Details'}
                </button>
              </div>
              
              {selectedItem && selectedItem._id === item._id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Project Details:</h3>
                  
                  {selectedItem.files && selectedItem.files.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-gray-600">Files:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600">
                        {selectedItem.files.map((file, index) => (
                          <li key={index}>{file.filename} ({file.fileType})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedItem.jsonData && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-gray-600">JSON Data:</h4>
                      {formatJsonData(selectedItem.jsonData)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage; 