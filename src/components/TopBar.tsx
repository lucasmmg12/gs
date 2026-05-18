import React from 'react';
import { Search, Bell, UserCircle } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <div className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-10 sticky top-0 z-50 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">Portal de Consultoría</h2>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-11 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 w-72 bg-gray-50/50 transition-all duration-300 hover:bg-white hover:border-gray-300 hover:shadow-sm"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300 group-hover:text-red-500" />
        </div>
        
        <button className="text-gray-400 hover:text-red-600 relative transition-colors duration-300 hover:scale-110 transform">
          <Bell className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse"></span>
        </button>
        
        <div className="flex items-center gap-4 border-l border-gray-200/60 pl-8">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-gray-900">Tutor Principal</span>
            <span className="text-xs font-medium text-red-600">Admin</span>
          </div>
          <div className="p-1 rounded-full bg-gradient-to-tr from-red-100 to-white border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <UserCircle className="w-9 h-9 text-red-800/80" />
          </div>
        </div>
      </div>
    </div>
  );
};
