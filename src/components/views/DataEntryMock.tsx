import React, { useState } from 'react';
import type { Client } from '../../data/mockData';
import { Database, Plus, UploadCloud, BrainCircuit, CheckCircle2 } from 'lucide-react';

interface DataEntryMockProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

export const DataEntryMock: React.FC<DataEntryMockProps> = ({ clients, setClients }) => {
  const [newClientName, setNewClientName] = useState('');
  const [newClientIndustry, setNewClientIndustry] = useState('');
  const [newClientCEO, setNewClientCEO] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // IA Upload Mock State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showIASuccess, setShowIASuccess] = useState(false);

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;

    const newClient: Client = {
      id: Date.now().toString(),
      name: newClientName,
      industry: newClientIndustry || 'General',
      contact: {
        ceo: newClientCEO || 'Pendiente',
        email: 'contacto@' + newClientName.toLowerCase().replace(/\s/g, '') + '.com',
        phone: '+54 9 11 0000-0000',
        address: 'Dirección a confirmar',
      },
      executiveSummary: 'Empresa recientemente añadida al ecosistema Estudio GS. Pendiente de diagnóstico profundo.',
      radarData: [
        { subject: 'Finanzas', A: 50, fullMark: 100 },
        { subject: 'Estructura', A: 50, fullMark: 100 },
        { subject: 'Comercial', A: 50, fullMark: 100 },
        { subject: 'Cultura', A: 50, fullMark: 100 },
        { subject: 'Procesos', A: 50, fullMark: 100 },
      ],
      kpis: {
        tasksCompleted: '0%',
        daysInProgram: '0',
        nextMeeting: 'Por definir',
        attentionRequiredArea: 'Diagnóstico Inicial',
        attentionRequiredText: 'Se requiere realizar el pentágono del orden.',
      },
      processes: [],
      intervenciones: [],
      metrics: {
        revenueGrowth: 0,
        costReduction: 0,
        teamSatisfaction: 50,
        productivityIndex: 50,
        realityAdherence: 50,
        monthlyPerformance: [],
      },
      gantt: [],
    };

    setClients([newClient, ...clients]);
    setNewClientName('');
    setNewClientIndustry('');
    setNewClientCEO('');
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUploadAudio = () => {
    if (!selectedClientId) return;
    
    setIsUploading(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      setIsUploading(false);
      
      setClients(prev => prev.map(c => {
        if (c.id !== selectedClientId) return c;
        
        // Add a mock intervention extracted from "Audio"
        const aiIntervention = {
          id: Date.now().toString(),
          topic: 'Análisis de Crisis - Detectado por IA',
          tutor: 'GS Bot',
          date: new Date().toISOString().split('T')[0],
          status: 'Diagnóstico Conjunto' as const,
          progress: 0,
          linkedProblem: 'Fricción en reuniones reportada en audio',
          checklists: [
            { id: Date.now() + '1', task: 'Validar acta de reunión', completed: false },
            { id: Date.now() + '2', task: 'Agendar intervención 1 a 1', completed: false },
          ]
        };

        return {
          ...c,
          intervenciones: [aiIntervention, ...c.intervenciones]
        };
      }));

      setShowIASuccess(true);
      setTimeout(() => setShowIASuccess(false), 4000);
      setSelectedClientId('');
    }, 2500);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Database className="w-8 h-8 text-red-600" />
          Módulo de Ingreso de Datos (Admin)
        </h2>
        <p className="text-gray-500 mt-2">
          Este panel simula cómo los administradores cargarán información en el sistema o cómo la Inteligencia Artificial procesará automáticamente audios y actas. Todo lo que cargues aquí se reflejará instantáneamente en el Directorio y los Dashboards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Formulario Alta de Cliente */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="bg-gray-50 border-b border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" /> Alta de Nueva Empresa
            </h3>
            <p className="text-sm text-gray-500 mt-1">Crea un cliente nuevo en la base de datos.</p>
          </div>
          
          <form onSubmit={handleCreateClient} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Empresa</label>
              <input 
                type="text" 
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                placeholder="Ej. Constructora Andina S.A."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rubro Industrial</label>
                <input 
                  type="text" 
                  value={newClientIndustry}
                  onChange={e => setNewClientIndustry(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="Ej. Construcción"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del CEO/Director</label>
                <input 
                  type="text" 
                  value={newClientCEO}
                  onChange={e => setNewClientCEO(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="Ej. Roberto Sánchez"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg shadow-md hover:bg-black hover:shadow-xl transition-all"
              >
                Registrar Cliente en la Plataforma
              </button>
            </div>
          </form>

          {showSuccess && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900">¡Cliente Creado!</h3>
              <p className="text-gray-500 mt-2">Puedes verlo en el Directorio Global.</p>
            </div>
          )}
        </div>

        {/* Simulador de Ingreso por IA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="bg-gradient-to-r from-red-600 to-red-800 p-6 text-white">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BrainCircuit className="w-6 h-6" /> Data Entry IA (Automático)
            </h3>
            <p className="text-sm text-red-100 mt-1">Sube el acta o audio de una reunión. La IA extraerá los problemas y creará la intervención sola.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Seleccionar Cliente a Analizar</label>
              <select 
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all font-medium text-gray-700"
              >
                <option value="">-- Selecciona una empresa --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${selectedClientId ? 'border-red-300 bg-red-50 cursor-pointer hover:bg-red-100' : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'}`}
              onClick={selectedClientId && !isUploading ? handleUploadAudio : undefined}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 relative mb-4">
                    <div className="absolute inset-0 border-4 border-red-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="font-bold text-red-600">IA Procesando Audio...</p>
                  <p className="text-xs text-red-400 mt-1">Transcribiendo y extrayendo insights.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-red-500 mb-4">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-gray-800">Haz clic para "Subir Audio"</p>
                  <p className="text-xs text-gray-500 mt-1">Simula subir un MP3 de una reunión de gabinete</p>
                </div>
              )}
            </div>
          </div>

          {showIASuccess && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <BrainCircuit className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">¡Análisis Completado!</h3>
              <p className="text-gray-500 mt-2">La IA detectó una anomalía y generó una nueva intervención automáticamente.</p>
              <p className="text-sm font-bold text-red-600 mt-4">Ve al Plan de Acción del cliente para verla.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
