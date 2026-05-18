import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { MetricasPerformance } from './components/views/MetricasPerformance';
import { Clientes } from './components/views/Clientes';
import { mockClients } from './data/mockData';
import type { Client } from './data/mockData';
import { DataEntryMock } from './components/views/DataEntryMock';

function App() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'consultor' | 'cliente'>('consultor');

  // Force a selected client in 'cliente' mode to prevent showing the directory
  useEffect(() => {
    if (userRole === 'cliente' && !selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [userRole, selectedClientId, clients]);

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  const renderView = (currentView: string) => {
    if (currentView === 'metricas') {
      return <MetricasPerformance clients={clients} />;
    }

    if (currentView === 'data-entry') {
      return <DataEntryMock clients={clients} setClients={setClients} />;
    }

    if (currentView === 'clientes') {
      return (
        <Clientes 
          clients={clients} 
          setClients={setClients}
          selectedClientId={selectedClientId} 
          setSelectedClientId={setSelectedClientId} 
          userRole={userRole}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] animate-in fade-in zoom-in duration-500 px-4">
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 shadow-2xl rounded-3xl p-10 max-w-2xl text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-transparent to-red-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-50"></div>
            <div className="relative bg-gradient-to-br from-red-600 to-red-800 rounded-full w-full h-full flex items-center justify-center shadow-xl shadow-red-900/20">
              <span className="text-4xl text-white">🚀</span>
            </div>
          </div>
          
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Desbloquea el Potencial Total
          </h2>
          
          <p className="text-lg text-gray-600 mb-8 leading-relaxed font-medium">
            Estás visualizando una función exclusiva de la <span className="text-red-600 font-bold">Suite Premium v2.0</span>. 
            Este módulo integra Inteligencia Artificial avanzada, automatización de flujos de trabajo y análisis predictivo para escalar las operaciones de tu consultora sin límites.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-10">
            {[
              "Automatización de procesos end-to-end",
              "Análisis predictivo con IA dedicada",
              "Integración financiera y operativa",
              "Escalabilidad garantizada"
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-bold text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
          
          <button className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-black/10 hover:shadow-red-900/20 hover:-translate-y-1 w-full sm:w-auto relative z-10">
            Solicitar Presupuesto del Sistema Completo
          </button>
          
          <p className="text-xs text-gray-400 mt-6 font-medium uppercase tracking-wider">
            Arquitectura escalable lista para implementación
          </p>
        </div>
      </div>
    );
  };

  return (
    <Layout 
      selectedClient={selectedClient || undefined}
      userRole={userRole}
      setUserRole={setUserRole}
    >
      {renderView}
    </Layout>
  );
}

export default App;
