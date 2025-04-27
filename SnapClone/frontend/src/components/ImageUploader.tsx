import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../config';

export function ImageUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB.');
      return false;
    }
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      handleImageSelect(file);
    }
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        handleImageSelect(file);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('prompt', prompt);

    try {
      const response = await axios.post(`${BACKEND_URL}/analyze-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      navigate('/builder', { 
        state: { 
          imageAnalysis: response.data,
          prompt: prompt
        } 
      });
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      console.error('Error analyzing image:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/10 scale-102'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <div className="bg-blue-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
              Drop image here
            </div>
          </div>
        )}
        
        {preview ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto rounded-lg shadow-md"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setPreview(null);
                }}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-gray-300">
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-12 h-12 text-gray-400" />
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-lg mb-2">Drag and drop your website screenshot here</p>
              <p className="text-sm text-gray-400">or</p>
              <label className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
                Browse Files
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileInput}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">
              Supports: PNG, JPG, JPEG (max 5MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 text-red-500 text-center bg-red-500/10 p-3 rounded-lg">
          {error}
        </div>
      )}

      {selectedImage && (
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe any additional features or modifications you'd like for this design..."
            className="w-full h-32 p-4 bg-gray-900 text-gray-100 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500"
          />
          <div className="text-center">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`px-6 py-2 bg-blue-500 text-white rounded-lg transition-all duration-200 ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-600 hover:shadow-lg hover:scale-105'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Analyze Image & Generate'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 