import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Phone, GraduationCap, Newspaper } from 'lucide-react';


import Home from "./screens/CallingScreen"; // Calling screen
import CallLogs from "./screens/CallLogs"; // Call history
import FraudNews from "./screens/FraudNews"; // Fraud-related news
// Individual navigation item component
const NavItem = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-3 transition-all duration-200 ${
      isActive 
        ? 'text-blue-600 translate-y-[-4px]' 
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    <div className={`p-2 rounded-full mb-1 ${
      isActive 
        ? 'bg-blue-100' 
        : 'bg-transparent'
    }`}>
      {icon}
    </div>
    <span className={`text-xs font-medium ${
      isActive ? 'text-blue-600' : 'text-gray-500'
    }`}>
      {label}
    </span>
  </button>
);

// Bottom Navigation component
function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      label: 'Call',
      icon: <Phone size={20} />,
      activeColor: 'blue'
    },
    {
      path: '/call-logs',
      label: 'Awareness',
      icon: <GraduationCap size={20} />,
      activeColor: 'blue'
    },
    {
      path: '/fraud-news',
      label: 'News',
      icon: <Newspaper size={20} />,
      activeColor: 'blue'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0">
      {/* Gradient separator */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      
      {/* Navigation container */}
      <nav className="flex items-center bg-white border-t border-gray-100 shadow-lg">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>
      
      {/* Safe area spacing for modern phones */}
      <div className="h-safe-area bg-white" />
    </div>
  );
}

// Main App component
const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/call-logs" element={<CallLogs />} />
          <Route path="/fraud-news" element={<FraudNews />} />
        </Routes>
      </div>
      <Navigation />
    </Router>
  );
};

export default App;