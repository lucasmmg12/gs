-- Migración para el sistema de Gobernanza de Audios (Reuniones/Entrevistas)

-- Tabla para cuestionarios preconfigurados
CREATE TABLE IF NOT EXISTS public.gobernanza_plantillas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    preguntas JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para almacenar cada sesión de auditoría realizada
CREATE TABLE IF NOT EXISTS public.gobernanza_entrevistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantilla_id UUID REFERENCES public.gobernanza_plantillas(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL DEFAULT 'Nueva Entrevista',
    audio_url TEXT,
    audios_partes TEXT[] DEFAULT '{}'::text[],
    duracion_segundos INTEGER DEFAULT 0,
    transcripcion TEXT,
    resumen TEXT,
    respuestas_cuestionario JSONB,
    mapa_conceptual_mermaid TEXT,
    minutas JSONB,
    estado TEXT DEFAULT 'grabando' CHECK (estado IN ('grabando', 'procesando', 'completado', 'error')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas RLS
ALTER TABLE public.gobernanza_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gobernanza_entrevistas ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y escritura a usuarios autenticados (simplificado para el proyecto GS)
CREATE POLICY "Permitir select a autenticados en plantillas" ON public.gobernanza_plantillas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir insert/update a autenticados en plantillas" ON public.gobernanza_plantillas FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir select a autenticados en entrevistas" ON public.gobernanza_entrevistas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir insert/update a autenticados en entrevistas" ON public.gobernanza_entrevistas FOR ALL TO authenticated USING (true);

-- Insertar plantilla por defecto para tener algo que probar
INSERT INTO public.gobernanza_plantillas (nombre, preguntas) VALUES (
    'Auditoría General',
    '["¿Cuál fue el objetivo principal de la reunión?", "¿Qué problemas principales se mencionaron?", "¿Qué decisiones o acuerdos se tomaron?"]'::jsonb
);

-- Crear Bucket de Storage si no existe (usando inserción directa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gobernanza_audios', 'gobernanza_audios', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para gobernanza_audios
CREATE POLICY "Lectura gobernanza_audios"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'gobernanza_audios');

CREATE POLICY "Inserción gobernanza_audios"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'gobernanza_audios');

CREATE POLICY "Actualización gobernanza_audios"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'gobernanza_audios');
