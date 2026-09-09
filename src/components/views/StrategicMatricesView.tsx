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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToQuestions}
            className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-700 transition-colors border border-zinc-200"
            title="Volver a las preguntas"
          >
            <ArrowLeft className="w-5 h-5 text-red-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black font-display text-zinc-950 uppercase tracking-wide">
                Matrices Estratégicas y Diagnóstico 360
              </h2>
              <span className="px-3 py-1 text-xs font-bold font-display uppercase tracking-wider rounded-md bg-black text-white border border-zinc-700">
                {results.maturityStatus.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Empresa: <strong className="text-zinc-900 font-bold uppercase">{client.name}</strong> • Cálculos matemáticos en tiempo real bajo metodología GS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white border-2 border-zinc-900 hover:bg-zinc-100 text-zinc-900 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-red-600" />
            Imprimir Informe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('full_report')}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-crimson transition-all hover:scale-105"
          >
            <FileText className="w-4 h-4" />
            Ver Informe Completo
          </button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b-2 border-zinc-200 pb-2 overflow-x-auto text-xs font-bold font-display uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-black text-white shadow-md border border-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          1. Cuadro IME, IRE y Pentágono
        </button>

        <button
          onClick={() => setActiveTab('foda_tows')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'foda_tows'
              ? 'bg-black text-white shadow-md border border-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          2. Matriz FODA y TOWS
        </button>

        <button
          onClick={() => setActiveTab('pestel_porter')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'pestel_porter'
              ? 'bg-black text-white shadow-md border border-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          3. PESTEL y 5 Fuerzas de Porter
        </button>

        <button
          onClick={() => setActiveTab('risks')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'risks'
              ? 'bg-black text-white shadow-md border border-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          4. Matriz de Riesgo ({results.risks.length})
        </button>

        <button
          onClick={() => setActiveTab('full_report')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'full_report'
              ? 'bg-red-600 text-white shadow-crimson border border-red-600'
              : 'text-red-700 hover:bg-red-50'
          }`}
        >
          5. Informe Completo
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* PESTAÑA 1: OVERVIEW IME, IRE Y PENTÁGONO */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Tarjetas Superiores de Indicadores Principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-widest block">IME Global</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-4xl font-black text-zinc-950">{results.globalIme}%</span>
                <span className="font-display text-sm font-bold text-red-600">({results.globalIme10} / 10)</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                Índice de Madurez Empresarial (Meta: 7.5 - 8.0)
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-red-600 uppercase tracking-widest block">IRE Global</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-4xl font-black text-red-600">{results.globalIre}%</span>
                <span className="font-display text-xs font-bold text-zinc-400 uppercase">Riesgo</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                Índice de Riesgo Empresario (Inverso)
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-widest block">Riesgos Críticos</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-4xl font-black text-zinc-950">
                  {results.risks.filter(r => r.severityLevel === 'Extremo' || r.severityLevel === 'Alto').length}
                </span>
                <span className="text-xs font-medium text-zinc-500">de {results.risks.length} detectados</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                Exigen mitigación en el Master Plan
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-widest block">Preguntas Evaluadas</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-4xl font-black text-zinc-950">{results.totalAnswered}</span>
                <span className="font-display text-xs font-bold text-zinc-500">/ {results.totalQuestions}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                Avance total acumulado: {results.progressPercentage}%
              </p>
            </div>
          </div>

          {/* Grilla: Pentágono del Orden y Cuadro Eje por Eje */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pentágono del Orden (Escala 1 a 10) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-3">
                <h3 className="font-display text-base font-bold text-zinc-950 uppercase tracking-wide flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-600" />
                  Pentágono del Orden (1 a 10)
                </h3>
                <span className="font-display text-[10px] font-bold bg-black text-red-400 px-2.5 py-0.5 rounded uppercase tracking-wider">
                  Trimestral
                </span>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Mapeo de madurez en los 5 ejes estratégicos de la tutoría. Al alcanzar un puntaje de 7.5 a 8.0, la empresa alcanza la autonomía operativa.
              </p>

              <div className="space-y-3.5 pt-2">
                {[
                  { label: 'Directorio y Gobernanza', score: results.pentagon.directorio },
                  { label: 'Talento y Estructura', score: results.pentagon.talento },
                  { label: 'Finanzas y Rentabilidad', score: results.pentagon.finanzas },
                  { label: 'Procesos y Calidad', score: results.pentagon.procesos },
                  { label: 'Comercial y Clientes', score: results.pentagon.comercial }
                ].map(axis => (
                  <div key={axis.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-zinc-800 font-display uppercase tracking-wide">{axis.label}</span>
                      <span className="font-display text-zinc-950 text-sm">{axis.score} / 10</span>
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

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-200 mt-4">
                <strong className="font-display text-sm font-bold text-red-400 uppercase tracking-wider block">
                  Promedio Actual: {results.pentagon.promedioGeneral} / 10
                </strong>
                <p className="text-[11px] text-zinc-400 mt-1 font-medium">
                  La remedición formal del Pentágono se realiza cada 3 meses para monitorear el impacto de la tutoría.
                </p>
              </div>
            </div>

            {/* Cuadro de Indicadores IME / IRE por las 10 Áreas */}
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-3">
                <h3 className="font-display text-base font-bold text-zinc-950 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  Cuadro de Madurez y Riesgo por Área (10 Ejes)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-900 text-white font-display uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-3">Eje Temático</th>
                      <th className="py-3 px-3">Pentágono</th>
                      <th className="py-3 px-3 text-center">Respondidas</th>
                      <th className="py-3 px-3 text-center">IME (0-100%)</th>
                      <th className="py-3 px-3 text-center">Escala (1-10)</th>
                      <th className="py-3 px-3 text-center">IRE (Riesgo)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {results.areaScores.map(area => (
                      <tr key={area.areaId} className="hover:bg-zinc-50">
                        <td className="py-3 px-3 font-bold text-zinc-900">
                          {area.areaNumber}. {area.areaName}
                        </td>
                        <td className="py-3 px-3 text-zinc-600 font-medium">
                          <span className="px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-bold font-display uppercase">
                            {area.pentagonAxis}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-zinc-700">
                          {area.answeredCount} / {area.totalQuestions}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold font-display text-zinc-900 bg-zinc-100 px-2.5 py-0.5 rounded border border-zinc-200">
                            {area.imeScore}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold font-display text-zinc-900">
                          {area.imeScale10}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold font-display px-2.5 py-0.5 rounded ${
                            area.ireScore >= 60 
                              ? 'text-red-700 bg-red-50 border border-red-200' 
                              : area.ireScore >= 40 
                                ? 'text-amber-700 bg-amber-50 border border-amber-200' 
                                : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
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
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Matriz FODA Automática
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Construida automáticamente a partir de las respuestas cerradas en el diagnóstico.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fortalezas */}
              <div className="bg-white border-2 border-zinc-900 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h4 className="font-display text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Fortalezas ({results.foda.fortalezas.length})
                  </h4>
                  <span className="text-[10px] bg-zinc-100 text-zinc-700 font-bold px-2 py-0.5 rounded uppercase">Interno</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-800">
                  {results.foda.fortalezas.length === 0 ? (
                    <li className="text-zinc-400 italic">No se han registrado fortalezas aún.</li>
                  ) : (
                    results.foda.fortalezas.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 font-medium">
                        <span className="font-bold text-red-600">•</span>
                        <span>{f.text} <strong className="text-[10px] text-zinc-500">({f.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Oportunidades */}
              <div className="bg-white border-2 border-zinc-900 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h4 className="font-display text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    Oportunidades ({results.foda.oportunidades.length})
                  </h4>
                  <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded uppercase">Externo</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-800">
                  {results.foda.oportunidades.length === 0 ? (
                    <li className="text-zinc-400 italic">No se han detectado oportunidades externas.</li>
                  ) : (
                    results.foda.oportunidades.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 font-medium">
                        <span className="font-bold text-red-600">•</span>
                        <span>{o.text} <strong className="text-[10px] text-zinc-500">({o.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Debilidades */}
              <div className="bg-white border-2 border-zinc-900 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h4 className="font-display text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    Debilidades ({results.foda.debilidades.length})
                  </h4>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">Interno</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-800">
                  {results.foda.debilidades.length === 0 ? (
                    <li className="text-zinc-400 italic">No se han registrado debilidades internas.</li>
                  ) : (
                    results.foda.debilidades.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 font-medium">
                        <span className="font-bold text-amber-600">•</span>
                        <span>{d.text} <strong className="text-[10px] text-zinc-500">({d.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Amenazas */}
              <div className="bg-white border-2 border-red-900 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-red-100 pb-2">
                  <h4 className="font-display text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Amenazas ({results.foda.amenazas.length})
                  </h4>
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded uppercase">Riesgo</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-800">
                  {results.foda.amenazas.length === 0 ? (
                    <li className="text-zinc-400 italic">No se han registrado amenazas de entorno.</li>
                  ) : (
                    results.foda.amenazas.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 font-medium">
                        <span className="font-bold text-red-600">•</span>
                        <span>{a.text} <strong className="text-[10px] text-red-700">({a.questionCode})</strong></span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Matriz TOWS (Cruces Estratégicos) */}
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Matriz TOWS (Cruce de Estrategias)
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Líneas de acción cruzando fortalezas y debilidades contra oportunidades y amenazas del entorno.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.tows.map((t, idx) => (
                <div key={idx} className="p-5 rounded-xl border-2 border-zinc-200 bg-zinc-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-black text-white text-[10px] font-bold font-display uppercase tracking-wider rounded">
                      Estrategia {t.type}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-zinc-950 uppercase">{t.title}</h4>
                  <p className="text-xs text-zinc-600 font-medium">{t.description}</p>
                  <div className="pt-2 border-t border-zinc-200">
                    <span className="font-display text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Factores de Apoyo FODA:
                    </span>
                    <ul className="space-y-0.5 text-[11px] text-zinc-600 font-medium">
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
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Análisis PESTEL
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
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
                  <div key={cat.key} className="p-5 rounded-xl border-2 border-zinc-200 bg-white space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <span className="font-display text-xs font-bold text-zinc-950 uppercase tracking-wider">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono font-bold">({items.length})</span>
                    </div>

                    {items.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">Sin impactos específicos detectados.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-zinc-700 font-medium">
                        {items.map((it, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-red-600 font-bold">•</span>
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
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Las 5 Fuerzas de Porter
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Evaluación del nivel de competencia y presión estructural de la industria.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.porter.map((p, idx) => (
                <div key={idx} className="p-5 rounded-xl border-2 border-zinc-200 bg-zinc-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold font-display uppercase tracking-wider px-2.5 py-0.5 rounded ${
                      p.intensity === 'Alta' 
                        ? 'bg-red-600 text-white' 
                        : p.intensity === 'Media' 
                          ? 'bg-zinc-800 text-white' 
                          : 'bg-zinc-200 text-zinc-800'
                    }`}>
                      Presión {p.intensity}
                    </span>
                  </div>
                  <h4 className="font-display text-xs font-bold text-zinc-950 uppercase">{p.name}</h4>
                  <p className="text-xs text-zinc-600 font-medium">{p.description}</p>
                  <div className="pt-2 border-t border-zinc-200">
                    {p.factors.map((f, fidx) => (
                      <p key={fidx} className="text-[11px] text-zinc-500 italic">• {f}</p>
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
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Matriz de Riesgo Organizacional (IRE)
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Clasificación de amenazas detectadas durante el diagnóstico y medidas mitigadoras.
              </p>
            </div>
            <div className="text-right">
              <span className="font-display text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">IRE Global</span>
              <span className="font-display text-2xl font-black text-red-600">{results.globalIre}%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900 text-white font-display uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Descripción del Riesgo</th>
                  <th className="py-3 px-3 text-center">Probabilidad</th>
                  <th className="py-3 px-3 text-center">Impacto</th>
                  <th className="py-3 px-3 text-center">Severidad</th>
                  <th className="py-3 px-3">Acción Sugerida Master Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {results.risks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-zinc-400 italic">
                      No se han detectado riesgos mayores con las respuestas actuales.
                    </td>
                  </tr>
                ) : (
                  results.risks.map(r => (
                    <tr key={r.id} className="hover:bg-zinc-50">
                      <td className="py-3 px-3 font-mono font-bold text-red-600">{r.code}</td>
                      <td className="py-3 px-3 font-bold text-zinc-900">{r.category}</td>
                      <td className="py-3 px-3 text-zinc-700 max-w-xs font-medium">{r.description}</td>
                      <td className="py-3 px-3 text-center font-semibold text-zinc-800">{r.probability}</td>
                      <td className="py-3 px-3 text-center font-semibold text-zinc-800">{r.impact}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded font-display text-[10px] font-bold uppercase tracking-wider ${
                          r.severityLevel === 'Extremo' 
                            ? 'bg-red-600 text-white' 
                            : r.severityLevel === 'Alto' 
                              ? 'bg-zinc-900 text-red-400 border border-red-700' 
                              : 'bg-zinc-100 text-zinc-800'
                        }`}>
                          {r.severityLevel} ({r.severityScore})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-600 italic text-[11px] font-medium">
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
        <div className="bg-white p-8 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-8 max-w-5xl mx-auto font-sans">
          {/* Encabezado Formal del Informe */}
          <div className="border-b-4 border-zinc-950 pb-6 flex items-start justify-between">
            <div>
              <span className="font-display text-xs font-bold text-red-600 uppercase tracking-widest block">
                Estudio GS Consultora — Metodología de Tutoría
              </span>
              <h1 className="font-display text-3xl font-black text-zinc-950 mt-1 uppercase tracking-wide">
                Informe Oficial de Diagnóstico Integral 360°
              </h1>
              <p className="text-xs text-zinc-500 mt-1 font-medium">
                Empresa: <strong className="text-zinc-950 font-bold uppercase">{client.name}</strong> • Industria: {client.industry} • Fecha: {new Date().toLocaleDateString('es-AR')}
              </p>
            </div>
            <div className="text-right">
              <span className="font-display text-xs font-bold text-zinc-400 block uppercase tracking-wider">Dictamen Oficial</span>
              <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold font-display uppercase tracking-wider mt-1 bg-black text-white border border-zinc-700">
                {results.maturityStatus.label}
              </span>
            </div>
          </div>

          {/* Resumen Ejecutivo */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wider border-b-2 border-zinc-200 pb-1">
              1. Resumen Ejecutivo
            </h2>
            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
              El presente informe sintetiza el estado real de profesionalización y ordenamiento de <strong>{client.name}</strong> tras el ciclo de evaluación diagnóstica. Se relevaron las 10 áreas funcionales bajo la metodología del Pentágono del Orden.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-950 text-white p-5 rounded-xl border border-zinc-800 text-center">
              <div>
                <span className="font-display text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Madurez (IME)</span>
                <span className="font-display text-2xl font-black text-white">{results.globalIme}%</span>
              </div>
              <div>
                <span className="font-display text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Escala Pentágono</span>
                <span className="font-display text-2xl font-black text-white">{results.globalIme10} / 10</span>
              </div>
              <div>
                <span className="font-display text-[10px] text-red-400 uppercase font-bold tracking-wider block">Riesgo (IRE)</span>
                <span className="font-display text-2xl font-black text-red-500">{results.globalIre}%</span>
              </div>
              <div>
                <span className="font-display text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Riesgos Críticos</span>
                <span className="font-display text-2xl font-black text-white">
                  {results.risks.filter(r => r.severityLevel === 'Extremo' || r.severityLevel === 'Alto').length}
                </span>
              </div>
            </div>
          </section>

          {/* Análisis de los 5 Ejes del Pentágono */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wider border-b-2 border-zinc-200 pb-1">
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
                <div key={ax.name} className="p-4 rounded-xl border-2 border-zinc-200 bg-white space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-display font-bold text-zinc-950 uppercase text-xs">{ax.name}</span>
                    <span className="font-display text-xs font-bold text-red-600">{ax.score} / 10</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-medium">{ax.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recomendaciones Clave para el Master Plan */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wider border-b-2 border-zinc-200 pb-1">
              3. Próximos Pasos: Paso al Master Plan Estratégico
            </h2>
            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
              Las brechas detectadas habilitan de forma directa el inicio de la siguiente etapa del ciclo de tutoría: la construcción del <strong>Master Plan Estratégico</strong> sobre los 5 ejes, asignando iniciativas, responsables y plazos con seguimiento trimestral.
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
