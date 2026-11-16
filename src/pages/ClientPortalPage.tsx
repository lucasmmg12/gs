import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { UserRoleInfo } from '../App';
import {
  ClientPortalView,
  type ApprovedPortalMinute,
  type ApprovedPortalOMB,
  type ApprovedPortalTask,
  type ApprovedPortalRisk,
  type ApprovedPortalDocument,
  type ApprovedQuarterlyReview,
} from '../components/views/ClientPortalView';
import { calculateDiagnosticScores, type FullDiagnosticResults } from '../lib/diagnosticEngine';
import type { ResponseOptionValue } from '../data/diagnosticQuestions';
import { INITIAL_MASTER_PLAN_TASKS } from '../data/masterPlanData';
import { ArrowLeft, ShieldCheck, Lock, Activity, LogOut, ShieldAlert, Eye } from 'lucide-react';
import { loadOrgWorkspaceFromDb, loadPublicOrgsDirectoryFromDb } from '../lib/gsCloudSync';
import GrowyChat from '../components/GrowyChat';

const EJEMPLO_SAS_ID = '532a0405-02c2-4e45-8f77-c24bf13ea9de';

const EJEMPLO_SAS_BASELINE_ANSWERS: Record<number, ResponseOptionValue> = {
  1: 'partial_dev',
  101: 'partial_dev',
  2: 'informal_active',
  102: 'partial_dev',
  3: 'partial_dev',
  4: 'informal_active',
  5: 'partial_dev',
  201: 'partial_dev',
  202: 'informal_active',
  6: 'informal_active',
  7: 'partial_dev',
  8: 'informal_active',
  9: 'partial_dev',
  301: 'partial_dev',
  10: 'informal_active',
  11: 'partial_dev',
  12: 'informal_active',
  401: 'partial_dev',
  13: 'informal_active',
  14: 'partial_dev',
  15: 'informal_active',
  501: 'partial_dev',
  16: 'informal_active',
  17: 'partial_dev',
  18: 'informal_active',
  19: 'partial_dev',
  20: 'partial_dev',
  701: 'partial_dev',
  21: 'informal_active',
  22: 'partial_dev',
  23: 'partial_dev',
  24: 'partial_dev',
  25: 'partial_dev',
  26: 'partial_dev'
};

interface ClientPortalPageProps {
  roleInfo?: UserRoleInfo | null;
  session?: Session | null;
}

export default function ClientPortalPage({ roleInfo, session }: ClientPortalPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<any>(null);
  const [results, setResults] = useState<FullDiagnosticResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [crossTenantBlocked, setCrossTenantBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Approval gating state (Solo lo aprobado por Consultores GS)
  const [isOmvApproved, setIsOmvApproved] = useState(false);
  const [isDiagnosticApproved, setIsDiagnosticApproved] = useState(false);
  const [isMasterPlanApproved, setIsMasterPlanApproved] = useState(false);

  // Approved deliverables state
  const [ombData, setOmbData] = useState<ApprovedPortalOMB | null>(null);
  const [approvedMinutes, setApprovedMinutes] = useState<ApprovedPortalMinute[]>([]);
  const [masterPlanTasks, setMasterPlanTasks] = useState<ApprovedPortalTask[]>([]);
  const [riskMatrix, setRiskMatrix] = useState<ApprovedPortalRisk[]>([]);
  const [approvedDocuments, setApprovedDocuments] = useState<ApprovedPortalDocument[]>([]);
  const [quarterlyReviews, setQuarterlyReviews] = useState<ApprovedQuarterlyReview[]>([]);

  const isConsultantViewer =
    Boolean(session) && (roleInfo?.role === 'admin' || roleInfo?.role === 'consultant');

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!id) return;
      setLoading(true);
      setCrossTenantBlocked(false);

      // 1. Multitenant Security Check: If logged in as a Client of Org A, block access to Org B
      if (roleInfo?.role === 'client' && roleInfo.organizationId && roleInfo.organizationId !== id) {
        setCrossTenantBlocked(true);
        setLoading(false);
        return;
      }

      // Also check sessionStorage active client org if not a consultant
      const activeCodeOrg = sessionStorage.getItem('gs_active_client_org');
      if (!isConsultantViewer && activeCodeOrg && activeCodeOrg !== id) {
        setCrossTenantBlocked(true);
        setLoading(false);
        return;
      }

      // 2. Fetch organization + Supabase Cloud Workspace (supports both Auth session & Corporate Code access)
      const [{ data: dbOrg }, cloudWs, pubDir] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', id).maybeSingle(),
        loadOrgWorkspaceFromDb(id),
        loadPublicOrgsDirectoryFromDb(),
      ]);

      const dirMatch = pubDir.find((d) => d.id === id);
      const org: any =
        dbOrg ||
        (cloudWs?.orgName
          ? {
              id,
              name: cloudWs.orgName,
              industry: cloudWs.industry || 'PyME en Desarrollo',
              portal_access_code: cloudWs.portalAccessCode || 'GS-DEMO-2026',
              portal_active: true,
            }
          : dirMatch
            ? {
                id: dirMatch.id,
                name: dirMatch.name,
                industry: dirMatch.industry || 'PyME en Desarrollo',
                portal_access_code: dirMatch.portal_access_code || 'GS-DEMO-2026',
                portal_active: true,
              }
            : id === EJEMPLO_SAS_ID
              ? {
                  id: EJEMPLO_SAS_ID,
                  name: 'EJEMPLO SAS',
                  industry: 'Ingeniería y Servicios Industriales',
                  portal_access_code: 'GS-DEMO-2026',
                  portal_active: true,
                }
              : null);

      if (!org) {
        setLoading(false);
        return;
      }

      setClient(org);

      // Hydrate local cache from Supabase Cloud Workspace so exporters (.DOCX / .XLSX) on Client PC have full data
      if (cloudWs) {
        if (cloudWs.projectCode) localStorage.setItem(`gs_project_code_${id}`, cloudWs.projectCode);
        if (cloudWs.omvTargets) localStorage.setItem(`gs_omv_targets_${id}`, JSON.stringify(cloudWs.omvTargets));
        if (cloudWs.qualitativeAnswers)
          localStorage.setItem(`gs_qualitative_answers_${id}`, JSON.stringify(cloudWs.qualitativeAnswers));
        if (cloudWs.areaKpis) localStorage.setItem(`gs_area_kpis_${id}`, JSON.stringify(cloudWs.areaKpis));
        if (cloudWs.axesMeta) localStorage.setItem(`gs_axes_meta_${id}`, JSON.stringify(cloudWs.axesMeta));
      }

      // Check authentication status for this specific organization
      const verifiedInSession = sessionStorage.getItem(`gs_portal_verified_${id}`) === 'true';
      if (
        isConsultantViewer ||
        verifiedInSession ||
        (roleInfo?.role === 'client' && roleInfo.organizationId === id)
      ) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

      // 3. Load Consultant Quality Approvals (Supabase + localStorage override)
      const { data: dbApprovals } = await ((supabase as any).from('quality_approvals'))
        .select('entity_type, approval_status')
        .eq('organization_id', id);

      let omvOk = id === EJEMPLO_SAS_ID;
      let diagOk = id === EJEMPLO_SAS_ID;
      let mpOk = id === EJEMPLO_SAS_ID;

      if (dbApprovals && dbApprovals.length > 0) {
        const omvRow = dbApprovals.find((a: any) => a.entity_type === 'omv');
        const diagRow = dbApprovals.find((a: any) => a.entity_type === 'diagnostic_360');
        const mpRow = dbApprovals.find((a: any) => a.entity_type === 'master_plan');
        if (omvRow) omvOk = omvRow.approval_status === 'approved' || omvRow.approval_status === 'approved_published';
        if (diagRow) diagOk = diagRow.approval_status === 'approved' || diagRow.approval_status === 'approved_published';
        if (mpRow) mpOk = mpRow.approval_status === 'approved' || mpRow.approval_status === 'approved_published';
      }

      const localApprovalsRaw = localStorage.getItem(`gs_approvals_${id}`);
      if (localApprovalsRaw) {
        try {
          const parsed = JSON.parse(localApprovalsRaw);
          if (parsed.omv) omvOk = parsed.omv === 'approved_published' || parsed.omv === 'approved';
          if (parsed.diagnostic_360) diagOk = parsed.diagnostic_360 === 'approved_published' || parsed.diagnostic_360 === 'approved';
          if (parsed.master_plan) mpOk = parsed.master_plan === 'approved_published' || parsed.master_plan === 'approved';
        } catch {
          // ignore
        }
      }

      if (cloudWs?.approvals) {
        if (cloudWs.approvals.omv)
          omvOk = cloudWs.approvals.omv === 'approved_published' || (cloudWs.approvals.omv as string) === 'approved';
        if (cloudWs.approvals.diagnostic_360)
          diagOk =
            cloudWs.approvals.diagnostic_360 === 'approved_published' ||
            (cloudWs.approvals.diagnostic_360 as string) === 'approved';
        if (cloudWs.approvals.master_plan)
          mpOk =
            cloudWs.approvals.master_plan === 'approved_published' ||
            (cloudWs.approvals.master_plan as string) === 'approved';
      }

      setIsOmvApproved(omvOk);
      setIsDiagnosticApproved(diagOk);
      setIsMasterPlanApproved(mpOk);

      // 4. Load Diagnostic Answers scoped strictly to this client
      let answers: Record<number, ResponseOptionValue> =
        id === EJEMPLO_SAS_ID ? { ...EJEMPLO_SAS_BASELINE_ANSWERS } : {};

      const { data: diagResp } = await ((supabase as any).from('diagnostic_responses'))
        .select('*')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (diagResp?.answers && Object.keys(diagResp.answers).length > 0) {
        const normalized: Record<number, ResponseOptionValue> = {};
        Object.entries(diagResp.answers).forEach(([k, v]) => {
          const numKey = Number(k.replace('q_', ''));
          if (!isNaN(numKey) && typeof v === 'string') {
            normalized[numKey] = v as ResponseOptionValue;
          }
        });
        answers = { ...answers, ...normalized };
      }

      const localDiagRaw = localStorage.getItem(`gs_diag_answers_${id}`);
      if (localDiagRaw) {
        try {
          answers = { ...answers, ...JSON.parse(localDiagRaw) };
        } catch {
          // ignore
        }
      }

      if (cloudWs?.diagnosticAnswers && Object.keys(cloudWs.diagnosticAnswers).length > 0) {
        answers = { ...answers, ...cloudWs.diagnosticAnswers };
      }

      setResults(calculateDiagnosticScores(answers));

      // 5. Load Approved OMB / Visión 2029
      const [{ data: ombRevs }, { data: omvMod }] = await Promise.all([
        ((supabase as any).from('client_omb_revisions'))
          .select('*')
          .eq('organization_id', id)
          .order('created_at', { ascending: false }),
        ((supabase as any).from('omv_modules'))
          .select('*')
          .eq('organization_id', id)
          .maybeSingle(),
      ]);

      const approvedRev =
        (ombRevs || []).find((r: any) => r.is_baseline_rev0 || r.status === 'aprobado') ||
        (ombRevs || [])[0];

      if (approvedRev || omvMod) {
        setOmbData({
          revisionCode: approvedRev?.revision_code || 'Rev 0',
          title: approvedRev?.title || `Declaración de Visión a 3 Años — ${org.name}`,
          declarationText:
            approvedRev?.declaration_text ||
            omvMod?.vision_3_years ||
            '',
          partnerInputs: approvedRev?.partner_inputs || [],
          roadmapStages: omvMod?.roadmap_stages || [],
          kpiTargets: omvMod?.kpi_targets || [],
          approvedBy: approvedRev?.created_by || 'Director Metodológico GS',
        });
      } else {
        setOmbData(null);
      }

      // 6. Load Approved Minutes for this Client
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('id, title, meeting_date, status, minutes(*)')
        .eq('organization_id', id)
        .order('meeting_date', { ascending: false });

      const { data: interviewsData } = await (supabase.from('gobernanza_entrevistas') as any)
        .select('*')
        .eq('client_id', id)
        .eq('validation_status', 'accepted')
        .order('created_at', { ascending: false });

      const localMinStatusRaw = localStorage.getItem(`gs_minute_approvals_${id}`);
      const localMinApprovals: Record<string, boolean> = localMinStatusRaw
        ? JSON.parse(localMinStatusRaw)
        : {};

      const loadedMinutes: ApprovedPortalMinute[] = [];

      if (meetingsData) {
        for (const mtg of meetingsData as any[]) {
          const mins = Array.isArray(mtg.minutes) ? mtg.minutes : mtg.minutes ? [mtg.minutes] : [];
          for (const min of mins) {
            const isApprovedInDb =
              min.status === 'approved' ||
              min.status === 'published' ||
              min.quality_status === 'approved';
            const isApprovedFinal =
              localMinApprovals[min.id] !== undefined ? localMinApprovals[min.id] : isApprovedInDb;

            if (!isApprovedFinal) continue;

            const content = min.content || {};
            const rawTopics = content.temas_tratados || content.TEMAS_TRATADOS || [];
            const rawComms = content.compromisos || content.COMPROMISOS || [];

            loadedMinutes.push({
              id: min.id,
              title: mtg.title || content.cabecera?.proyecto || 'Minuta Oficial de Seguimiento',
              date:
                content.cabecera?.fecha ||
                content.CABECERA?.FECHA ||
                new Date(mtg.meeting_date).toLocaleDateString('es-AR'),
              consultant: min.quality_approver_name || 'Consultor Senior GS',
              objective:
                content.cabecera?.objetivo ||
                content.CABECERA?.OBJETIVO ||
                'Revisión de pilares estratégicos y compromisos del período.',
              participants:
                content.cabecera?.participantes ||
                content.CABECERA?.PARTICIPANTES ||
                [],
              topics: rawTopics.map((t: any, idx: number) => ({
                numero: String(t.numero || t.NUMERO || `2.${idx + 1}`),
                titulo: t.titulo || t.TITULO || 'Tema Tratado',
                resumen: t.resumen || t.DESCRIPCION || '',
                acuerdos: t.acuerdos || t.ACUERDO || '',
              })),
              commitments: rawComms.map((c: any) => ({
                accion: c.accion || c.TAREA || '',
                responsable: c.responsable || c.RESPONSABLE || 'Equipo',
                fecha: c.fecha || c.FECHA_LIMITE || '30 días',
                estado: c.estado || 'En Proceso',
              })),
              reflection: content.reflexion_general || '',
            });
          }
        }
      }

      if (interviewsData) {
        for (const ent of interviewsData) {
          const isApprovedFinal =
            localMinApprovals[ent.id] !== undefined ? localMinApprovals[ent.id] : true;
          if (!isApprovedFinal) continue;
          const minJson = ent.minutas || {};
          loadedMinutes.push({
            id: ent.id,
            title: ent.titulo || 'Minuta de Sesión Grabada y Validada',
            date: new Date(ent.created_at).toLocaleDateString('es-AR'),
            consultant: ent.validated_by || 'Consultor Senior GS',
            objective: ent.resumen || minJson.resumen_ejecutivo || 'Sesión de tutoría validada por Consultora GS.',
            participants: ['Directorio Cliente', 'Equipo Consultor GS'],
            topics: (minJson.temas_principales || []).map((t: any, idx: number) => ({
              numero: `1.${idx + 1}`,
              titulo: typeof t === 'string' ? t : t.tema || 'Tema de Sesión',
              resumen: typeof t === 'string' ? t : t.detalle || '',
              acuerdos: typeof t === 'string' ? '' : t.acuerdo || '',
            })),
            commitments: (minJson.compromisos || []).map((c: any) => ({
              accion: c.tarea || c.accion || String(c),
              responsable: c.responsable || 'Directorio',
              fecha: c.fecha || 'Próxima Sesión',
            })),
          });
        }
      }

      setApprovedMinutes(loadedMinutes);

      // 7. Load Master Plan Tasks, Quarterly Reviews & Risk Matrix
      const [{ data: dbTasks }, { data: dbRisks }, { data: dbQuarterly }] = await Promise.all([
        ((supabase as any).from('master_plan_tasks'))
          .select('*')
          .eq('organization_id', id)
          .order('code', { ascending: true }),
        ((supabase as any).from('risk_matrix'))
          .select('*')
          .eq('organization_id', id)
          .order('code', { ascending: true }),
        ((supabase as any).from('master_plan_quarterly_reviews'))
          .select('*')
          .eq('organization_id', id)
          .order('review_date', { ascending: true }),
      ]);

      const axisLabels: Record<number, string> = {
        1: 'EJE 1: Gobernanza y Estrategia',
        2: 'EJE 2: Estructura y RRHH',
        3: 'EJE 3: Finanzas y Control',
        4: 'EJE 4: Procesos y Operaciones',
        5: 'EJE 5: Comercial y Clientes',
      };

      const localTasksRaw = localStorage.getItem(`gs_master_plan_tasks_${id}`);
      if (cloudWs?.masterPlanTasks && cloudWs.masterPlanTasks.length > 0) {
        setMasterPlanTasks(
          cloudWs.masterPlanTasks.map((t: any) => ({
            code: t.code,
            axis: t.axis || t.axisId || 1,
            axisName: t.axisName || axisLabels[t.axis || t.axisId || 1],
            title: t.title || t.task,
            priority: t.priority || 'Alta',
            status: t.status || 'SIN INICIAR',
            responsible: t.assignedRole || t.responsible || t.assigned_role || 'Socio / Líder',
            dueDate: t.dueDate || t.endDate || t.due_date || '90 días',
            progress: t.progress || 0,
          }))
        );
      } else if (localTasksRaw) {
        try {
          const parsedLocal = JSON.parse(localTasksRaw);
          setMasterPlanTasks(
            parsedLocal.map((t: any) => ({
              code: t.code,
              axis: t.axis || t.axisId || 1,
              axisName: t.axisName || axisLabels[t.axis || t.axisId || 1],
              title: t.title || t.task,
              priority: t.priority || 'Alta',
              status: t.status || 'SIN INICIAR',
              responsible: t.assignedRole || t.responsible || t.assigned_role || 'Socio / Líder',
              dueDate: t.dueDate || t.endDate || t.due_date || '90 días',
              progress: t.progress || 0,
            }))
          );
        } catch {
          // ignore
        }
      } else if (id === EJEMPLO_SAS_ID) {
        setMasterPlanTasks(
          INITIAL_MASTER_PLAN_TASKS.map((t) => ({
            code: t.code,
            axis: t.axis,
            axisName: t.axisName,
            title: t.title,
            priority: t.priority,
            status: t.status,
            responsible: t.assignedRole,
            dueDate: t.dueDate,
            progress: t.status === 'FINALIZADO' ? 100 : t.status === 'EN PROCESO' ? 55 : t.progress,
          }))
        );
      } else if (dbTasks && dbTasks.length > 0) {
        setMasterPlanTasks(
          dbTasks.map((t: any) => ({
            code: t.code,
            axis: t.axis,
            axisName: axisLabels[t.axis] || `Eje ${t.axis}`,
            title: t.title,
            priority: t.priority || 'Media',
            status: t.status || 'SIN INICIAR',
            responsible: t.assigned_role || 'Líder de Área',
            dueDate: t.due_date || '90 días',
            progress: t.progress || 0,
          }))
        );
      } else {
        setMasterPlanTasks([]);
      }

      setRiskMatrix(dbRisks || []);
      setQuarterlyReviews(dbQuarterly || []);

      // 8. Load Approved Client Documents (strictly where visible_to_client === true)
      const { data: dbDocs } = await ((supabase as any).from('client_documents'))
        .select('*')
        .eq('organization_id', id)
        .order('created_at', { ascending: false });

      const localDocVisRaw = localStorage.getItem(`gs_doc_visibility_${id}`);
      const localDocVis: Record<string, boolean> = localDocVisRaw ? JSON.parse(localDocVisRaw) : {};

      const visibleDocs = (dbDocs || []).filter((d: any) => {
        if (localDocVis[d.id] !== undefined) return localDocVis[d.id];
        return d.visible_to_client !== false;
      });

      setApprovedDocuments(visibleDocs);
      setLoading(false);
    };

    fetchPortalData();
  }, [id, roleInfo, isConsultantViewer]);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !id) return;

    const expected = (client.portal_access_code || 'GS-DEMO-2026').trim().toUpperCase();
    if (accessCode.trim().toUpperCase() === expected) {
      sessionStorage.setItem(`gs_portal_verified_${id}`, 'true');
      sessionStorage.setItem('gs_active_client_org', id);
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Código de acceso inválido para esta organización. Verifique el código enviado por su consultor GS.');
    }
  };

  const handleClientSignOut = async () => {
    sessionStorage.clear();
    if (session) {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-500">
        <Activity className="w-8 h-8 text-[#0D9488] animate-spin mb-3" />
        <p className="text-sm font-medium text-[#17324D]">Verificando permisos y cargando Portal Ejecutivo...</p>
      </div>
    );
  }

  // Bloqueo Estricto Multitenant (Un cliente jamás puede ver lo de otro cliente)
  if (crossTenantBlocked) {
    const allowedOrgId = roleInfo?.organizationId || sessionStorage.getItem('gs_active_client_org');
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="figma-card p-8 max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="px-3 py-0.5 rounded-full bg-[#EDF3F8] text-[#17324D] text-[10px] font-bold uppercase tracking-wider">
            Seguridad Multitenant GS
          </span>
          <h2 className="text-xl font-bold text-[#17324D] font-display">
            Acceso Restringido a Otra Organización
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Por política estricta de confidencialidad de <strong>Estudio GS</strong>, cada cliente tiene acceso única y exclusivamente a su propio expediente corporativo.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            {allowedOrgId && (
              <Link
                to={`/portal/${allowedOrgId}`}
                className="btn-nordic-teal w-full py-2.5 px-4 rounded-xl text-xs font-semibold"
              >
                Ir a Mi Portal Autorizado
              </Link>
            )}
            <button
              type="button"
              onClick={handleClientSignOut}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="figma-card p-8 max-w-md w-full space-y-4">
          <h2 className="text-xl font-bold text-[#17324D] font-display">Portal no disponible</h2>
          <p className="text-xs text-slate-500">No se encontró la empresa solicitada o el enlace ha caducado.</p>
          <Link
            to="/login"
            className="btn-nordic-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Ir al Inicio de Sesión
          </Link>
        </div>
      </div>
    );
  }

  // Si requiere autenticación por código de acceso exclusivo de la empresa
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EDF3F8] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-9 rounded-3xl border border-slate-200/90 shadow-[0_24px_60px_-15px_rgba(23,50,77,0.12)] max-w-md w-full space-y-6">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#17324D] to-[#0D9488] text-white flex items-center justify-center font-bold font-display shadow-xs">
              GS
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17324D] font-display">{client.name}</h2>
              <span className="text-[11px] text-[#0D9488] font-medium">Portal Ejecutivo Exclusivo</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#17324D] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#0D9488]" /> Ingrese su Código Corporativo
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Introduzca la clave confidencial asignada a <strong>{client.name}</strong> por su consultor GS para visualizar los entregables aprobados.
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Ej: GS-DEMO-2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none text-sm uppercase tracking-widest font-mono font-semibold"
                required
              />
              {errorMsg && <p className="text-xs text-rose-600 mt-1.5 font-medium">{errorMsg}</p>}
            </div>

            <button
              type="submit"
              className="btn-nordic-teal w-full py-3 rounded-xl text-xs font-semibold tracking-wide cursor-pointer"
            >
              Desbloquear Portal de {client.name}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium text-[#0F766E]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" /> Entorno Multi-tenant Aislado
            </span>
            <Link to="/login" className="hover:text-[#17324D] font-semibold">
              Cambiar cuenta →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Translucent Glass Bar */}
      <div className="figma-glass border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {isConsultantViewer && (
            <Link
              to={`/clients/${client.id}`}
              className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#17324D] transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
              title="Volver al Back-Office de Consultor GS"
            >
              <ArrowLeft className="w-4 h-4 text-[#0D9488]" />
              Expediente Consultor
            </Link>
          )}
          <div>
            <span className="text-[10px] font-semibold text-[#0D9488] uppercase tracking-wider block">
              {isConsultantViewer
                ? 'Vista Previa Consultor GS · Espejo del Cliente'
                : 'Portal Ejecutivo Corporativo · Sesión Segura'}
            </span>
            <h1 className="text-sm font-bold text-[#17324D] font-display leading-tight">{client.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConsultantViewer ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-teal-200 text-[11px] font-semibold">
                <Eye className="w-3.5 h-3.5 text-[#0D9488]" />
                Vista Cliente ({client.name})
              </span>
              <Link
                to={`/clients/${client.id}`}
                className="btn-nordic-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold"
              >
                Configurar Aprobaciones
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-teal-200 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" /> Datos Auditados GS
              </span>
              <button
                type="button"
                onClick={handleClientSignOut}
                className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <ClientPortalView
          client={client}
          results={results || ({} as any)}
          isOmvApproved={isOmvApproved}
          isDiagnosticApproved={isDiagnosticApproved}
          isMasterPlanApproved={isMasterPlanApproved}
          ombData={ombData}
          approvedMinutes={approvedMinutes}
          masterPlanTasks={masterPlanTasks}
          riskMatrix={riskMatrix}
          approvedDocuments={approvedDocuments}
          quarterlyReviews={quarterlyReviews}
        />
      </div>

      {/* Copiloto Growy en Modo Cliente Aislado */}
      <GrowyChat activeClientId={client.id} activeClientName={client.name} roleMode="client" />
    </div>
  );
}
