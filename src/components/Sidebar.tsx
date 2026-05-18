import React from 'react';
import { BarChart2, Briefcase, BookOpen, Users2, FileSignature, CreditCard, Settings, BrainCircuit, Database } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userRole?: 'consultor' | 'cliente';
  setUserRole?: (role: 'consultor' | 'cliente') => void;
}

const navModules = [
  {
    category: "Gestión Global",
    items: [
      { id: 'clientes', label: 'Directorio de Clientes', icon: Briefcase },
      { id: 'metricas', label: 'Performance Global', icon: BarChart2 },
      { id: 'data-entry', label: 'Ingreso de Datos (ABM)', icon: Database },
    ]
  },
  {
    category: "Gabinete & Metodología",
    items: [
      { id: 'conocimiento', label: 'Base de Conocimiento', icon: BookOpen },
      { id: 'consultores', label: 'Gestión de Consultores', icon: Users2 },
    ]
  },
  {
    category: "Operaciones & Comercial",
    items: [
      { id: 'pipeline', label: 'Propuestas y Pipeline', icon: FileSignature },
      { id: 'facturacion', label: 'Facturación y Retainers', icon: CreditCard },
    ]
  },
  {
    category: "Sistema & IA",
    items: [
      { id: 'ia-settings', label: 'Ajustes de Pedagogía IA', icon: BrainCircuit },
      { id: 'settings', label: 'Configuración General', icon: Settings },
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, userRole = 'consultor', setUserRole }) => {
  const toggleRole = () => {
    if (setUserRole) {
      setUserRole(userRole === 'consultor' ? 'cliente' : 'consultor');
      if (userRole === 'consultor') {
        setCurrentView('clientes'); // Force to client view when switching to client mode
      }
    }
  };

  const displayedModules = userRole === 'consultor' 
    ? navModules 
    : [
        {
          category: "Mi Portal Corporativo",
          items: [
            { id: 'clientes', label: 'Mi Expediente', icon: Briefcase },
            { id: 'settings', label: 'Configuración de Perfil', icon: Settings },
          ]
        }
      ];

  return (
    <div className="w-64 bg-gradient-to-b from-black via-[#1a0505] to-red-950 text-white h-full flex flex-col fixed left-0 top-0 shadow-2xl border-r border-red-900/30 overflow-y-auto">
      <div className="p-8 pb-4 shrink-0">
        <h1 className="text-2xl font-extrabold tracking-tight">
          <span className="text-white drop-shadow-sm">Estudio GS</span> <span className="text-red-600 drop-shadow-sm">Consultora</span>
        </h1>
        <div className="h-px w-full bg-gradient-to-r from-red-600/50 to-transparent mt-6"></div>
      </div>
      <nav className="flex-1 mt-2 px-4 pb-8 space-y-6">
        {displayedModules.map((module, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-4 mb-2">
              {module.category}
            </h3>
            <ul className="space-y-1.5">
              {module.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-300 ease-out relative group overflow-hidden ${
                        isActive ? 'bg-red-900/40 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-red-800/50' : 'hover:bg-white/5 text-gray-400 hover:text-gray-100 border border-transparent'
                      }`}
                    >
                      {isActive && <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-transparent pointer-events-none"></div>}
                      <Icon className={`w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]' : ''}`} />
                      <span className="font-medium text-sm relative z-10 tracking-wide">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-6 border-t border-red-900/30 space-y-4">
        
        {setUserRole && (
          <button 
            onClick={toggleRole}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all border ${
              userRole === 'consultor' 
                ? 'bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10' 
                : 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50 hover:bg-red-500'
            }`}
          >
            {userRole === 'consultor' ? 'Cambiar a Vista Cliente' : 'Volver a Modo Consultor'}
          </button>
        )}

        <div className="bg-black/40 rounded-lg p-4 backdrop-blur-sm border border-white/5">
          <p className="text-xs text-gray-400 text-center font-medium tracking-wider uppercase">Sistema de Gestión</p>
          <p className="text-[10px] text-gray-600 text-center mt-1">&copy; 2026 Estudio GS Consultora</p>
        </div>
      </div>
    </div>
  );
};
