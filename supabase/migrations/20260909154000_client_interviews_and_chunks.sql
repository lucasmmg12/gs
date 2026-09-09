-- Migración para soporte de reuniones dentro del perfil del cliente y chunks seguros
ALTER TABLE public.gobernanza_entrevistas 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS selected_questions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_question_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chunk_metadata JSONB DEFAULT '[]'::jsonb;

-- Asegurar políticas RLS para gobernanza_entrevistas y plantillas
CREATE INDEX IF NOT EXISTS idx_gobernanza_entrevistas_client_id ON public.gobernanza_entrevistas(client_id);
