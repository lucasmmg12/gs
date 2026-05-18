import React from 'react';
import { File, FileText, Image as ImageIcon, Download, UploadCloud, Folder, MoreVertical, Search, Filter } from 'lucide-react';
import type { Client } from '../../data/mockData';

interface DocumentosClienteProps {
  client: Client;
}

const mockDocuments = [
  { id: 1, name: 'Estructura_Costos_Q3.xlsx', type: 'excel', size: '1.2 MB', date: '12 May, 2026', uploader: 'Consultor Principal' },
  { id: 2, name: 'Reporte_Diagnostico_Inicial.pdf', type: 'pdf', size: '4.5 MB', date: '05 May, 2026', uploader: 'Sistema' },
  { id: 3, name: 'Contrato_Prestacion_Servicios.pdf', type: 'pdf', size: '890 KB', date: '01 May, 2026', uploader: 'Legal' },
  { id: 4, name: 'Organigrama_Actualizado.png', type: 'image', size: '2.1 MB', date: '28 Abr, 2026', uploader: 'Consultor Principal' },
  { id: 5, name: 'Minuta_Reunion_Kickoff.docx', type: 'word', size: '450 KB', date: '25 Abr, 2026', uploader: 'IA Assistant' },
];

const getIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
    case 'excel': return <File className="w-5 h-5 text-green-500" />;
    case 'word': return <FileText className="w-5 h-5 text-blue-500" />;
    case 'image': return <ImageIcon className="w-5 h-5 text-purple-500" />;
    default: return <File className="w-5 h-5 text-gray-500" />;
  }
};

export const DocumentosCliente: React.FC<DocumentosClienteProps> = ({ client }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Folder className="w-6 h-6 text-red-600" />
            Gestor Documental
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Repositorio centralizado de archivos para {client.name}.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-red-600/20">
          <UploadCloud className="w-5 h-5" /> Subir Documento
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar documentos..." 
              className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider pl-4">Nombre del Archivo</th>
                <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Subido Por</th>
                <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Tamaño</th>
                <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        {getIcon(doc.type)}
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-gray-500 font-medium">{doc.date}</td>
                  <td className="py-4 text-sm text-gray-500">{doc.uploader}</td>
                  <td className="py-4 text-sm text-gray-500">{doc.size}</td>
                  <td className="py-4 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
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
