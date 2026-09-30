-- Migration: OMB Revisions, Client Document Repository (RAG), Master Plan Weighted Actions, and System Prompts
-- Date: 2026-09-29

-- 1. Table for OMB (Objetivo Más Bárbaro / Visión 3 Años) Revisions
CREATE TABLE IF NOT EXISTS public.client_omb_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    revision_code TEXT NOT NULL DEFAULT 'Rev A',
    title TEXT DEFAULT 'Visión Trienal a 3 Años',
    declaration_text TEXT NOT NULL,
    partner_inputs JSONB DEFAULT '[]'::jsonb,
    audio_podcast_url TEXT DEFAULT NULL,
    status TEXT DEFAULT 'en_revision',
    is_baseline_rev0 BOOLEAN DEFAULT false,
    created_by TEXT DEFAULT 'Consultor Líder',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omb_revisions_org ON public.client_omb_revisions(organization_id);
ALTER TABLE public.client_omb_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir all en client_omb_revisions" 
ON public.client_omb_revisions FOR ALL TO authenticated, anon USING (true);

-- 2. Table for Client Documents (Gestor Documental y Cerebro RAG)
CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size TEXT,
    scope_level TEXT NOT NULL DEFAULT 'global', -- 'global', 'area', 'question'
    area_id TEXT DEFAULT NULL,
    question_id INTEGER DEFAULT NULL,
    uploaded_by_role TEXT NOT NULL DEFAULT 'consultor', -- 'consultor', 'cliente'
    uploader_name TEXT DEFAULT 'Consultor GS',
    embedding_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'indexed', 'failed'
    description TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_org ON public.client_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_scope ON public.client_documents(organization_id, scope_level, area_id);
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir all en client_documents" 
ON public.client_documents FOR ALL TO authenticated, anon USING (true);

-- 3. Table for Master Plan Weighted Actions (Ponderación por Incidencias)
CREATE TABLE IF NOT EXISTS public.master_plan_weighted_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pentagon_axis TEXT NOT NULL, -- 'Directorio' (Gobernanza), 'Talento', 'Finanzas', 'Procesos', 'Comercial'
    action_title TEXT NOT NULL,
    responsable TEXT DEFAULT 'Líder de Área',
    quarter TEXT DEFAULT 'Q1',
    weight_percentage NUMERIC NOT NULL DEFAULT 20.0, -- % de incidencia (suma 100% por eje)
    progress_percentage NUMERIC NOT NULL DEFAULT 0.0, -- 0 a 100% de avance real
    baseline_score NUMERIC DEFAULT 1.0,
    impact_description TEXT DEFAULT NULL,
    status TEXT DEFAULT 'in_progress', -- 'pending', 'in_progress', 'completed'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weighted_actions_org ON public.master_plan_weighted_actions(organization_id);
ALTER TABLE public.master_plan_weighted_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir all en master_plan_weighted_actions" 
ON public.master_plan_weighted_actions FOR ALL TO authenticated, anon USING (true);

-- 4. Table for System Prompts and Client/Sector Overrides
CREATE TABLE IF NOT EXISTS public.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    base_prompt TEXT NOT NULL,
    sector_overrides JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir all en system_prompts" 
ON public.system_prompts FOR ALL TO authenticated, anon USING (true);

-- Insert Default System Prompts
INSERT INTO public.system_prompts (prompt_key, title, description, base_prompt, sector_overrides)
VALUES 
(
  'diagnostic_checkout',
  'Extractor de Diagnóstico y Sugerencias de Cierre',
  'Analiza la transcripción completa de la reunión e identifica qué preguntas fueron respondidas o afectadas.',
  'Sos el Consultor Senior de Diagnóstico 360° en Consultora GS. Conoces la metodología de 10 áreas y 5 ejes.
Tu tarea es analizar la Transcripción completa de la sesión.
REGLA CRÍTICA DE FILTRO HUMANO:
- Solo detecta respuestas fundamentadas en declaraciones audibles.
- No alucines ni asumas datos no mencionados.
- Identifica el número de pregunta (1 al 78), el área correspondiente, extrae la cita textual exacta como evidencia, define la calificación o texto sugerido, y asigna un nivel de confianza (alta, media, baja).',
  '{"industrial": "Priorizar tiempos de entrega, cuellos de botella, mantenimiento preventivo y scrap.", "servicios": "Priorizar horas facturables, satisfacción del cliente (NPS) y retención de talento."}'::jsonb
),
(
  'minute_generator',
  'Generador de Minuta Ejecutiva de Sesión',
  'Genera la minuta ejecutiva estructurada con resumen, acuerdos, compromisos y próximos pasos.',
  'Sos el Director Metodológico de Consultora GS. Tu función es redactar una Minuta Ejecutiva formal, clara y de alto valor estratégico para los dueños de la empresa.
Estructura obligatoria:
1. Encabezado institucional y objetivos de la sesión.
2. Resumen ejecutivo de los temas tratados.
3. Acuerdos y decisiones tomadas.
4. Matriz de compromisos y próximos pasos (Responsable, Tarea, Fecha límite).
5. Observaciones metodológicas para la siguiente sesión.',
  '{}'::jsonb
),
(
  'omb_synthesizer',
  'Sintetizador de Visión OMB (Objetivo Más Bárbaro)',
  'Consolida las visiones individuales de los socios fundadores en una declaración unificada en tiempo presente.',
  'Sos un redactor estratégico de visión empresarial en Consultora GS. Tu tarea es tomar las visiones expresadas por cada socio fundador y unificarlas en la declaración definitiva del OMB (Objetivo Más Bárbaro) a 3 años.
REGLAS OBLIGATORIAS:
1. Redactar estrictamente en TIEMPO PRESENTE (como una vivencia real y alcanzada hoy, nunca como deseo futuro condicional).
2. Cuantificar métricas: Facturación anual, margen neto, cantidad de empleados, posición de mercado.
3. Describir la gobernanza: Funcionamiento autónomo del Directorio, delegación operativa real y rol del dueño en estrategia.
4. Tono inspirador, riguroso y profesional.',
  '{}'::jsonb
)
ON CONFLICT (prompt_key) DO NOTHING;
