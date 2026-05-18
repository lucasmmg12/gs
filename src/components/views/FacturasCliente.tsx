import React from 'react';
import { FileDigit, Plus, Download, Filter, DollarSign, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import type { Client } from '../../data/mockData';

interface FacturasClienteProps {
  client: Client;
}

const mockInvoices = [
  { id: 'INV-2026-005', amount: 45000, date: '01 May, 2026', due: '15 May, 2026', status: 'Pagada', concept: 'Retainer Mensual - Mayo' },
  { id: 'INV-2026-004', amount: 45000, date: '01 Abr, 2026', due: '15 Abr, 2026', status: 'Pagada', concept: 'Retainer Mensual - Abril' },
  { id: 'INV-2026-003', amount: 12000, date: '15 Mar, 2026', due: '30 Mar, 2026', status: 'Pagada', concept: 'Auditoría Extraordinaria' },
  { id: 'INV-2026-002', amount: 45000, date: '01 Mar, 2026', due: '15 Mar, 2026', status: 'Pagada', concept: 'Retainer Mensual - Marzo' },
  { id: 'INV-2026-001', amount: 150000, date: '10 Feb, 2026', due: '25 Feb, 2026', status: 'Pagada', concept: 'Setup Inicial y Diagnóstico de la Realidad' },
];

export const FacturasCliente: React.FC<FacturasClienteProps> = ({ client }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileDigit className="w-6 h-6 text-red-600" />
            Estado de Cuenta y Facturación
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Historial de pagos y honorarios de la cuenta corriente de {client.name}.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md">
          <Plus className="w-5 h-5" /> Nueva Factura
        </button>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-5">
          <div className="flex justify-between items-start">
            <h4 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Facturado YTD</h4>
            <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="w-4 h-4 text-green-600" /></div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">$297,000</p>
          <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> +12% vs Q1</p>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-5">
          <div className="flex justify-between items-start">
            <h4 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Saldo Pendiente</h4>
            <div className="p-2 bg-orange-50 rounded-lg"><Clock className="w-4 h-4 text-orange-600" /></div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">$0</p>
          <p className="text-xs text-gray-400 font-bold mt-2">Cuenta al día</p>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-5">
          <div className="flex justify-between items-start">
            <h4 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Fee Mensual</h4>
            <div className="p-2 bg-blue-50 rounded-lg"><CheckCircle2 className="w-4 h-4 text-blue-600" /></div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">$45,000</p>
          <p className="text-xs text-gray-400 font-bold mt-2">Plan Corporativo</p>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Historial de Emisiones</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">
            <Filter className="w-3 h-3" /> Este Año
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tl-lg">N° Factura</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Concepto</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Emisión</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimiento</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Monto</th>
                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                <th className="py-3 px-4 rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 px-4 font-semibold text-gray-900 text-sm">{inv.id}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 font-medium">{inv.concept}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{inv.date}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{inv.due}</td>
                  <td className="py-4 px-4 text-sm font-bold text-gray-900 text-right">${inv.amount.toLocaleString()}</td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                      <CheckCircle2 className="w-3 h-3" /> {inv.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
