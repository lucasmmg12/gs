import React, { useState } from 'react';
import { 
  ArrowLeft, Printer, ShieldAlert, CheckCircle2, 
  TrendingUp, AlertOctagon, FileText, 
  Activity, Award
} from 'lucide-react';
import type { FullDiagnosticResults } from '../../lib/diagnosticEngine';
import type { Client } from '../../data/mockData';

interface StrategicMatricesViewProps {
  client: Client;
  results: FullDiagnosticResults;
  onBackToQuestions: () => void;
}

type ActiveTab = 'overview' | 'foda_tows' | 'pestel_porter' | 'risks' | 'full_report';

export const StrategicMatricesView: React.FC<StrategicMatricesViewProps> = ({
  client,
  results,
  onBackToQuestions
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Barra de Título y Botones Superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToQuestions}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            title="Volver a las preguntas"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Matrices Estratégicas y Diagnóstico 360</h2>
              <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${results.maturityStatus.color}`}>
                {results.maturityStatus.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Empresa: <strong className="text-gray-800">{client.name}</strong> • Cálculos automáticos matemáticos en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            Imprimir Informe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('full_report')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            Ver Informe Completo
          </button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          1. Cuadro IME, IRE y Pentágono
        </button>

        <button
          onClick={() => setActiveTab('foda_tows')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'foda_tows'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          2. Matriz FODA y TOWS
        </button>

        <button
          onClick={() => setActiveTab('pestel_porter')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'pestel_porter'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          3. PESTEL y 5 Fuerzas de Porter
        </button>

        <button
          onClick={() => setActiveTab('risks')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'risks'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          4. Matriz de Riesgo Empresario ({results.risks.length})
        </button>

        <button
          onClick={() => setActiveTab('full_report')}
          className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'full_report'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          5. Informe de Diagnóstico Completo
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* PESTAÑA 1: OVERVIEW IME, IRE Y PENTÁGONO */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Tarjetas Superiores de Indicadores Principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">IME Global</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-blue-900">{results.globalIme}%</span>
                <span className="text-sm font-bold text-blue-600">({results.globalIme10} / 10)</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Índice de Madurez Empresarial (Meta: 7.5 - 8.0)
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">IRE Global</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-rose-600">{results.globalIre}%</span>
                <span className="text-xs font-bold text-rose-500">Riesgo</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Índice de Riesgo Empresario (Inverso)
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Riesgos Críticos</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-amber-600">
                  {results.risks.filter(r => r.severityLevel === 'Extremo' || r.severityLevel === 'Alto').length}
                </span>
                <span className="text-xs font-medium text-gray-500">de {results.risks.length} detectados</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Exigen acciones inmediatas en el Master Plan
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Preguntas Evaluadas</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-gray-900">{results.totalAnswered}</span>
                <span className="text-xs font-bold text-gray-500">de {results.totalQuestions}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Progreso total acumulado: {results.progressPercentage}%
              </p>
            </div>
          </div>

          {/* Grilla: Pentágono del Orden y Cuadro Eje por Eje */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pentágono del Orden (Escala 1 a 10) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-600" />
                  Pentágono del Orden (1 a 10)
                </h3>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  Trimestral
                </span>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Mapeo de madurez en los 5 ejes estratégicos de la tutoría. Al alcanzar un puntaje de 7.5 a 8.0, la empresa alcanza la autonomía operativa.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { label: 'Directorio y Gobernanza', score: results.pentagon.directorio, color: 'bg-indigo-500' },
                  { label: 'Talento y Estructura', score: results.pentagon.talento, color: 'bg-blue-500' },
                  { label: 'Finanzas y Rentabilidad', score: results.pentagon.finanzas, color: 'bg-emerald-500' },
                  { label: 'Procesos y Calidad', score: results.pentagon.procesos, color: 'bg-amber-500' },
                  { label: 'Comercial y Clientes', score: results.pentagon.comercial, color: 'bg-rose-500' }
                ].map(axis => (
                  <div key={axis.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-700">{axis.label}</span>
                      <span className="font-mono text-gray-900">{axis.score} / 10</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`${axis.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${(axis.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 mt-4">
                <strong>Promedio Actual: {results.pentagon.promedioGeneral} / 10</strong>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  La remedición formal del Pentágono se realiza cada 3 meses para monitorear el impacto de la tutoría.
                </p>
              </div>
            </div>

            {/* Cuadro de Indicadores IME / IRE por las 10 Áreas */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Cuadro de Madurez y Riesgo por Área (10 Ejes)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Eje Temático</th>
                      <th className="py-2.5 px-3">Eje Pentágono</th>
                      <th className="py-2.5 px-3 text-center">Respondidas</th>
                      <th className="py-2.5 px-3 text-center">IME (0-100%)</th>
                      <th className="py-2.5 px-3 text-center">Escala (1-10)</th>
                      <th className="py-2.5 px-3 text-center">IRE (Riesgo)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.areaScores.map(area => (
                      <tr key={area.areaId} className="hover:bg-gray-50/80">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          {area.areaNumber}. {area.areaName}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-medium">
                            {area.pentagonAxis}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-gray-600">
                          {area.answeredCount} / {area.totalQuestions}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {area.imeScore}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                          {area.imeScale10}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            area.ireScore >= 60 
                              ? 'text-rose-700 bg-rose-50' 
                              : area.ireScore >= 40 
                                ? 'text-amber-700 bg-amber-50' 
                                : 'text-emerald-700 bg-emerald-50'
                          }`}>
                            {area.ireScore}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: FODA Y MATRIZ TOWS */}
      {activeTab === 'foda_tows' && (
        <div className="space-y-6">
          {/* Matriz FODA */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Matriz FODA Automática</h3>
              <p className="text-xs text-gray-500">
                Construida automáticamente a partir de las respuestas cerradas en el diagnóstico.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fortalezas */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Fortalezas ({results.foda.fortalezas.length})
                  </h4>
                  <span className="text-[10px] text-emerald-700 font-medium">Interno Favorable</span>
                </div>
                <ul className="space-y-1.5 text-xs text-emerald-950">
                  {results.foda.fortalezas.length === 0 ? (
                    <li className="text-gray-400 italic">No se han registrado fortalezas aún.</li>
                  ) : (
                    results.foda.fortalezas.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold text-emerald-700">•</span>
                        <span>{f.text} <strong className="text-[10px] text-emerald-700">({f.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Oportunidades */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Oportunidades ({results.foda.oportunidades.length})
                  </h4>
                  <span className="text-[10px] text-blue-700 font-medium">Externo Favorable</span>
                </div>
                <ul className="space-y-1.5 text-xs text-blue-950">
                  {results.foda.oportunidades.length === 0 ? (
                    <li className="text-gray-400 italic">No se han detectado oportunidades externas.</li>
                  ) : (
                    results.foda.oportunidades.map((o, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold text-blue-700">•</span>
                        <span>{o.text} <strong className="text-[10px] text-blue-700">({o.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Debilidades */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    Debilidades ({results.foda.debilidades.length})
                  </h4>
                  <span className="text-[10px] text-amber-700 font-medium">Interno Desfavorable</span>
                </div>
                <ul className="space-y-1.5 text-xs text-amber-950">
                  {results.foda.debilidades.length === 0 ? (
                    <li className="text-gray-400 italic">No se han registrado debilidades internas.</li>
                  ) : (
                    results.foda.debilidades.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold text-amber-700">•</span>
                        <span>{d.text} <strong className="text-[10px] text-amber-700">({d.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Amenazas */}
              <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Amenazas ({results.foda.amenazas.length})
                  </h4>
                  <span className="text-[10px] text-rose-700 font-medium">Externo Desfavorable</span>
                </div>
                <ul className="space-y-1.5 text-xs text-rose-950">
                  {results.foda.amenazas.length === 0 ? (
                    <li className="text-gray-400 italic">No se han registrado amenazas de entorno.</li>
                  ) : (
                    results.foda.amenazas.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold text-rose-700">•</span>
                        <span>{a.text} <strong className="text-[10px] text-rose-700">({a.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Matriz TOWS (Cruces Estratégicos) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Matriz TOWS (Cruce de Estrategias)</h3>
              <p className="text-xs text-gray-500">
                Líneas de acción cruzando fortalezas y debilidades contra oportunidades y amenazas del entorno.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.tows.map((t, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                      Estrategia {t.type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">{t.title}</h4>
                  <p className="text-xs text-gray-600">{t.description}</p>
                  <div className="pt-2 border-t border-gray-200/80">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Factores de Apoyo FODA:
                    </span>
                    <ul className="space-y-0.5 text-[11px] text-gray-500">
                      {t.sourceFODA.map((sf, sidx) => (
                        <li key={sidx} className="truncate">• {sf}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: PESTEL Y PORTER */}
      {activeTab === 'pestel_porter' && (
        <div className="space-y-6">
          {/* PESTEL */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Análisis PESTEL</h3>
              <p className="text-xs text-gray-500">
                Factores del macroentorno (Político, Económico, Social, Tecnológico, Ecológico, Legal).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'politico', name: 'Político' },
                { key: 'economico', name: 'Económico' },
                { key: 'social', name: 'Social' },
                { key: 'tecnologico', name: 'Tecnológico' },
                { key: 'ecologico', name: 'Ecológico' },
                { key: 'legal', name: 'Legal y Normativo' }
              ].map(cat => {
                const items = results.pestel[cat.key] || [];
                return (
                  <div key={cat.key} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">({items.length})</span>
                    </div>

                    {items.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Sin impactos específicos detectados.</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-gray-700">
                        {items.map((it, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{it.impactText}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5 Fuerzas de Porter */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Las 5 Fuerzas de Porter</h3>
              <p className="text-xs text-gray-500">
                Evaluación del nivel de competencia y presión estructural de la industria.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.porter.map((p, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.intensity === 'Alta' 
                        ? 'bg-rose-100 text-rose-800' 
                        : p.intensity === 'Media' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Presión {p.intensity}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">{p.name}</h4>
                  <p className="text-xs text-gray-600">{p.description}</p>
                  <div className="pt-2 border-t border-gray-200">
                    {p.factors.map((f, fidx) => (
                      <p key={fidx} className="text-[11px] text-gray-500 italic">• {f}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: MATRIZ DE RIESGO */}
      {activeTab === 'risks' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Matriz de Riesgo Organizacional (IRE)</h3>
              <p className="text-xs text-gray-500">
                Clasificación de amenazas detectadas durante el diagnóstico y medidas mitigadoras.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block font-bold uppercase">IRE Global</span>
              <span className="text-xl font-black text-rose-600">{results.globalIre}%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Descripción del Riesgo</th>
                  <th className="py-2.5 px-3 text-center">Probabilidad</th>
                  <th className="py-2.5 px-3 text-center">Impacto</th>
                  <th className="py-2.5 px-3 text-center">Severidad</th>
                  <th className="py-2.5 px-3">Acción Sugerida Master Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.risks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-400 italic">
                      No se han detectado riesgos mayores con las respuestas actuales.
                    </td>
                  </tr>
                ) : (
                  results.risks.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-700">{r.code}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{r.category}</td>
                      <td className="py-2.5 px-3 text-gray-700 max-w-xs">{r.description}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{r.probability}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{r.impact}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.severityLevel === 'Extremo' 
                            ? 'bg-red-100 text-red-800' 
                            : r.severityLevel === 'Alto' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.severityLevel} ({r.severityScore})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 italic text-[11px]">
                        {r.suggestedAction}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: INFORME DE DIAGNÓSTICO COMPLETO */}
      {activeTab === 'full_report' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8 max-w-5xl mx-auto font-sans">
          {/* Encabezado Formal del Informe */}
          <div className="border-b-2 border-gray-900 pb-6 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block">
                Consultora GS — Tutoría Estratégica
              </span>
              <h1 className="text-2xl font-black text-gray-900 mt-1">
                Informe Oficial de Diagnóstico Integral 360°
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Empresa: <strong className="text-gray-900">{client.name}</strong> • Industria: {client.industry} • Fecha: {new Date().toLocaleDateString('es-AR')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-400 block uppercase">Dictamen General</span>
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold mt-1 border ${results.maturityStatus.color}`}>
                {results.maturityStatus.label}
              </span>
            </div>
          </div>

          {/* Resumen Ejecutivo */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-1">
              1. Resumen Ejecutivo
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed">
              El presente informe sintetiza el estado real de profesionalización y ordenamiento de <strong>{client.name}</strong> tras el ciclo de evaluación diagnóstica. Se relevaron las 10 áreas funcionales bajo la metodología del Pentágono del Orden.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Madurez (IME)</span>
                <span className="text-xl font-black text-blue-700">{results.globalIme}%</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Escala Pentágono</span>
                <span className="text-xl font-black text-gray-900">{results.globalIme10} / 10</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Riesgo (IRE)</span>
                <span className="text-xl font-black text-rose-600">{results.globalIre}%</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Riesgos Críticos</span>
                <span className="text-xl font-black text-amber-600">
                  {results.risks.filter(r => r.severityLevel === 'Extremo' || r.severityLevel === 'Alto').length}
                </span>
              </div>
            </div>
          </section>

          {/* Análisis de los 5 Ejes del Pentágono */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-1">
              2. Diagnóstico por Ejes del Pentágono del Orden
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: 'Directorio y Gobernanza', score: results.pentagon.directorio, desc: 'Toma de decisiones, protocolo de socios y rol del dueño.' },
                { name: 'Talento y Estructura', score: results.pentagon.talento, desc: 'Organigrama funcional, mandos medios y descripciones de puesto.' },
                { name: 'Finanzas y Rentabilidad', score: results.pentagon.finanzas, desc: 'Flujo de caja, costos fijos y punto de equilibrio.' },
                { name: 'Procesos y Calidad ISO', score: results.pentagon.procesos, desc: 'Estandarización, manuales, checklists y abastecimiento.' },
                { name: 'Comercial y Clientes', score: results.pentagon.comercial, desc: 'Funnel comercial, propuesta de valor y concentración de cartera.' }
              ].map(ax => (
                <div key={ax.name} className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-xs">{ax.name}</span>
                    <span className="font-mono text-xs font-bold text-blue-700">{ax.score} / 10</span>
                  </div>
                  <p className="text-[11px] text-gray-500">{ax.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recomendaciones Clave para el Master Plan */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-1">
              3. Próximos Pasos: Paso al Master Plan Estratégico
            </h2>
            <p className="text-xs text-gray-700 leading-relaxed">
              Las brechas detectadas habilitan de forma directa el inicio de la siguiente etapa del ciclo de tutoría: la construcción del <strong>Master Plan Estratégico</strong> sobre los 5 ejes, asignando iniciativas, responsables y plazos con seguimiento trimestral.
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
