import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, AlertTriangle, Target, Zap, ChevronRight } from 'lucide-react';
import type { Client } from '../../data/mockData';
import { GanttChart } from './GanttChart';

interface Dashboard360Props {
  client: Client;
}

export const Dashboard360: React.FC<Dashboard360Props> = ({ client }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleDownload = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // alert('Reporte Ejecutivo descargado con éxito.');
    }, 3000);
  };

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-end relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard 360</h2>
          <p className="text-gray-500 mt-1 font-medium">Visión general del estado actual de <span className="text-red-600 font-bold">{client.name}</span></p>
        </div>
        <button 
          onClick={handleDownload}
          disabled={isGenerating}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold shadow-lg transition-all duration-300 ${
            isGenerating 
              ? 'bg-red-800 text-white/80 cursor-wait shadow-red-900/30' 
              : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-600/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-600/40'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando Reporte con IA...
            </>
          ) : (
            'Descargar Reporte Ejecutivo PDF'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
              <Target className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tareas Completadas</p>
              <p className="text-2xl font-extrabold text-gray-900">{client.kpis.tasksCompleted}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
                Porcentaje de hitos operativos finalizados según el cronograma.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
              <Calendar className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Días en Programa</p>
              <p className="text-2xl font-extrabold text-gray-900">{client.kpis.daysInProgram}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
                Tiempo transcurrido desde el Kickoff inicial del proyecto.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Adherencia a la Realidad</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-extrabold text-gray-900">{client.metrics.realityAdherence}</p>
                <span className="text-sm font-bold text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
                Nivel de compromiso e implementación del Pentágono del Orden.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border-l-4 border-l-orange-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Atención Requerida</p>
              <p className="text-lg font-bold text-gray-900">{client.kpis.attentionRequiredArea}</p>
              <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
                El área de la empresa que presenta mayor rezago o riesgo crítico.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-all duration-300">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-600" /> Estado del Pentágono del Orden
          </h3>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={client.radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 14, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Radar
                  name={client.name}
                  dataKey="A"
                  stroke="#7f1d1d"
                  fill="#991b1b"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" /> Foco Semanal
            </h3>
            <div className="bg-red-50/50 rounded-xl p-5 border border-red-100/50">
              <h4 className="font-bold text-red-900 mb-2">{client.kpis.attentionRequiredArea}</h4>
              <p className="text-sm text-red-800/80 leading-relaxed">
                {client.kpis.attentionRequiredText}
              </p>
              <button className="mt-4 text-red-700 text-sm font-bold flex items-center gap-1 hover:text-red-800 transition-colors">
                Ver detalle del área <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 relative z-10">
        <GanttChart gantt={client.gantt} />
      </div>
    </div>
  );
};
