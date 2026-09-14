import { Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  Activity,
  BookOpen
} from 'lucide-react';
import { useState } from 'react';
import GrowyChat from './GrowyChat';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Manuales y Guías', href: '/knowledge', icon: BookOpen },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Detectar si el usuario está navegando en la ficha de un cliente específico
  const clientMatch = location.pathname.match(/\/clients\/([a-zA-Z0-9_-]+)/);
  const activeClientId = clientMatch ? clientMatch[1] : undefined;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden absolute top-4 left-4 z-50">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-white text-slate-800 shadow-sm border border-slate-200 hover:bg-slate-50"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          {/* Logo area */}
          <div className="flex h-20 shrink-0 items-center px-6 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B91C1C] text-white shadow-sm">
                <Activity className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold text-slate-900 leading-tight">
                  Consultora <span className="text-[#B91C1C]">GS</span>
                </span>
                <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                  Corporate Strategy
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3.5 py-6 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-semibold border-l-2 border-[#B91C1C] shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-3 h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#B91C1C]' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center rounded-xl px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-[#B91C1C]"
            >
              <LogOut className="mr-3 h-4 w-4 text-slate-400 group-hover:text-[#B91C1C]" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 pt-18 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <GrowyChat activeClientId={activeClientId} />
    </div>
  );
}
