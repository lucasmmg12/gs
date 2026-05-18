import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Briefcase, TrendingUp, Activity, Target, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Client } from '../../data/mockData';

interface MetricasPerformanceProps {
  clients: Client[];
}

// Mock Data for Global Performance
const globalRevenue = [
  { month: 'Ene', value: 850 },
  { month: 'Feb', value: 920 },
  { month: 'Mar', value: 1100 },
  { month: 'Abr', value: 1250 },
  { month: 'May', value: 1400 },
  { month: 'Jun', value: 1650 },
];

const clientDistribution = [
  { name: 'Minería', value: 3 },
  { name: 'Software', value: 2 },
  { name: 'Logística', value: 1 },
  { name: 'Salud', value: 1 },
];

const COLORS = ['#dc2626', '#ef4444', '#fca5a5', '#fee2e2'];

const adherenceData = [
  { name: 'Minera Sur', adherence: 45 },
  { name: 'TechFlow', adherence: 82 },
  { name: 'AgroNova', adherence: 65 },
  { name: 'LogisX', adherence: 55 },
  { name: 'BioSalud', adherence: 90 },
];

export const MetricasPerformance: React.FC<MetricasPerformanceProps> = ({ clients }) => {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Activity className="w-8 h-8 text-red-600" />
          Performance Global de GS Consultora
        </h2>
        <p className="text-gray-500 mt-1">
          Visión agregada del impacto y facturación en toda la cartera de clientes.
        </p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-all group relative">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-xl"><Briefcase className="w-6 h-6 text-red-600" /></div>
            <span className="flex items-center gap-1 text-sm font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
              <ArrowUpRight className="w-4 h-4" /> 2 Nuevos
            </span>
          </div>
          <h4 className="text-gray-500 text-sm font-medium mb-1">Clientes Activos</h4>
          <p className="text-3xl font-extrabold text-gray-900">{clients.length}</p>
          <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
            Total de empresas que actualmente reciben servicios de consultoría bajo contrato activo.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-all group relative">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-xl"><Target className="w-6 h-6 text-red-600" /></div>
            <span className="flex items-center gap-1 text-sm font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
              <ArrowUpRight className="w-4 h-4" /> +8.4%
            </span>
          </div>
          <h4 className="text-gray-500 text-sm font-medium mb-1">Adherencia Promedio</h4>
          <p className="text-3xl font-extrabold text-gray-900">
            {Math.round(clients.reduce((acc, curr) => acc + curr.metrics.realityAdherence, 0) / clients.length)}%
          </p>
          <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
            Promedio global del índice de cumplimiento de las intervenciones de praxis (Pentágono del Orden) en toda la cartera.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-all group relative">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-xl"><TrendingUp className="w-6 h-6 text-red-600" /></div>
            <span className="flex items-center gap-1 text-sm font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
              <ArrowUpRight className="w-4 h-4" /> +15.2%
            </span>
          </div>
          <h4 className="text-gray-500 text-sm font-medium mb-1">Facturación MRR Estimada</h4>
          <p className="text-3xl font-extrabold text-gray-900">$165k</p>
          <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
            Ingreso Recurrente Mensual (Monthly Recurring Revenue) generado por los fees y retainers de los clientes activos.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-all group relative">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-xl"><ShieldCheck className="w-6 h-6 text-red-600" /></div>
            <span className="flex items-center gap-1 text-sm font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">
              <ArrowDownRight className="w-4 h-4" /> -2 pts
            </span>
          </div>
          <h4 className="text-gray-500 text-sm font-medium mb-1">Churn Rate Anual</h4>
          <p className="text-3xl font-extrabold text-gray-900">1.2%</p>
          <p className="text-xs text-gray-400 mt-2 font-medium leading-snug">
            Porcentaje de clientes que cancelaron sus servicios en los últimos 12 meses. Un valor bajo indica alta retención.
          </p>
        </div>
      </div>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MRR Growth (Area Chart) */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Crecimiento de Facturación (MRR)</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} tickFormatter={(val) => `$${val}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`$${value}k`, 'Facturación']}
                />
                <Area type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Distribution (Pie Chart) */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 flex flex-col items-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2 self-start">Distribución de Cartera</h3>
          <p className="text-sm text-gray-500 self-start mb-6">Clientes por sector industrial.</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {clientDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value} Clientes`, 'Cantidad']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full mt-4 space-y-2">
            {clientDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Ranking Adherencia */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Ranking de Adherencia a la Realidad por Cliente</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={adherenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} domain={[0, 100]} />
              <Tooltip 
                cursor={{fill: '#f3f4f6'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`${value}%`, 'Adherencia']}
              />
              <Bar dataKey="adherence" radius={[6, 6, 0, 0]}>
                {adherenceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.adherence > 75 ? '#10b981' : entry.adherence > 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
