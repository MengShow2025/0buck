import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChatInterface } from './components/ChatInterface';
import AdminDashboard from './pages/AdminDashboard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<ChatInterface />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
