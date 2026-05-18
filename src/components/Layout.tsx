import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AIAssistant } from './AIAssistant';
import type { Client } from '../data/mockData';

interface LayoutProps {
  children: (currentView: string) => React.ReactNode;
  selectedClient?: Client;
  userRole: 'consultor' | 'cliente';
  setUserRole: (role: 'consultor' | 'cliente') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, selectedClient, userRole, setUserRole }) => {
  const [currentView, setCurrentView] = useState('clientes');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        userRole={userRole} 
        setUserRole={setUserRole} 
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 overflow-x-hidden">
          {children(currentView)}
        </main>
      </div>
      <AIAssistant activeTab={currentView} selectedClient={selectedClient} userRole={userRole} />
    </div>
  );
};
