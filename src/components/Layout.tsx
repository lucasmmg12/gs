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
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden absolute top-4 left-4 z-50">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-zinc-950 text-white shadow-md border border-zinc-800 hover:bg-zinc-900"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r-2 border-zinc-900 shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          {/* Logo area */}
          <div className="flex h-20 shrink-0 items-center px-6 border-b-2 border-zinc-900 bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white shadow-crimson">
                <Activity className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-black tracking-wider uppercase text-white leading-tight">
                  CONSULTORA <span className="text-red-600">GS</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  Strategic Engine
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center rounded-lg px-3.5 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-zinc-950 text-white border-l-4 border-l-red-600 shadow-sm'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-3 h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-red-500' : 'text-zinc-400 group-hover:text-zinc-900'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t-2 border-zinc-900 bg-zinc-50">
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="mr-3 h-4 w-4 text-zinc-400 group-hover:text-red-600" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 lg:p-8 pt-20 lg:pt-8">
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
