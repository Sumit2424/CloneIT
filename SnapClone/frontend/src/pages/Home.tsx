import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import axios from "axios";
import { BACKEND_URL } from '../config';
import { ImageUploader } from '../components/ImageUploader';

export function Home() {
  const [activeTab, setActiveTab] = useState<'url' | 'image'>('url');
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Wand2 className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-100 mb-4">
            Website Builder AI
          </h1>
          <p className="text-lg text-gray-300">
            Describe your dream website or upload a screenshot, and we'll help you build it step by step
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex mb-6">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                activeTab === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Enter URL
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                activeTab === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Upload Screenshot
            </button>
          </div>

          {activeTab === 'url' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the website you want to build..."
                className="w-full h-32 p-4 bg-gray-900 text-gray-100 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500"
              />
              <button
                type="submit"
                className="w-full mt-4 bg-blue-600 text-gray-100 py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Generate Website Plan
              </button>
            </form>
          ) : (
            <ImageUploader />
          )}
        </div>
      </div>
    </div>
  );
}