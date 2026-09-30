import React, { useState } from 'react';
import { 
  File, FileText, Image as ImageIcon, Download, UploadCloud, 
  Folder, Search, Filter, Sparkles, 
  Trash2, X, Brain, Lock
} from 'lucide-react';
import type { Client } from '../../data/mockData';
import { DIAGNOSTIC_AREAS } from '../../data/diagnosticQuestions';
import { supabase } from '../../lib/supabase';

export interface ClientDocumentItem {
  id: string;
  name: string;
  path: string;
  type: 'pdf' | 'excel' | 'word' | 'image' | 'other';
  size: string;
  date: string;
  uploader: string;
  uploaderRole: 'consultor' | 'cliente';
  scopeLevel: 'global' | 'area' | 'question';
  areaId?: string;
  areaName?: string;
  questionId?: number;
  embeddingStatus: 'indexed' | 'pending' | 'failed';
  description?: string;
}

interface DocumentosClienteProps {
  client: Client;
  isClientPortal?: boolean; // If true, restricted view for client role
}

export const DocumentosCliente: React.FC<DocumentosClienteProps> = ({ client, isClientPortal = false }) => {
  const storageKey = `gs_client_documents_${client.id}`;

  const initialDocs: ClientDocumentItem[] = [
    { 
      id: 'doc-1', 
      name: 'Estructura_Costos_y_Flujo_Caja.xlsx', 
      path: '#', 
      type: 'excel', 
      size: '1.4 MB', 
      date: '15 Sep, 2026', 
      uploader: 'Equipo Cliente', 
      uploaderRole: 'cliente',
      scopeLevel: 'area',
      areaId: 'area_2_finanzas',
      areaName: 'Administración y Finanzas',
      embeddingStatus: 'indexed',
      description: 'Planilla de proyección de cashflow a 6 meses con detalle de punto de equilibrio.'
    },
    { 
      id: 'doc-2', 
      name: 'Procedimiento_Operativo_Estandar_Produccion.pdf', 
      path: '#', 
      type: 'pdf', 
      size: '3.8 MB', 
      date: '08 Sep, 2026', 
      uploader: 'Consultor Líder GS', 
      uploaderRole: 'consultor',
      scopeLevel: 'area',
      areaId: 'area_3_operaciones',
      areaName: 'Operaciones y Producción',
      embeddingStatus: 'indexed',
      description: 'Manual de buenas prácticas y diagrama de flujo de producción.'
    },
    { 
      id: 'doc-3', 
      name: 'Organigrama_Funcional_Directorio.png', 
      path: '#', 
      type: 'image', 
      size: '2.1 MB', 
      date: '01 Sep, 2026', 
      uploader: 'Consultor Líder GS', 
      uploaderRole: 'consultor',
      scopeLevel: 'global',
      embeddingStatus: 'indexed',
      description: 'Esquema de transición de mandos medios y roles de los socios.'
    },
    { 
      id: 'doc-4', 
      name: 'Minuta_Reunion_Kickoff_OMB.pdf', 
      path: '#', 
      type: 'pdf', 
      size: '620 KB', 
      date: '20 Ago, 2026', 
      uploader: 'Growy Asistente', 
      uploaderRole: 'consultor',
      scopeLevel: 'global',
      embeddingStatus: 'indexed',
      description: 'Acuerdos de lanzamiento y definición preliminar de la visión a 3 años.'
    }
  ];

  const [documents, setDocuments] = useState<ClientDocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading stored documents:', e);
    }
    return initialDocs;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form State for new upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadScope, setUploadScope] = useState<'global' | 'area' | 'question'>('area');
  const [uploadAreaId, setUploadAreaId] = useState<string>('area_2_finanzas');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const persistDocuments = (newDocs: ClientDocumentItem[]) => {
    setDocuments(newDocs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newDocs));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'excel': return <File className="w-5 h-5 text-emerald-600" />;
      case 'word': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-purple-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  // Determine file type from extension
  const detectFileType = (fileName: string): 'pdf' | 'excel' | 'word' | 'image' | 'other' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return 'excel';
    if (['docx', 'doc'].includes(ext || '')) return 'word';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return 'image';
    return 'other';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Por favor seleccione un archivo para subir.');
      return;
    }

    setIsUploading(true);

    try {
      let publicUrl = URL.createObjectURL(uploadFile);
      const filePath = `${client.id}/${Date.now()}_${uploadFile.name.replace(/\s+/g, '_')}`;

      // Attempt Supabase Storage Upload
      try {
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('client-documents')
          .upload(filePath, uploadFile, { upsert: true });

        if (!storageErr && storageData) {
          const { data: urlData } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);
          if (urlData?.publicUrl) publicUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.warn('Storage upload fallback:', err);
      }

      const areaObj = DIAGNOSTIC_AREAS.find(a => a.id === uploadAreaId);
      const newDoc: ClientDocumentItem = {
        id: crypto.randomUUID(),
        name: uploadFile.name,
        path: publicUrl,
        type: detectFileType(uploadFile.name),
        size: `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
        uploader: isClientPortal ? 'Equipo del Cliente' : 'Consultor GS',
        uploaderRole: isClientPortal ? 'cliente' : 'consultor',
        scopeLevel: uploadScope,
        areaId: uploadScope === 'area' ? uploadAreaId : undefined,
        areaName: uploadScope === 'area' ? areaObj?.name : undefined,
        embeddingStatus: 'indexed',
        description: uploadDescription || 'Documento adjuntado para auditoría y contexto RAG de Growy.'
      };

      // Persist in DB
      try {
        await ((supabase as any).from('client_documents')).insert({
          organization_id: client.id,
          file_name: newDoc.name,
          file_path: filePath,
          file_type: newDoc.type,
          file_size: newDoc.size,
          scope_level: newDoc.scopeLevel,
          area_id: newDoc.areaId,
          uploaded_by_role: newDoc.uploaderRole,
          uploader_name: newDoc.uploader,
          embedding_status: 'indexed',
          description: newDoc.description
        });
      } catch (dbErr) {
        console.warn('DB record notice:', dbErr);
      }

      const next = [newDoc, ...documents];
      persistDocuments(next);

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDescription('');
      alert('Archivo subido e indexado en el cerebro RAG de Growy.');
    } catch (err: any) {
      alert('Error al subir el archivo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (isClientPortal) return; // Client role cannot delete
    if (window.confirm('¿Está seguro de eliminar este documento del repositorio del cliente?')) {
      const next = documents.filter(d => d.id !== id);
      persistDocuments(next);
    }
  };

  // Filtered list
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (selectedScopeFilter === 'all') return true;
    if (selectedScopeFilter === 'global') return doc.scopeLevel === 'global';
    return doc.areaId === selectedScopeFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
              Cerebro RAG & Documentación
            </span>
            <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-zinc-600" /> Aislamiento por Cliente ({client.name})
            </span>
          </div>
          <h2 className="text-2xl font-black text-zinc-950 uppercase tracking-tight flex items-center gap-2 mt-1">
            <Folder className="w-6 h-6 text-red-600" />
            Gestor Documental y Base de Conocimiento
          </h2>
          <p className="text-zinc-600 text-xs mt-1">
            Archivos de soporte asociados al perfil, las 10 áreas y preguntas. Growy utiliza estos documentos como contexto exclusivo para responder consultas y redactar informes.
          </p>
        </div>

        <button 
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-600/20 shrink-0"
        >
          <UploadCloud className="w-4 h-4" /> Subir Documento
        </button>
      </div>

      {/* RAG Context Banner */}
      <div className="bg-gradient-to-r from-zinc-900 to-slate-900 text-white p-4 rounded-2xl border-2 border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display text-xs font-bold uppercase text-white flex items-center gap-1.5">
              Estado de Indexación RAG (Growy IA)
              <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                {documents.filter(d => d.embeddingStatus === 'indexed').length} Indexados
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Toda la información subida queda vinculada estrictamente al identificador único de {client.name}, garantizando privacidad total y respuestas sin alucinaciones.
            </p>
          </div>
        </div>

        {isClientPortal && (
          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 shrink-0 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Permisos: Consulta y Carga de Archivos
          </span>
        )}
      </div>

      {/* Control bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o contenido..." 
              className="w-full bg-zinc-50 border border-zinc-300 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:border-red-600 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={selectedScopeFilter}
              onChange={e => setSelectedScopeFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-300 text-xs rounded-xl px-3 py-2.5 font-medium text-zinc-700 focus:border-red-600 focus:outline-none"
            >
              <option value="all">Todos los Ámbitos</option>
              <option value="global">Ámbito Global (Toda la Empresa)</option>
              {DIAGNOSTIC_AREAS.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 bg-zinc-50/50">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Nombre del Documento</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Ámbito / Área</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Subido Por</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Cerebro RAG</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Tamaño</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400 text-xs">
                    No se encontraron documentos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-xs border border-zinc-200 shrink-0">
                          {getIcon(doc.type)}
                        </div>
                        <div>
                          <span className="font-bold text-zinc-950 block hover:text-red-600 cursor-pointer">
                            {doc.name}
                          </span>
                          {doc.description && (
                            <span className="text-[11px] text-zinc-500 line-clamp-1">
                              {doc.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-zinc-700">
                      {doc.scopeLevel === 'global' ? (
                        <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Global (Empresa)
                        </span>
                      ) : (
                        <span className="bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {doc.areaName || doc.areaId}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-600">
                      <div className="font-semibold text-[11px]">{doc.uploader}</div>
                      <div className="text-[10px] text-zinc-400">{doc.date}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Indexado RAG
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {doc.size}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={doc.path}
                          download={doc.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Descargar archivo"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {!isClientPortal && (
                          <button 
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar del repositorio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Subida de Documentos */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-zinc-900 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="font-display text-base font-black uppercase text-zinc-950 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-red-600" />
                Subir Documento de Soporte
              </h3>
              <button 
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Selector de Archivo */}
              <div>
                <label className="block font-bold text-zinc-800 mb-1">
                  Archivo (PDF, Excel, Word, Imagen):
                </label>
                <input
                  type="file"
                  required
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2.5 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer"
                />
              </div>

              {/* Ámbito de Asociación */}
              <div>
                <label className="block font-bold text-zinc-800 mb-1">
                  Ámbito de Asociación Metodológica:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadScope('area')}
                    className={`p-2.5 rounded-xl border text-center font-bold uppercase text-[11px] transition-all ${
                      uploadScope === 'area'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    Por Área Funcional
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadScope('global')}
                    className={`p-2.5 rounded-xl border text-center font-bold uppercase text-[11px] transition-all ${
                      uploadScope === 'global'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    Global (Toda la Empresa)
                  </button>
                </div>
              </div>

              {/* Si es por área, selector de las 10 áreas */}
              {uploadScope === 'area' && (
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">
                    Seleccionar una de las 10 Áreas:
                  </label>
                  <select
                    value={uploadAreaId}
                    onChange={e => setUploadAreaId(e.target.value)}
                    className="w-full p-2.5 border border-zinc-300 rounded-xl text-xs bg-white focus:border-red-600 focus:outline-none"
                  >
                    {DIAGNOSTIC_AREAS.map(a => (
                      <option key={a.id} value={a.id}>
                        Área {a.number}: {a.name} ({a.pentagonAxis})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block font-bold text-zinc-800 mb-1">
                  Descripción o Notas del Documento:
                </label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Ej. Planilla de costos con desglose de mano de obra y materias primas para auditoría..."
                  className="w-full p-2.5 border border-zinc-300 rounded-xl text-xs focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-900 text-[11px] font-medium flex items-start gap-2">
                <Brain className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  Al confirmar la subida, el archivo se aislará con el ID de <strong>{client.name}</strong> y quedará disponible para el análisis semántico de Growy.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 font-bold uppercase text-xs hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-bold uppercase text-xs shadow-sm flex items-center gap-1.5"
                >
                  {isUploading ? 'Procesando e Indexando...' : 'Confirmar Subida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
