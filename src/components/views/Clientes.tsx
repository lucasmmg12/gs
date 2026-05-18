import React, { useState } from 'react';
import type { Client } from '../../data/mockData';
import { Building2, Mail, Phone, MapPin, User, ChevronLeft, CheckCircle2, Clock, LayoutDashboard, Target, FileText, Users, MessageCircle, DollarSign, Sparkles, FolderOpen, Receipt, Settings } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

import { Dashboard360 } from './Dashboard360';
import { PlanDeAccion } from './PlanDeAccion';
import { DiagnosticoDinamico } from './DiagnosticoDinamico';
import { ReunionesGabinete } from './ReunionesGabinete';
import { FinanzasCliente } from './FinanzasCliente';
import { DocumentosCliente } from './DocumentosCliente';
import { FacturasCliente } from './FacturasCliente';
import { ConfiguracionCliente } from './ConfiguracionCliente';
import { WhatsAppDrawer } from '../WhatsAppDrawer';

interface ClientesProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  userRole?: 'consultor' | 'cliente';
}

export const Clientes: React.FC<ClientesProps> = ({ 
  clients, 
  setClients,
  selectedClientId, 
  setSelectedClientId,
  userRole = 'consultor' 
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (!selectedClient) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Directorio de Clientes</h2>
          <p className="text-gray-500 mt-1">Selecciona un cliente para ver su perfil completo y métricas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div 
              key={client.id} 
              onClick={() => {
                setSelectedClientId(client.id);
                setActiveTab('perfil'); // Reset tab on new client selection
              }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-xl hover:shadow-red-900/5 hover:-translate-y-1 hover:border-red-200 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl group-hover:from-red-50 group-hover:to-red-100 transition-all duration-300 shadow-sm border border-gray-100">
                  <Building2 className="w-6 h-6 text-gray-500 group-hover:text-red-600 transition-colors duration-300" />
                </div>
                <span className="bg-white border border-gray-200 shadow-sm text-gray-600 text-xs px-3 py-1.5 rounded-full font-semibold tracking-wide">
                  {client.industry}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2 relative z-10">{client.name}</h3>
              <div className="space-y-2 mt-4 relative z-10">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <User className="w-4 h-4" /> {client.contact.ceo}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {client.contact.email}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button className="text-red-600 font-medium text-sm group-hover:text-red-700 flex items-center gap-1">
                  Abrir Expediente &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getDynamicAISummary = () => {
    switch (activeTab) {
      case 'dashboard':
        return `Análisis predictivo activado: ${selectedClient.name} tiene un score de adherencia a la realidad de ${selectedClient.metrics.realityAdherence}%. Se recomienda enfocar los esfuerzos en desbloquear los procesos logísticos que actualmente están deteniendo el 30% del flujo operativo.`;
      case 'plan':
        return `Planificación Estratégica: Existen ${selectedClient.processes.filter(p => p.status === 'Bloqueado').length} procesos bloqueados críticos. Las intervenciones de praxis programadas para este mes se enfocan en mitigar estos riesgos de forma prioritaria.`;
      case 'diagnostico':
        return `Actualización Automática: La última reunión de gabinete modificó sustancialmente la sección de 'Estructura de Costos', detectando una fuga de capital en operaciones de campo. El diagnóstico ha sido reescrito para reflejar este nuevo estado.`;
      case 'finanzas':
        return `Salud Financiera: El margen operativo actual (32.4%) está por debajo de la meta anual. El análisis de eficiencia de capital sugiere que los proyectos en el cuadrante de bajo retorno deben reestructurarse inmediatamente.`;
      case 'reuniones':
        return `Asistente de Reuniones: Listo para transcribir y procesar la próxima interacción. Sube un audio para extraer compromisos de praxis y actualizar automáticamente la radiografía del cliente.`;
      case 'documentos':
        return `Análisis Documental: Se ha indexado un nuevo documento ("Estructura_Costos_Q3.xlsx"). Los datos han sido cruzados con el Gabinete Financiero para actualizar las proyecciones de flujo de caja.`;
      case 'facturas':
        return `Gestión de Cobros: La cuenta se encuentra al día. El próximo vencimiento del Retainer Mensual está programado para dentro de 12 días. No hay alertas de morosidad.`;
      case 'perfil':
      default:
        return selectedClient.executiveSummary;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard360 client={selectedClient} />;
      case 'plan':
        return <PlanDeAccion client={selectedClient} />;
      case 'diagnostico':
        return <DiagnosticoDinamico client={selectedClient} />;
      case 'finanzas':
        return <FinanzasCliente client={selectedClient} />;
      case 'reuniones':
        return <ReunionesGabinete client={selectedClient} />;
      case 'documentos':
        return <DocumentosCliente client={selectedClient} />;
      case 'facturas':
        return <FacturasCliente client={selectedClient} />;
      case 'configuracion':
        return <ConfiguracionCliente client={selectedClient} setClients={setClients} />;
      case 'perfil':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Datos Generales y Tutorías */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-shadow duration-300 relative">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-600" /> Datos de Contacto
                  </h3>
                  <button 
                    onClick={() => setIsWhatsAppOpen(true)}
                    className="flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm shadow-[#25D366]/30"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" /> WhatsApp
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-3 text-gray-600">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase">CEO / Director</p>
                      <p className="font-medium text-gray-900">{selectedClient.contact.ceo}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-gray-600">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase">Email Corporativo</p>
                      <p className="font-medium text-gray-900">{selectedClient.contact.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-gray-600">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase">Teléfono</p>
                      <p className="font-medium text-gray-900">{selectedClient.contact.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-gray-600">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase">Ubicación</p>
                      <p className="font-medium text-gray-900">{selectedClient.contact.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-red-600" /> Intervenciones en la Realidad
                </h3>
                <div className="space-y-6">
                  {selectedClient.intervenciones.map(intervencion => (
                    <div key={intervencion.id} className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            {intervencion.status === 'Praxis Aplicada' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-500" />
                            )}
                            {intervencion.topic}
                          </span>
                          <p className="text-xs font-semibold text-red-600 mt-1">Bloqueo: {intervencion.linkedProblem}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-md border shadow-sm">
                          {intervencion.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex justify-between">
                        <span>Consultor: <span className="font-semibold">{intervencion.tutor}</span></span>
                        <span>{intervencion.date}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pentágono del Orden */}
            <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 flex flex-col items-center hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-50/30 rounded-full blur-3xl pointer-events-none group-hover:bg-red-50/50 transition-colors duration-700"></div>
              <div className="self-start mb-4 relative z-10">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">El Pentágono del Orden</h3>
                <p className="text-gray-500 font-medium mt-1">Distribución del rendimiento general de la empresa por áreas.</p>
              </div>
              
              <div className="w-full h-[550px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={selectedClient.radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 14, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Radar
                      name={selectedClient.name}
                      dataKey="A"
                      stroke="#7f1d1d"
                      strokeWidth={2}
                      fill="#991b1b"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
    }
  };

  const tabs = [
    { id: 'perfil', label: 'Perfil y Contacto', icon: Building2 },
    { id: 'dashboard', label: 'Dashboard 360', icon: LayoutDashboard },
    { id: 'plan', label: 'Plan de Acción', icon: Target },
    { id: 'diagnostico', label: 'Diagnóstico', icon: FileText },
    { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
    { id: 'documentos', label: 'Documentos', icon: FolderOpen },
    { id: 'facturas', label: 'Facturas', icon: Receipt },
    { id: 'reuniones', label: 'Reuniones IA', icon: Users },
  ];

  if (userRole === 'consultor') {
    tabs.push({ id: 'configuracion', label: 'ABM & Settings', icon: Settings });
  }

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-right-8 duration-300">
      {userRole === 'consultor' && (
        <button 
          onClick={() => setSelectedClientId(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Directorio Global
        </button>
      )}

      {/* Client Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full pointer-events-none opacity-60"></div>
        <div className="relative z-10 w-full">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{selectedClient.name}</h2>
            <span className="bg-gradient-to-r from-red-100 to-red-50 border border-red-200 text-red-800 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
              {selectedClient.industry}
            </span>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-white p-4 rounded-xl border border-red-100 mb-6 flex gap-3 items-start shadow-sm transition-all duration-300">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-red-50 shrink-0">
              <Sparkles className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                Insights de Inteligencia Artificial
              </h4>
              <p className="text-gray-700 text-sm font-medium leading-relaxed max-w-4xl">
                {getDynamicAISummary()}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap
                    ${isActive 
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-100' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Render selected view */}
      <div className="mt-8">
        {renderTabContent()}
      </div>

      <WhatsAppDrawer 
        isOpen={isWhatsAppOpen} 
        onClose={() => setIsWhatsAppOpen(false)} 
        client={selectedClient} 
      />
    </div>
  );
};
