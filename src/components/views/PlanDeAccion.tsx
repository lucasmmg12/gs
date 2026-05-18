import React, { useState } from 'react';
import type { Client } from '../../data/mockData';
import { Target, Clock, CheckCircle2, AlertCircle, Plus, CheckSquare, Square } from 'lucide-react';
import { GanttChart } from './GanttChart';

interface PlanDeAccionProps {
  client: Client;
}

export const PlanDeAccion: React.FC<PlanDeAccionProps> = ({ client }) => {
  const [intervenciones, setIntervenciones] = useState(client.intervenciones || []);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newTutor, setNewTutor] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completado': return 'bg-green-100 text-green-800';
      case 'En Progreso': return 'bg-blue-100 text-blue-800';
      case 'Bloqueado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completado': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'En Progreso': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Bloqueado': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const toggleChecklist = (intervencionId: string, checklistId: string) => {
    setIntervenciones(prev => prev.map(inv => {
      if (inv.id !== intervencionId) return inv;
      if (!inv.checklists) return inv;
      
      const newChecklists = inv.checklists.map(c => 
        c.id === checklistId ? { ...c, completed: !c.completed } : c
      );
      
      const completedCount = newChecklists.filter(c => c.completed).length;
      const progress = newChecklists.length > 0 
        ? Math.round((completedCount / newChecklists.length) * 100) 
        : inv.progress;

      return {
        ...inv,
        checklists: newChecklists,
        progress
      };
    }));
  };

  const addIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    const newIntervencion = {
      id: Date.now().toString(),
      topic: newTopic,
      tutor: newTutor || 'GS Consultor',
      date: new Date().toISOString().split('T')[0],
      status: 'Intervención Activa' as const,
      progress: 0,
      linkedProblem: newProblem,
      checklists: [
        { id: Date.now() + '1', task: 'Diagnóstico de bloqueo', completed: false },
        { id: Date.now() + '2', task: 'Definición de plan', completed: false },
        { id: Date.now() + '3', task: 'Ejecución de Praxis', completed: false },
      ]
    };

    setIntervenciones([newIntervencion, ...intervenciones]);
    setShowNewForm(false);
    setNewTopic('');
    setNewProblem('');
    setNewTutor('');
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Plan de Acción - {client.name}</h2>
        <p className="text-gray-500 mt-1">Gestión de procesos operativos, intervenciones de realidad y cronograma de ejecución.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Procesos Activos */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-red-600" /> Procesos Activos
            </h3>
            <div className="space-y-4">
              {client.processes.map(process => (
                <div key={process.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50 hover:bg-white transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800 flex items-center gap-2">
                      {getStatusIcon(process.status)} {process.name}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(process.status)}`}>
                      {process.status}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${process.status === 'Bloqueado' ? 'bg-red-500' : process.status === 'Completado' ? 'bg-green-500' : 'bg-red-600'}`} 
                      style={{ width: `${process.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">{process.progress}% completado</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Intervenciones en la Realidad */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Intervenciones en la Realidad</h3>
            <button 
              onClick={() => setShowNewForm(!showNewForm)}
              className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors border border-red-200"
            >
              <Plus className="w-4 h-4" /> Crear
            </button>
          </div>

          {showNewForm && (
            <form onSubmit={addIntervention} className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6 space-y-3 animate-in slide-in-from-top-2">
              <input 
                type="text" 
                placeholder="Título de la intervención..."
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                required
              />
              <input 
                type="text" 
                placeholder="Problema a desbloquear..."
                value={newProblem}
                onChange={e => setNewProblem(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold">Guardar</button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {intervenciones.map(intervencion => (
              <div key={intervencion.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gray-50 p-4 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" /> {intervencion.topic}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${intervencion.status === 'Praxis Aplicada' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-gray-600 border border-gray-300'}`}>
                      {intervencion.status}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 font-semibold mb-2">Bloqueo: {intervencion.linkedProblem}</p>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Consultor: {intervencion.tutor}</span>
                    <span>{intervencion.date}</span>
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="p-4 bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Checklist de Ejecución</span>
                    <span className="text-xs font-bold text-red-600">{intervencion.progress}% Completado</span>
                  </div>
                  
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                    <div className="bg-red-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${intervencion.progress}%` }}></div>
                  </div>

                  <div className="space-y-2">
                    {(intervencion.checklists || []).map(check => (
                      <div 
                        key={check.id} 
                        onClick={() => toggleChecklist(intervencion.id, check.id)}
                        className="flex items-start gap-2 cursor-pointer group"
                      >
                        {check.completed ? (
                          <CheckSquare className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${check.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {check.task}
                        </span>
                      </div>
                    ))}
                    {(!intervencion.checklists || intervencion.checklists.length === 0) && (
                      <p className="text-xs text-gray-400 italic">No hay tareas definidas.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Diagrama de Gantt re-used */}
      <div className="mt-8">
        <GanttChart gantt={client.gantt} />
      </div>

    </div>
  );
};
