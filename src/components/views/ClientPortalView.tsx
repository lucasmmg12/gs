import React, { useState } from 'react';
import { 
  Award, Sparkles, Copy, 
  Download, Check
} from 'lucide-react';
import type { FullDiagnosticResults } from '../../lib/diagnosticEngine';
import type { Client } from '../../data/mockData';

interface ClientPortalViewProps {
  client: Client;
  results: FullDiagnosticResults;
  isDiagnosticApproved?: boolean;
}

type PortalTab = 'minutes' | 'diagnostic' | 'pentagon' | 'master_plan' | 'self_assessment' | 'content_generator';

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  client,
  results,
  isDiagnosticApproved = true
}) => {
  const [activeTab, setActiveTab] = useState<PortalTab>('pentagon');
  const [selectedContentType, setSelectedContentType] = useState<'propuesta_valor' | 'brochure' | 'pitch'>('propuesta_valor');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generador de Contenidos PyME con IA a partir de los datos estratégicos unificados
  const handleGenerateContent = () => {
    setIsGenerating(true);
    setTimeout(() => {
      let text = '';
      if (selectedContentType === 'propuesta_valor') {
        text = `# PROPUESTA DE VALOR INSTITUCIONAL — ${client.name.toUpperCase()}

## Nuestra Razón de Ser
En ${client.name}, transformamos desafíos de la industria con un enfoque basado en procesos estandarizados, rigor técnico y cercanía estratégica.

## Por qué nos eligen nuestros clientes (Diferencial Comprobado):
1. **Calidad y Previsibilidad Operativa:** Operamos con instructivos de calidad auditados, reduciendo los tiempos de entrega y garantizando trazabilidad total.
2. **Dirección Profesionalizada:** Un equipo de liderazgo enfocado en soluciones de largo plazo y no en la improvisación cotidiana.
3. **Compromiso y Solvencia:** Respaldo financiero y solidez institucional para proyectos de alta envergadura.

---
*Documento generado automáticamente a partir del Diagnóstico Estratégico GS de ${client.name}.*`;
      } else if (selectedContentType === 'brochure') {
        text = `# BROCHURE CORPORATIVO DE PRESENTACIÓN — ${client.name.toUpperCase()}

### ¿Quiénes Somos?
Somos una empresa referente en el sector ${client.industry || 'PyME'}, comprometida con la excelencia operativa y el servicio de alto valor añadido.

### Nuestras Capacidades Clave:
- **Gestión Integral:** Procesos mapeados de punta a punta que aseguran cero retrabajo.
- **Equipo y Liderazgo:** Mandos medios capacitados y protocolos rigurosos de atención.
- **Innovación Continua:** Adopción de herramientas digitales y mejora constante bajo lineamientos ISO.

### Contáctenos:
- Sitio Web: www.${client.name.toLowerCase().replace(/\s+/g, '')}.com.ar
- Atención Corporativa directa con nuestro equipo directivo.`;
      } else {
        text = `# PITCH COMERCIAL / DISCURSO EJECUTIVO (3 MINUTOS) — ${client.name.toUpperCase()}

"Buenas tardes a todos. Mi nombre es [Tu Nombre], socio fundador de ${client.name}.

Hace unos años iniciamos con la convicción de que el sector ${client.industry || 'productivo'} necesitaba un proveedor que no solo entregue a tiempo, sino que brinde tranquilidad y orden estructural a sus clientes.

Hoy, gracias a un proceso continuo de profesionalización y estandarización, ${client.name} cuenta con procesos certificados, un equipo autónomo y la capacidad de responder a proyectos de máxima exigencia sin perder nuestra esencia de atención personalizada.

Los invitamos a construir juntos la próxima etapa de crecimiento de su empresa."`;
      }

      setGeneratedContent(text);
      setIsGenerating(false);
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Encabezado del Portal del Cliente */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-blue-200 block">
            Portal Oficial del Cliente • Acceso Seguro
          </span>
          <h1 className="text-2xl font-black mt-1">{client.name}</h1>
          <p className="text-xs text-blue-100 mt-0.5">
            Información estratégica unificada, minutas aprobadas y evolución del Pentágono del Orden.
          </p>
        </div>

        <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/15 backdrop-blur-xs flex items-center gap-3">
          <Award className="w-6 h-6 text-blue-300 shrink-0" />
          <div>
            <span className="text-[10px] text-blue-200 block uppercase font-bold">Madurez Empresarial</span>
            <span className="text-lg font-black text-white">{results.globalIme10} / 10 (IME {results.globalIme}%)</span>
          </div>
        </div>
      </div>

      {/* Navegación del Portal */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('pentagon')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'pentagon' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Pentágono de Madurez
        </button>

        <button
          onClick={() => setActiveTab('minutes')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'minutes' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Minutas Aprobadas
        </button>

        <button
          onClick={() => setActiveTab('diagnostic')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'diagnostic' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Estado del Diagnóstico
        </button>

        <button
          onClick={() => setActiveTab('master_plan')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'master_plan' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Master Plan (Gantt)
        </button>

        <button
          onClick={() => setActiveTab('self_assessment')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'self_assessment' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Espacio de Autoevaluación
        </button>

        <button
          onClick={() => setActiveTab('content_generator')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'content_generator' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-600 hover:bg-indigo-50 font-bold'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generador de Contenidos IA
        </button>
      </div>

      {/* PESTAÑA: PENTÁGONO DE MADUREZ */}
      {activeTab === 'pentagon' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-gray-900">Pentágono del Orden Actual (Escala 1 a 10)</h3>
            <p className="text-xs text-gray-500">
              Evaluación trimestral del grado de autonomía y profesionalización de {client.name}.
            </p>

            <div className="space-y-4 pt-2">
              {[
                { name: '1. Directorio y Gobernanza', score: results.pentagon.directorio, meta: 8.0 },
                { name: '2. Talento y Estructura', score: results.pentagon.talento, meta: 7.5 },
                { name: '3. Finanzas y Rentabilidad', score: results.pentagon.finanzas, meta: 8.0 },
                { name: '4. Procesos y Calidad', score: results.pentagon.procesos, meta: 7.5 },
                { name: '5. Comercial y Clientes', score: results.pentagon.comercial, meta: 8.0 }
              ].map(axis => (
                <div key={axis.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">{axis.name}</span>
                    <span className="font-mono text-gray-900">{axis.score} / 10 <span className="text-gray-400 font-normal">(Meta: {axis.meta})</span></span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(axis.score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-600">
              Objetivo de la tutoría: Consolidar una puntuación general superior a 7.5 para espaciar las sesiones y asegurar autonomía.
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Resumen de Madurez y Riesgo</h3>
              <p className="text-xs text-gray-500 mt-1">
                Dictamen actualizado por la consultora tras el control de calidad.
              </p>

              <div className="mt-4 space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-700 uppercase">Índice de Madurez (IME)</span>
                  <p className="text-sm font-bold text-blue-900 mt-0.5">{results.globalIme}% — {results.maturityStatus.label}</p>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-700 uppercase">Índice de Riesgo (IRE)</span>
                  <p className="text-sm font-bold text-rose-900 mt-0.5">{results.globalIre}% — Riesgo Controlado en mitigación</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Próxima remedición trimestral programada para fin del trimestre en curso.
            </p>
          </div>
        </div>
      )}

      {/* PESTAÑA: MINUTAS APROBADAS */}
      {activeTab === 'minutes' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Historial de Minutas Oficiales Aprobadas</h3>
              <p className="text-xs text-gray-500">
                Solo se exhiben las minutas revisadas y aprobadas en verde por la consultora.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 1,
                title: 'Sesión de Arranque: Eje de Procesos e ISO 9001',
                date: '02 Sep 2026',
                consultor: 'Martín Gómez',
                temas: 'Mapeo de la cadena de valor, unificación de Compras y Almacén, separación de compra y pago.'
              },
              {
                id: 2,
                title: 'Sesión de Kickoff: OMV y Visión a 3 Años',
                date: '26 Ago 2026',
                consultor: 'Abel / Lucas',
                temas: 'Definición del OMV en presente, metas numéricas a 3 años y protocolo de socios preliminar.'
              }
            ].map(m => (
              <div key={m.id} className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                      Aprobada
                    </span>
                    <h4 className="text-xs font-bold text-gray-900">{m.title}</h4>
                  </div>
                  <p className="text-xs text-gray-500">{m.temas}</p>
                  <span className="text-[11px] text-gray-400">
                    Fecha: {m.date} • Líder de sesión: {m.consultor}
                  </span>
                </div>

                <button
                  onClick={() => alert(`Descargando minuta oficial en PDF: ${m.title}`)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: ESTADO DEL DIAGNÓSTICO */}
      {activeTab === 'diagnostic' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-gray-900">Estado de Avance del Diagnóstico 360°</h3>
          <p className="text-xs text-gray-500">
            Relevamiento continuo a lo largo de las primeras 8 a 10 sesiones de trabajo.
          </p>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-700 block">Preguntas Completadas</span>
              <span className="text-sm font-black text-blue-700">
                {results.totalAnswered} de {results.totalQuestions} ({results.progressPercentage}%)
              </span>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800">
              {isDiagnosticApproved ? 'Aprobado y Publicado' : 'En Revisión'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {results.areaScores.map(a => (
              <div key={a.areaId} className="p-3 bg-white border border-gray-200 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 font-bold block truncate">{a.areaName}</span>
                <span className="text-base font-black text-gray-900 mt-1 block">{a.imeScore}%</span>
                <span className="text-[10px] text-gray-400">{a.answeredCount}/{a.totalQuestions} resp.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: MASTER PLAN GANTT */}
      {activeTab === 'master_plan' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Master Plan Estratégico</h3>
              <p className="text-xs text-gray-500">
                Iniciativas y compromisos organizados bajo el Pentágono del Orden.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { axis: 'Finanzas', code: 'FIN-01', title: 'Implementar Flujo de Caja Proyectado a 6 Meses', resp: 'Administración', status: 'En Proceso', date: 'Oct 2026' },
              { axis: 'Procesos', code: 'PRC-02', title: 'Unificación de Compras y Almacén con Checklists', resp: 'Operaciones', status: 'En Proceso', date: 'Nov 2026' },
              { axis: 'Directorio', code: 'DIR-01', title: 'Redacción y Firma del Protocolo de Socios', resp: 'Directorio', status: 'Pendiente', date: 'Dic 2026' },
              { axis: 'Talento', code: 'TAL-03', title: 'Manual de Funciones de Mandos Medios', resp: 'RRHH', status: 'Pendiente', date: 'Ene 2027' }
            ].map(task => (
              <div key={task.code} className="p-3.5 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {task.code}
                  </span>
                  <div>
                    <h4 className="font-bold text-gray-900">{task.title}</h4>
                    <span className="text-[11px] text-gray-400">Eje: {task.axis} • Responsable: {task.resp}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono">{task.date}</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded">
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: ESPACIO DE AUTOEVALUACIÓN */}
      {activeTab === 'self_assessment' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 max-w-3xl mx-auto">
          <div>
            <h3 className="text-base font-bold text-gray-900">Autoevaluación Mensual del Empresario</h3>
            <p className="text-xs text-gray-500">
              Espacio exclusivo para que el cliente evalúe su propia percepción del orden antes de la reunión de gabinete.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              '¿Siente que esta semana dedicó tiempo a pensar en la estrategia y no solo a apagar incendios?',
              '¿Se cumplieron los acuerdos asumidos en la última minuta de seguimiento?',
              '¿El flujo de caja de este mes le brinda tranquilidad para las obligaciones inmediatas?',
              '¿Pudo delegar tareas operativas en su equipo sin necesidad de intervenir?'
            ].map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <label className="text-xs font-semibold text-gray-900 block">{idx + 1}. {q}</label>
                <div className="flex gap-2">
                  {['Totalmente', 'Parcialmente', 'Aún no'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-600 rounded-lg text-xs text-gray-700 font-medium"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => alert('¡Autoevaluación enviada a su consultor GS!')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Enviar Respuestas al Consultor GS
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA: GENERADOR DE CONTENIDOS IA */}
      {activeTab === 'content_generator' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Generador de Contenidos Institucionales con IA
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Aproveche los datos estratégicos unificados de su diagnóstico para crear material comercial, discursos y propuestas de valor en segundos.
            </p>
          </div>

          {/* Selector de Tipo de Contenido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'propuesta_valor', label: 'Propuesta de Valor', desc: 'Diferencial para presentar a clientes corporativos' },
              { id: 'brochure', label: 'Brochure Institucional', desc: 'Presentación formal de servicios y capacidades' },
              { id: 'pitch', label: 'Discurso Comercial (Pitch)', desc: 'Guion verbal de 3 minutos para reuniones de venta' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedContentType(item.id as any)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedContentType === item.id
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-100'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <h4 className="text-xs font-bold">{item.label}</h4>
                <p className="text-[11px] text-gray-500 mt-1">{item.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-start">
            <button
              onClick={handleGenerateContent}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Analizando diagnóstico y redactando...' : 'Generar Contenido con IA'}
            </button>
          </div>

          {/* Área de Visualización y Copia de Contenido */}
          {generatedContent && (
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Contenido Generado Listo para Usar
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar Texto'}
                  </button>
                </div>
              </div>

              <div className="whitespace-pre-line text-xs text-gray-800 leading-relaxed font-mono bg-white p-4 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
                {generatedContent}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
