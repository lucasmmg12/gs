import React from 'react';
import type { Client } from '../../data/mockData';

interface GanttChartProps {
  gantt: Client['gantt'];
}

export const GanttChart: React.FC<GanttChartProps> = ({ gantt }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Cronograma de Implementación (Gantt)</h3>
      
      <div className="relative">
        {/* Cabecera meses */}
        <div className="flex border-b border-gray-200 pb-2 mb-4">
          <div className="w-1/3"></div>
          <div className="w-2/3 flex justify-between px-2 text-xs font-medium text-gray-400">
            <span>Mes 1</span>
            <span>Mes 2</span>
            <span>Mes 3</span>
            <span>Mes 4</span>
            <span>Mes 5</span>
            <span>Mes 6</span>
          </div>
        </div>

        {/* Tareas */}
        <div className="space-y-6 relative">
          {/* Grid lines */}
          <div className="absolute top-0 right-0 bottom-0 w-2/3 flex justify-between z-0 px-2 pointer-events-none">
            <div className="w-px h-full bg-gray-100"></div>
            <div className="w-px h-full bg-gray-100"></div>
            <div className="w-px h-full bg-gray-100"></div>
            <div className="w-px h-full bg-gray-100"></div>
            <div className="w-px h-full bg-gray-100"></div>
            <div className="w-px h-full bg-gray-100"></div>
          </div>

          {gantt.map(item => (
            <div key={item.id} className="flex items-center relative z-10">
              <div className="w-1/3 pr-4 text-sm font-medium text-gray-700 truncate" title={item.task}>
                {item.task}
              </div>
              <div className="w-2/3 relative h-8 rounded bg-gray-50 border border-gray-100">
                <div 
                  className="absolute top-0 bottom-0 bg-red-100 border border-red-300 rounded overflow-hidden"
                  style={{ 
                    left: `${(item.startMonth / 6) * 100}%`, 
                    width: `${(item.durationMonths / 6) * 100}%` 
                  }}
                >
                  <div 
                    className="h-full bg-red-600 transition-all"
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex gap-4 text-xs text-gray-500 justify-center">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 rounded-sm"></div> Progreso Actual</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></div> Tiempo Planificado</div>
        </div>
      </div>
    </div>
  );
};
