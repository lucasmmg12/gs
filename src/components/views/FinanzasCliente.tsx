import React from 'react';
import { 
  Line, BarChart, Bar, PieChart, Pie, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import type { Client } from '../../data/mockData';

interface FinanzasClienteProps {
  client: Client;
}

// Mock Data local
const cashFlowData = [
  { month: 'Ene', ingresos: 120000, egresos: 90000, proyectado: 125000 },
  { month: 'Feb', ingresos: 135000, egresos: 95000, proyectado: 130000 },
  { month: 'Mar', ingresos: 125000, egresos: 85000, proyectado: 135000 },
  { month: 'Abr', ingresos: 145000, egresos: 100000, proyectado: 140000 },
  { month: 'May', ingresos: 160000, egresos: 110000, proyectado: 150000 },
  { month: 'Jun', ingresos: 180000, egresos: 115000, proyectado: 165000 },
  { month: 'Jul', ingresos: 175000, egresos: 120000, proyectado: 180000 },
];

const costDistribution = [
  { name: 'Nómina', value: 45 },
  { name: 'Operación', value: 25 },
  { name: 'Marketing', value: 15 },
  { name: 'Tecnología', value: 10 },
  { name: 'Otros', value: 5 },
];
const COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fee2e2'];

const profitabilityData = [
  { unit: 'B2B Services', rentabilidad: 35, volumen: 120000 },
  { unit: 'Consulting', rentabilidad: 55, volumen: 80000 },
  { unit: 'SaaS Prod', rentabilidad: 75, volumen: 45000 },
  { unit: 'Training', rentabilidad: 25, volumen: 30000 },
];

const scatterData = [
  { x: 100, y: 200, z: 200, name: 'Q1' },
  { x: 120, y: 100, z: 260, name: 'Q2' },
  { x: 170, y: 300, z: 400, name: 'Q3' },
  { x: 140, y: 250, z: 280, name: 'Q4' },
];

const KPI = ({ title, value, subtext, trend, icon: Icon }: any) => (
  <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-lg transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-red-50 rounded-xl">
        <Icon className="w-6 h-6 text-red-600" />
      </div>
      <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(trend)}%
      </div>
    </div>
    <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
    <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
    <p className="text-xs text-gray-400 mt-2 font-medium">{subtext}</p>
  </div>
);

export const FinanzasCliente: React.FC<FinanzasClienteProps> = ({ client }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-red-600" /> 
          Gabinete Financiero - {client.name}
        </h2>
        <p className="text-gray-500 mt-1">Análisis de rentabilidad, flujo de caja y distribución de costos operativos.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI title="MRR (Ingreso Recurrente)" value="$180,500" subtext="vs $160,000 mes anterior" trend={12.8} icon={TrendingUp} />
        <KPI title="Margen Operativo (EBITDA)" value="32.4%" subtext="Meta anual: 35.0%" trend={-2.1} icon={Activity} />
        <KPI title="Deuda vs Capital (D/E)" value="1.2x" subtext="Nivel de riesgo moderado" trend={-0.5} icon={CreditCard} />
        <KPI title="Liquidez Corriente" value="2.8" subtext="Capacidad de pago a corto plazo" trend={5.4} icon={Wallet} />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Flujo de Caja (Area + Line) */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Flujo de Caja Consolidado</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorEgresos)" />
                <Line type="monotone" dataKey="proyectado" name="Meta Proyectada" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Costos (Pie) */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Distribución de Costos</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {costDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Porcentaje']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {costDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Rentabilidad por Línea de Negocio (Bar) */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Rentabilidad por Unidad de Negocio (%)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitabilityData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis dataKey="unit" type="category" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Margen']}
                />
                <Bar dataKey="rentabilidad" fill="#dc2626" radius={[0, 4, 4, 0]}>
                  {profitabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rentabilidad > 50 ? '#10b981' : entry.rentabilidad > 30 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Riesgo vs Retorno (Scatter) */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Eficiencia de Capital (Riesgo vs Retorno)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="x" name="Riesgo" unit="pts" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis type="number" dataKey="y" name="Retorno" unit="k" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <Tooltip 
                  cursor={{strokeDasharray: '3 3'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Scatter name="Proyectos" data={scatterData} fill="#dc2626" shape="circle">
                  {scatterData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2 font-medium">Cuadrante Superior Derecho: Alta eficiencia de capital (Zonas de Praxis).</p>
        </div>

      </div>
    </div>
  );
};
