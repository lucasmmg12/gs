import { supabase } from './supabase';
import type { CommercialProposalState } from '../components/views/RelevamientoPropuestaModule';
import type { GSAxisStrategicMeta, OMVTargetRow } from '../data/gsAxisMetadata';
import type { ResponseOptionValue } from '../data/diagnosticQuestions';
import type { ApprovalStatus, AuditConsultants } from '../components/QualityApprovalBadge';
import type { ClientStage } from '../components/views/OMBModule';

export interface ClientTaskProgressReport {
  suggestedStatus: string;
  progress: number;
  note: string;
  updatedAt: string;
}

export interface ClientSelfAssessmentEntry {
  answers: Record<number, string>;
  sentAt: string;
}

export interface OwnerSavedMeetingBrief {
  id: string;
  meetingType: string;
  counterpart: string;
  objective: string;
  createdAt: string;
}

export interface OrgCloudWorkspaceState {
  orgId: string;
  orgName?: string;
  industry?: string;
  portalAccessCode?: string;
  projectCode?: string;
  clientStage?: ClientStage;
  approvals?: {
    omv: ApprovalStatus;
    diagnostic_360: ApprovalStatus;
    master_plan: ApprovalStatus;
  };
  audits?: {
    omv?: AuditConsultants;
    diagnostic_360?: AuditConsultants;
    master_plan?: AuditConsultants;
  };
  omvTargets?: OMVTargetRow[];
  omvDeclarationText?: string;
  omvRevisionCode?: string;
  diagnosticAnswers?: Record<number, ResponseOptionValue>;
  qualitativeAnswers?: Record<number, { answer: string; quote?: string; updatedAt?: string }>;
  areaKpis?: Record<string, string>;
  axesMeta?: GSAxisStrategicMeta[];
  masterPlanTasks?: any[];
  minuteApprovals?: Record<string, boolean>;
  docVisibility?: Record<string, boolean>;
  updatedAt?: string;
}

export interface ClientCollabCloudState {
  orgId: string;
  taskUpdates: Record<string, ClientTaskProgressReport>;
  latestSelfAssessment?: ClientSelfAssessmentEntry | null;
  savedMeetingBriefs?: OwnerSavedMeetingBrief[];
  updatedAt?: string;
}

const WORKSPACE_KEY_PREFIX = 'gs_org_workspace_';
const STAGE0_INTERNAL_PREFIX = 'gs_stage0_internal_';
const CLIENT_COLLAB_PREFIX = 'gs_client_collab_';
const PUBLIC_ORGS_DIRECTORY_KEY = 'gs_public_orgs_directory';

export interface PublicOrgDirectoryEntry {
  id: string;
  name: string;
  industry: string | null;
  portal_access_code: string | null;
}

/**
 * Syncs public directory metadata (only id, name, industry, portal_access_code)
 * so Clients logging in via Corporate Portal Code can always verify their access code
 * against Supabase PostgreSQL even prior to an email/password session.
 */
export async function syncPublicOrgsDirectoryToDb(orgs: PublicOrgDirectoryEntry[]): Promise<void> {
  if (!orgs || orgs.length === 0) return;
  try {
    await (supabase.from('configuraciones') as any).upsert(
      {
        clave: PUBLIC_ORGS_DIRECTORY_KEY,
        valor: { orgs, updatedAt: new Date().toISOString() },
        descripcion: 'Directorio de validación de códigos de acceso de Portal Cliente GS',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clave' }
    );
  } catch (err) {
    console.warn('[gsCloudSync] Directory sync warning:', err);
  }
}

export async function loadPublicOrgsDirectoryFromDb(): Promise<PublicOrgDirectoryEntry[]> {
  try {
    const { data } = await (supabase.from('configuraciones') as any)
      .select('valor')
      .eq('clave', PUBLIC_ORGS_DIRECTORY_KEY)
      .maybeSingle();
    if (data?.valor?.orgs && Array.isArray(data.valor.orgs)) {
      return data.valor.orgs;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Loads the organization's shared Consultant -> Portal workspace state from Supabase DB.
 * Never includes Stage 0 commercial budgets (stored separately).
 */
export async function loadOrgWorkspaceFromDb(orgId: string): Promise<OrgCloudWorkspaceState | null> {
  if (!orgId) return null;
  try {
    const { data, error } = await (supabase.from('configuraciones') as any)
      .select('valor')
      .eq('clave', `${WORKSPACE_KEY_PREFIX}${orgId}`)
      .maybeSingle();

    if (!error && data?.valor) {
      return data.valor as OrgCloudWorkspaceState;
    }
  } catch (err) {
    console.warn('[gsCloudSync] loadOrgWorkspaceFromDb fallback:', err);
  }
  return null;
}

/**
 * Merges and persists Consultant workspace changes directly into Supabase PostgreSQL (`configuraciones`),
 * keeping localStorage mirrored as an instant local cache.
 */
export async function saveOrgWorkspaceToDb(
  orgId: string,
  patch: Partial<OrgCloudWorkspaceState>
): Promise<boolean> {
  if (!orgId) return false;
  try {
    const existing = (await loadOrgWorkspaceFromDb(orgId)) || { orgId };
    const merged: OrgCloudWorkspaceState = {
      ...existing,
      ...patch,
      orgId,
      updatedAt: new Date().toISOString(),
    };

    // Mirror key slices to localStorage for instant synchronous reads by exporters
    if (merged.projectCode) localStorage.setItem(`gs_project_code_${orgId}`, merged.projectCode);
    if (merged.clientStage) localStorage.setItem(`gs_client_stage_${orgId}`, merged.clientStage);
    if (merged.omvTargets) localStorage.setItem(`gs_omv_targets_${orgId}`, JSON.stringify(merged.omvTargets));
    if (merged.qualitativeAnswers)
      localStorage.setItem(`gs_qualitative_answers_${orgId}`, JSON.stringify(merged.qualitativeAnswers));
    if (merged.areaKpis) localStorage.setItem(`gs_area_kpis_${orgId}`, JSON.stringify(merged.areaKpis));
    if (merged.axesMeta) localStorage.setItem(`gs_axes_meta_${orgId}`, JSON.stringify(merged.axesMeta));
    if (merged.approvals) localStorage.setItem(`gs_approvals_${orgId}`, JSON.stringify(merged.approvals));
    if (merged.masterPlanTasks)
      localStorage.setItem(`gs_master_plan_tasks_${orgId}`, JSON.stringify(merged.masterPlanTasks));

    const { error } = await (supabase.from('configuraciones') as any).upsert(
      {
        clave: `${WORKSPACE_KEY_PREFIX}${orgId}`,
        valor: merged,
        descripcion: `Estado consolidado de expediente GS para organización ${merged.orgName || orgId}`,
        updated_at: merged.updatedAt,
      },
      { onConflict: 'clave' }
    );

    return !error;
  } catch (err) {
    console.warn('[gsCloudSync] saveOrgWorkspaceToDb warning:', err);
    return false;
  }
}

/**
 * Strictly internal Stage 0 Commercial Proposal persistence in Supabase DB.
 * Stored under its own isolated key, never fetched by ClientPortalPage.
 */
export async function saveStage0InternalToDb(
  orgId: string,
  proposal: CommercialProposalState
): Promise<boolean> {
  if (!orgId) return false;
  try {
    localStorage.setItem(`gs_relevamiento_propuesta_${orgId}`, JSON.stringify(proposal));
    if (proposal.projectCode) {
      localStorage.setItem(`gs_project_code_${orgId}`, proposal.projectCode);
    }
    const { error } = await (supabase.from('configuraciones') as any).upsert(
      {
        clave: `${STAGE0_INTERNAL_PREFIX}${orgId}`,
        valor: proposal,
        descripcion: `Etapa 0 Confidencial (Relevamiento y Presupuesto GS) - ${orgId}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clave' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function loadStage0InternalFromDb(orgId: string): Promise<CommercialProposalState | null> {
  if (!orgId) return null;
  try {
    const { data, error } = await (supabase.from('configuraciones') as any)
      .select('valor')
      .eq('clave', `${STAGE0_INTERNAL_PREFIX}${orgId}`)
      .maybeSingle();
    if (!error && data?.valor) {
      localStorage.setItem(`gs_relevamiento_propuesta_${orgId}`, JSON.stringify(data.valor));
      return data.valor as CommercialProposalState;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Client Portal Collaboration & Autogestión state in Supabase DB:
 * - Task progress reports submitted by Client for Consultant validation
 * - Monthly Directorio Self-Assessments
 * - Owner AI Meeting Preparation Briefs
 * Also logs an audit row in `client_portal_activities` whenever possible.
 */
export async function loadClientCollabFromDb(orgId: string): Promise<ClientCollabCloudState> {
  const empty: ClientCollabCloudState = { orgId, taskUpdates: {}, savedMeetingBriefs: [] };
  if (!orgId) return empty;
  try {
    const { data, error } = await (supabase.from('configuraciones') as any)
      .select('valor')
      .eq('clave', `${CLIENT_COLLAB_PREFIX}${orgId}`)
      .maybeSingle();

    if (!error && data?.valor) {
      const val = data.valor as ClientCollabCloudState;
      if (val.taskUpdates) {
        localStorage.setItem(`gs_client_task_updates_${orgId}`, JSON.stringify(val.taskUpdates));
      }
      return {
        orgId,
        taskUpdates: val.taskUpdates || {},
        latestSelfAssessment: val.latestSelfAssessment || null,
        savedMeetingBriefs: val.savedMeetingBriefs || [],
        updatedAt: val.updatedAt,
      };
    }
  } catch {
    // ignore
  }

  try {
    const localUpdates = localStorage.getItem(`gs_client_task_updates_${orgId}`);
    if (localUpdates) {
      return { ...empty, taskUpdates: JSON.parse(localUpdates) };
    }
  } catch {
    // ignore
  }
  return empty;
}

export async function saveClientCollabToDb(
  orgId: string,
  patch: Partial<ClientCollabCloudState>,
  activityLog?: { activityType: string; performedBy?: string; details?: Record<string, any> }
): Promise<boolean> {
  if (!orgId) return false;
  try {
    const current = await loadClientCollabFromDb(orgId);
    const merged: ClientCollabCloudState = {
      ...current,
      ...patch,
      orgId,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`gs_client_task_updates_${orgId}`, JSON.stringify(merged.taskUpdates || {}));

    const { error } = await (supabase.from('configuraciones') as any).upsert(
      {
        clave: `${CLIENT_COLLAB_PREFIX}${orgId}`,
        valor: merged,
        descripcion: `Autogestión y reportes de Portal Cliente - ${orgId}`,
        updated_at: merged.updatedAt,
      },
      { onConflict: 'clave' }
    );

    if (activityLog) {
      try {
        await (supabase.from('client_portal_activities') as any).insert([
          {
            organization_id: orgId,
            activity_type: activityLog.activityType,
            performed_by: activityLog.performedBy || 'Directorio Cliente',
            details: activityLog.details || {},
          },
        ]);
      } catch {
        // RLS may skip anon on client_portal_activities; primary configuraciones write already succeeded
      }
    }

    return !error;
  } catch (err) {
    console.warn('[gsCloudSync] saveClientCollabToDb warning:', err);
    return false;
  }
}
