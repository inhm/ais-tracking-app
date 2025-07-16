import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { MapPage } from './components/MapPage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'map'>('dashboard');

  const showMap = () => setCurrentPage('map');
  const showDashboard = () => setCurrentPage('dashboard');

  return (
    <div className="App">
      {currentPage === 'dashboard' ? (
        <Dashboard onOpenMap={showMap} />
      ) : (
        <MapPage onBack={showDashboard} />
      )}
    </div>
  );
}

export default App;
