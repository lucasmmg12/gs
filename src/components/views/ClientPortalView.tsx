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
      <div className="bg-gradient-to-r from-black via-zinc-950 to-red-950 text-white p-7 rounded-2xl shadow-obsidian border-2 border-red-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-display text-[10px] uppercase tracking-widest text-red-400 block font-bold">
            Portal Oficial del Cliente • Acceso Seguro
          </span>
          <h1 className="font-display text-3xl font-black mt-1 uppercase tracking-wide">{client.name}</h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Información estratégica unificada, minutas aprobadas y evolución del Pentágono del Orden.
          </p>
        </div>

        <div className="bg-black/60 px-5 py-3 rounded-xl border border-red-900/50 backdrop-blur-xs flex items-center gap-3">
          <Award className="w-7 h-7 text-red-500 shrink-0" />
          <div>
            <span className="font-display text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Madurez Empresarial</span>
            <span className="font-display text-xl font-black text-white">{results.globalIme10} / 10 <span className="text-xs text-red-400 font-bold">(IME {results.globalIme}%)</span></span>
          </div>
        </div>
      </div>

      {/* Navegación del Portal */}
      <div className="flex items-center gap-2 border-b-2 border-zinc-200 pb-2 overflow-x-auto text-xs font-bold font-display uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('pentagon')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'pentagon' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Pentágono de Madurez
        </button>

        <button
          onClick={() => setActiveTab('minutes')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'minutes' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Minutas Aprobadas
        </button>

        <button
          onClick={() => setActiveTab('diagnostic')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'diagnostic' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Estado del Diagnóstico
        </button>

        <button
          onClick={() => setActiveTab('master_plan')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'master_plan' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Master Plan (Gantt)
        </button>

        <button
          onClick={() => setActiveTab('self_assessment')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'self_assessment' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Espacio de Autoevaluación
        </button>

        <button
          onClick={() => setActiveTab('content_generator')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'content_generator' ? 'bg-red-600 text-white shadow-crimson' : 'text-red-600 hover:bg-red-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generador de Contenidos IA
        </button>
      </div>

      {/* PESTAÑA: PENTÁGONO DE MADUREZ */}
      {activeTab === 'pentagon' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
            <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
              Pentágono del Orden Actual (Escala 1 a 10)
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
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
                  <div className="flex justify-between text-xs font-bold">
                    <span className="font-display text-zinc-800 uppercase tracking-wide">{axis.name}</span>
                    <span className="font-display text-zinc-950 text-sm">
                      {axis.score} / 10 <span className="text-zinc-400 font-normal font-sans text-xs">(Meta: {axis.meta})</span>
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(220,38,38,0.4)]"
                      style={{ width: `${(axis.score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs text-zinc-700 font-medium">
              Objetivo de la tutoría: Consolidar una puntuación general superior a 7.5 para espaciar las sesiones y asegurar autonomía.
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Resumen de Madurez y Riesgo
              </h3>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                Dictamen oficial actualizado por la consultora tras el control de calidad.
              </p>

              <div className="mt-4 space-y-3">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-white">
                  <span className="font-display text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Índice de Madurez (IME)</span>
                  <p className="font-display text-lg font-bold text-white mt-0.5">{results.globalIme}% — {results.maturityStatus.label}</p>
                </div>

                <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-white">
                  <span className="font-display text-[10px] font-bold text-red-400 uppercase tracking-wider">Índice de Riesgo (IRE)</span>
                  <p className="font-display text-lg font-bold text-red-400 mt-0.5">{results.globalIre}% — Riesgo Controlado en Mitigación</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 font-medium">
              Próxima remedición trimestral programada para fin del trimestre en curso.
            </p>
          </div>
        </div>
      )}

      {/* PESTAÑA: MINUTAS APROBADAS */}
      {activeTab === 'minutes' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Historial de Minutas Oficiales Aprobadas
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
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
              <div key={m.id} className="p-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-black text-emerald-400 text-[10px] font-bold font-display uppercase tracking-wider rounded">
                      Aprobada
                    </span>
                    <h4 className="text-sm font-bold text-zinc-950 font-display uppercase tracking-wide">{m.title}</h4>
                  </div>
                  <p className="text-xs text-zinc-600 font-medium">{m.temas}</p>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Fecha: {m.date} • Líder de sesión: {m.consultor}
                  </span>
                </div>

                <button
                  onClick={() => alert(`Descargando minuta oficial en PDF: ${m.title}`)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shrink-0 border border-zinc-300"
                >
                  <Download className="w-3.5 h-3.5 text-red-600" />
                  Descargar PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: ESTADO DEL DIAGNÓSTICO */}
      {activeTab === 'diagnostic' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
            Estado de Avance del Diagnóstico 360°
          </h3>
          <p className="text-xs text-zinc-500 font-medium">
            Relevamiento continuo a lo largo de las primeras 8 a 10 sesiones de trabajo.
          </p>

          <div className="p-5 bg-zinc-950 text-white rounded-xl border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-display text-xs font-bold text-zinc-400 uppercase tracking-wider block">Preguntas Completadas</span>
              <span className="font-display text-xl font-black text-white mt-0.5 block">
                {results.totalAnswered} de {results.totalQuestions} ({results.progressPercentage}%)
              </span>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-bold font-display uppercase tracking-wider bg-red-600 text-white">
              {isDiagnosticApproved ? 'Aprobado y Publicado' : 'En Revisión'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {results.areaScores.map(a => (
              <div key={a.areaId} className="p-4 bg-white border-2 border-zinc-200 rounded-xl text-center">
                <span className="font-display text-[10px] text-zinc-500 font-bold uppercase tracking-wider block truncate">{a.areaName}</span>
                <span className="font-display text-xl font-black text-zinc-950 mt-1 block">{a.imeScore}%</span>
                <span className="text-[10px] text-zinc-400 font-mono font-bold">{a.answeredCount}/{a.totalQuestions} resp.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: MASTER PLAN GANTT */}
      {activeTab === 'master_plan' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Master Plan Estratégico
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Iniciativas y compromisos organizados bajo el Pentágono del Orden.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { axis: 'Finanzas', code: 'FIN-01', title: 'Implementar Flujo de Caja Proyectado a 6 Meses', resp: 'Administración', status: 'En Proceso', date: 'Oct 2026' },
              { axis: 'Procesos', code: 'PRC-02', title: 'Unificación de Compras y Almacén con Checklists', resp: 'Operaciones', status: 'En Proceso', date: 'Nov 2026' },
              { axis: 'Directorio', code: 'DIR-01', title: 'Redacción y Firma del Protocolo de Socios', resp: 'Directorio', status: 'Pendiente', date: 'Dic 2026' },
              { axis: 'Talento', code: 'TAL-03', title: 'Manual de Funciones de Mandos Medios', resp: 'RRHH', status: 'Pendiente', date: 'Ene 2027' }
            ].map(task => (
              <div key={task.code} className="p-4 rounded-xl border-2 border-zinc-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded">
                    {task.code}
                  </span>
                  <div>
                    <h4 className="font-bold text-zinc-950 text-xs font-display uppercase tracking-wide">{task.title}</h4>
                    <span className="text-[11px] text-zinc-400 font-medium">Eje: {task.axis} • Responsable: {task.resp}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-600 font-mono font-bold">{task.date}</span>
                  <span className="px-2.5 py-0.5 bg-black text-white font-bold font-display uppercase text-[10px] rounded">
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
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4 max-w-3xl mx-auto">
          <div>
            <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
              Autoevaluación Mensual del Empresario
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
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
              <div key={idx} className="p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 space-y-2">
                <label className="text-xs font-bold text-zinc-950 block">{idx + 1}. {q}</label>
                <div className="flex gap-2">
                  {['Totalmente', 'Parcialmente', 'Aún no'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className="px-4 py-1.5 bg-white border-2 border-zinc-300 hover:border-black rounded-lg text-xs text-zinc-800 font-display font-bold uppercase tracking-wide"
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
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-crimson transition-colors"
            >
              Enviar Respuestas al Consultor GS
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA: GENERADOR DE CONTENIDOS IA */}
      {activeTab === 'content_generator' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-6">
          <div className="border-b-2 border-zinc-100 pb-3">
            <h3 className="font-display text-xl font-bold text-zinc-950 flex items-center gap-2 uppercase tracking-wide">
              <Sparkles className="w-5 h-5 text-red-600" />
              Generador de Contenidos Institucionales con IA
            </h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
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
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedContentType === item.id
                    ? 'bg-black text-white border-black ring-2 ring-red-600'
                    : 'bg-white border-zinc-200 hover:border-zinc-900 text-zinc-800'
                }`}
              >
                <h4 className="font-display text-sm font-bold uppercase tracking-wide">{item.label}</h4>
                <p className={`text-[11px] mt-1 font-medium ${
                  selectedContentType === item.id ? 'text-zinc-300' : 'text-zinc-500'
                }`}>{item.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-start">
            <button
              onClick={handleGenerateContent}
              disabled={isGenerating}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-crimson transition-all disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Analizando diagnóstico y redactando...' : 'Generar Contenido con IA'}
            </button>
          </div>

          {/* Área de Visualización y Copia de Contenido */}
          {generatedContent && (
            <div className="p-6 rounded-2xl bg-zinc-950 text-white border-2 border-zinc-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="font-display text-xs font-bold text-red-400 uppercase tracking-widest">
                  Contenido Generado Listo para Usar
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar Texto'}
                  </button>
                </div>
              </div>

              <div className="whitespace-pre-line text-xs text-zinc-200 leading-relaxed font-mono bg-black/60 p-5 rounded-xl border border-zinc-800 max-h-96 overflow-y-auto">
                {generatedContent}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
