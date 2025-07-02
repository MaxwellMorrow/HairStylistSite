import React from 'react';
import ChatBot from '../components/ChatBot';

const AdminChatBot = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="section-title">AI ChatBot - Admin Demo</h1>
          <p className="section-subtitle">
            Test and demonstrate the AI-powered booking assistant
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm text-blue-800">
              <strong>Admin Access Only:</strong> This AI ChatBot is available for demonstration purposes. 
              Regular users will use the traditional booking flow for appointments.
            </p>
          </div>
        </div>

        {/* ChatBot Component */}
        <div className="flex justify-center">
          <ChatBot />
        </div>

        {/* Admin Notes */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Notes</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• This ChatBot can help users book appointments, upload photos, and manage their bookings</p>
            <p>• It uses Azure OpenAI to understand natural language and generate booking requests</p>
            <p>• Users can upload inspiration photos and add notes to their appointments</p>
            <p>• The AI maintains conversation context and can handle complex booking scenarios</p>
            <p>• Regular users will use the traditional booking flow for a more controlled experience</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatBot; 