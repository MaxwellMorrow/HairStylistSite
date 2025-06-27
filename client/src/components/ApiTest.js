import React, { useState } from 'react';
import { servicesAPI, galleryAPI, adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const ApiTest = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (name, apiCall) => {
    setLoading(true);
    try {
      const response = await apiCall();
      setResults(prev => ({
        ...prev,
        [name]: { success: true, data: response.data }
      }));
      toast.success(`${name} endpoint working!`);
    } catch (error) {
      console.error(`${name} error:`, error);
      setResults(prev => ({
        ...prev,
        [name]: { 
          success: false, 
          error: error.response?.data?.error || error.message,
          status: error.response?.status,
          details: error.response?.data
        }
      }));
      toast.error(`${name} endpoint failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createSampleService = async () => {
    setLoading(true);
    try {
      const sampleService = {
        name: "Test Haircut",
        description: "A test haircut service",
        category: "haircut",
        duration: 60,
        price: 45,
        isActive: true
      };
      
      const response = await servicesAPI.create(sampleService);
      setResults(prev => ({
        ...prev,
        'Create Service': { success: true, data: response.data }
      }));
      toast.success('Sample service created!');
    } catch (error) {
      console.error('Create service error:', error);
      setResults(prev => ({
        ...prev,
        'Create Service': { 
          success: false, 
          error: error.response?.data?.error || error.message,
          status: error.response?.status
        }
      }));
      toast.error(`Create service failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults({});
    
    // Test services endpoint
    await testEndpoint('Services', () => servicesAPI.getAll());
    
    // Test gallery endpoint
    await testEndpoint('Gallery', () => galleryAPI.getAll());
    
    // Test admin dashboard (might fail if not admin)
    await testEndpoint('Admin Dashboard', () => adminAPI.getDashboard());
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">API Integration Test</h2>
      
      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={loading}
          className="btn-primary mr-4"
        >
          {loading ? 'Testing...' : 'Run All Tests'}
        </button>
        
        <button
          onClick={() => testEndpoint('Services', () => servicesAPI.getAll())}
          disabled={loading}
          className="btn-secondary mr-4"
        >
          Test Services
        </button>
        
        <button
          onClick={() => testEndpoint('Gallery', () => galleryAPI.getAll())}
          disabled={loading}
          className="btn-secondary mr-4"
        >
          Test Gallery
        </button>

        <button
          onClick={createSampleService}
          disabled={loading}
          className="btn-outline"
        >
          Create Sample Service
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(results).map(([name, result]) => (
          <div key={name} className="card">
            <h3 className="font-semibold mb-2">{name}</h3>
            {result.success ? (
              <div className="text-green-600">
                ✅ Success: {JSON.stringify(result.data, null, 2)}
              </div>
            ) : (
              <div className="text-red-600">
                ❌ Error: {result.error}
                {result.status && <div className="text-sm">Status: {result.status}</div>}
                {result.details && <div className="text-sm">Details: {JSON.stringify(result.details, null, 2)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Run All Tests" to test all API endpoints</li>
          <li>Check the results below for each endpoint</li>
          <li>Green = Success, Red = Error</li>
          <li>Admin endpoints may fail if you're not logged in as admin</li>
          <li>Try "Create Sample Service" if services endpoint fails</li>
        </ol>
      </div>
    </div>
  );
};

export default ApiTest; 