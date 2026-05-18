import React, { useState } from 'react';
import { AlertCircle, FileText, Download, Share2 } from 'lucide-react';
import type { Client } from '../../data/mockData';

interface DiagnosticoDinamicoProps {
  client: Client;
}

export const DiagnosticoDinamico: React.FC<DiagnosticoDinamicoProps> = ({ client }) => {
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Diagnóstico de la Realidad</h2>
          <p className="text-gray-500 mt-1">Fotografía actual y viva de la situación operativa de <span className="font-semibold text-red-600">{client.name}</span>.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
            <Share2 className="w-4 h-4" /> Compartir
          </button>
          <button className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {showAlert && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 relative animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-semibold text-sm">Actualización Automática IA</h4>
            <p className="text-red-700 text-sm mt-1">El punto 20 (Estructura de Costos) fue actualizado recientemente basándose en la última Reunión de Gabinete.</p>
          </div>
          <button 
            onClick={() => setShowAlert(false)}
            className="absolute top-4 right-4 text-red-400 hover:text-red-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Panel de Alertas Críticas y Cuellos de Botella */}
      <div className="bg-red-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-600/30 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-3 bg-red-800/50 rounded-xl shrink-0">
            <AlertCircle className="w-8 h-8 text-red-200" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">Cuellos de Botella Detectados (IA)</h3>
            <p className="text-red-200 text-sm mb-4">Se requiere intervención inmediata de la consultora para desbloquear estos procesos críticos.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/20 p-4 rounded-xl border border-red-800/50 hover:bg-black/30 transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-red-100 text-sm">Cobranza y Liquidez</h4>
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Crítico</span>
                </div>
                <p className="text-red-200 text-xs">El retraso en cuentas por cobrar ha superado los 45 días, afectando el flujo de caja operativo en un 18%.</p>
              </div>
              <div className="bg-black/20 p-4 rounded-xl border border-red-800/50 hover:bg-black/30 transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-red-100 text-sm">Clima Laboral en Operaciones</h4>
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Alerta Media</span>
                </div>
                <p className="text-red-200 text-xs">La rotación en el área logística aumentó un 5% el último mes. Riesgo de pérdida de know-how operativo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-8 py-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">Documento de Diagnóstico - {client.name}</span>
        </div>
        
        <div className="p-10 space-y-8 text-gray-800 leading-relaxed font-serif">
          
          <section className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 font-sans border-b pb-2">18. Análisis Comercial</h1>
            <p>
              La estrategia de penetración de mercado ha mostrado resultados positivos en el último semestre. 
              La retención de clientes clave (Tier 1) se mantiene en un 94%, lo cual indica una alta satisfacción 
              con los tiempos de entrega. Sin embargo, la captación de nuevos clientes en la región norte 
              sigue siendo un desafío debido a la fuerte competencia local.
            </p>
          </section>

          <section className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 font-sans border-b pb-2">19. Cultura Organizacional</h1>
            <p>
              Los resultados de la última encuesta de clima laboral indican un compromiso general del 78%. 
              Se destaca la buena comunicación interdepartamental, aunque existen áreas de oportunidad en el 
              reconocimiento del desempeño individual. El programa de mentoría ha comenzado a mostrar 
              frutos en los mandos medios.
            </p>
          </section>

          <section className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 font-sans border-b pb-2">20. Estructura de Costos</h1>
            
            <div className="bg-red-50 border-l-4 border-red-600 p-4 -mx-4 rounded-r-lg relative transition-all hover:bg-red-100 group cursor-pointer">
              <span className="absolute top-2 right-2 text-[10px] uppercase font-bold text-red-500 tracking-wider bg-red-100 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Editado por IA
              </span>
              <p className="text-red-900">
                <strong className="font-semibold block mb-2">Evaluación Actualizada:</strong>
                Se ha detectado una tendencia al alza en la estructura de costos fijos que requiere atención inmediata para el próximo trimestre. Paralelamente, existen retrasos puntuales en la cobranza que afectan la liquidez proyectada. Es imperativo ejecutar una revisión exhaustiva del flujo de caja y regularizar las facturas pendientes de proveedores para estabilizar el ratio operativo.
              </p>
            </div>
            
            <p>
              Los costos variables se mantienen dentro de los márgenes históricos, representando el 45% 
              de los ingresos totales. La optimización de rutas logísticas implementada en enero ha 
              generado un ahorro del 3% en combustibles.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};
