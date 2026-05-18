import React, { useState } from 'react';
import { UploadCloud, FileAudio, CheckSquare, Square, Zap, Loader2, Save, FileText, CheckCircle2 } from 'lucide-react';
import type { Client } from '../../data/mockData';

interface ReunionesGabineteProps {
  client: Client;
}

export const ReunionesGabinete: React.FC<ReunionesGabineteProps> = ({ client }) => {
  const [transcription, setTranscription] = useState('');
  const [step, setStep] = useState<'input' | 'processing' | 'review' | 'success'>('input');
  
  // Simulated AI Output
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [proposedTasks, setProposedTasks] = useState([
    { id: 't1', text: 'Reestructurar el embudo de ventas del Q3', selected: true },
    { id: 't2', text: 'Agendar reunión con el equipo de SDRs para capacitación', selected: true },
    { id: 't3', text: 'Contratar nueva herramienta de CRM', selected: false }
  ]);

  const handleProcessIA = () => {
    if (!transcription.trim()) return;
    setStep('processing');

    // Simulate AI delay
    setTimeout(() => {
      setGeneratedSummary(`Durante la reunión se discutió la necesidad urgente de intervenir en el área comercial debido a la baja tasa de conversión. Se acordó que el equipo SDR necesita capacitación inmediata y que el embudo de ventas debe simplificarse. Además, se sugirió evaluar nuevos CRMs, aunque no es prioridad absoluta.`);
      setStep('review');
    }, 3000);
  };

  const toggleTask = (id: string) => {
    setProposedTasks(tasks => tasks.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const handleSave = () => {
    // Here we would normally update the global state or make an API call
    setStep('success');
  };

  const handleReset = () => {
    setTranscription('');
    setStep('input');
  };

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <div className="relative z-10">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Procesamiento de Reuniones</h2>
        <p className="text-gray-500 mt-1 font-medium">Analiza transcripciones y audios de <span className="text-red-600 font-bold">{client.name}</span> para generar minutas y tareas automáticamente.</p>
      </div>

      {step === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-red-600" /> Subir Audio
            </h3>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:border-red-400 hover:bg-red-50/50 transition-all cursor-pointer">
              <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">Arrastra y suelta el archivo de audio aquí</p>
              <p className="text-sm text-gray-400 mt-2">MP3, WAV o M4A (Max. 50MB)</p>
              <button className="mt-6 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                Seleccionar Archivo
              </button>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-all duration-300 flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" /> Pegar Transcripción
            </h3>
            <textarea 
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              placeholder="Pega aquí la transcripción cruda de la reunión..."
              className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none min-h-[200px]"
            />
            <button 
              onClick={handleProcessIA}
              disabled={!transcription.trim()}
              className="mt-6 w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-600/30 transition-all duration-300 flex justify-center items-center gap-2 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Zap className="w-5 h-5" /> Procesar con IA
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-16 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
          <Loader2 className="w-16 h-16 text-red-600 animate-spin mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Analizando la reunión de {client.name}</h3>
          <p className="text-gray-500 max-w-md">La Inteligencia Artificial está procesando el contexto, extrayendo los puntos clave y generando tareas accionables...</p>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-gradient-to-r from-red-50 to-white rounded-2xl shadow-sm border border-red-100 p-8">
            <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-600" /> Fotografía de la Realidad Actual
            </h3>
            <p className="text-gray-700 font-medium leading-relaxed bg-white/80 p-5 rounded-xl border border-red-50 shadow-sm">
              {generatedSummary}
            </p>
            <p className="text-xs text-red-600 mt-4 font-semibold">* Este texto reemplazará el resumen ejecutivo actual del cliente, reflejando su realidad inmediata.</p>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Tareas Detectadas (Minuta)</h3>
            <p className="text-sm text-gray-500 mb-6">Selecciona las tareas que deseas agregar automáticamente al Plan de Acción del cliente.</p>
            
            <div className="space-y-3">
              {proposedTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    task.selected ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {task.selected ? (
                    <CheckSquare className="w-6 h-6 text-red-600" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400" />
                  )}
                  <span className={`font-medium ${task.selected ? 'text-red-900' : 'text-gray-600'}`}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end gap-4 border-t border-gray-100 pt-6">
              <button 
                onClick={handleReset}
                className="px-6 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-gray-900 hover:bg-black text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-gray-900/20 transition-all duration-300 flex items-center gap-2"
              >
                <Save className="w-5 h-5" /> Guardar y Actualizar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-green-200 p-16 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 mb-2">¡Cliente Actualizado!</h3>
          <p className="text-gray-500 max-w-md mb-8">El resumen de {client.name} ha sido actualizado en su ficha CRM y las tareas seleccionadas se han añadido a su Plan de Acción.</p>
          <button 
            onClick={handleReset}
            className="bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all duration-300"
          >
            Procesar otra reunión
          </button>
        </div>
      )}
    </div>
  );
};
