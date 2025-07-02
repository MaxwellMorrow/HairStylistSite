import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, X } from 'lucide-react';

const ChatBot = () => {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );
    
    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only images under 5MB are allowed.');
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setFileInputKey(prev => prev + 1); // Reset file input
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && selectedFiles.length === 0) || loading) return;
    
    console.log('=== FRONTEND CHAT REQUEST ===');
    console.log('User input:', input);
    console.log('User ID:', user?._id);
    console.log('Selected files:', selectedFiles.length);
    
    const userMessage = { 
      sender: 'user', 
      text: input,
      files: selectedFiles.length > 0 ? selectedFiles.map(f => f.name) : []
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('message', input);
      formData.append('userId', user?._id || '');
      
      selectedFiles.forEach((file, index) => {
        formData.append('inspoPhotos', file);
      });
      
      console.log('Sending to backend:', { message: input, userId: user?._id, files: selectedFiles.length });
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData // No Content-Type header for FormData
      });
      
      const data = await res.json();
      console.log('Backend response:', data);
      
      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
      setSelectedFiles([]); // Clear selected files after sending
    } catch (err) {
      console.error('Frontend error:', err);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Sorry, there was an error connecting to the AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Show admin-only message if not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col h-[500px] w-full max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
            <p className="text-gray-600">This AI ChatBot is only available to administrators for demonstration purposes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`px-4 py-2 rounded-lg max-w-xs text-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              dangerouslySetInnerHTML={{ 
                __html: msg.text.replace(/\n/g, '<br>') 
              }}
            />
            {msg.files && msg.files.length > 0 && (
              <div className="mt-2 text-xs text-blue-300">
                📎 {msg.files.length} photo(s) uploaded
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="mb-2 flex justify-start">
            <div className="px-4 py-2 rounded-lg max-w-xs text-sm bg-gray-200 text-gray-800 animate-pulse">AI is typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* File Preview */}
      {selectedFiles.length > 0 && (
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-12 h-12 object-cover rounded border"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 w-4 h-4 flex items-center justify-center"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSend} className="flex p-2 border-t border-gray-200 bg-white">
        <input
          type="text"
          className="flex-1 px-3 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <input
          ref={fileInputRef}
          key={fileInputKey}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="chat-file-input"
        />
        <label
          htmlFor="chat-file-input"
          className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 transition cursor-pointer border-t border-b border-gray-300"
        >
          <Upload className="w-4 h-4" />
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition"
          disabled={loading}
        >
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatBot; 