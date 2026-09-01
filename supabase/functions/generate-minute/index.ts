import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.28.0'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const MINUTE_SYSTEM_PROMPT = `Sos el redactor experto de Consultora GS especializado en Minutas de Seguimiento y Tutoría Estratégica.
Tu misión es generar una Minuta de Seguimiento profesional, estructurada y accionable siguiendo rigurosamente la metodología de GS.

## ESTRUCTURA MANDATORIA DE LA MINUTA (según modelo GS):
1. **CABECERA**:
   - Título de la Reunión (ej: Acompañamiento en Desarrollo y Tutoría Estratégica)
   - Fecha de la Reunión
   - Motivo / Objetivo
   - Asistentes: Separar claramente 'Consultora GS' y equipo de la empresa cliente.

2. **TEMAS TRATADOS**:
   - Dividir en secciones numeradas (ej: 1. APERTURA Y DINÁMICA..., 2. HOJA DE RUTA: DE PROCESOS A ESTRUCTURA DE PERSONAS, etc.)
   - Cada sección debe tener viñetas con títulos en negrita y desarrollo conceptual profundo.
   - Enfoque metodológico: relacionar con normas ISO 9001, organigrama de procesos vs organigrama de personas, medianera conceptual, etc.

3. **LOGÍSTICA Y PRÓXIMOS PASOS (Tabla de Compromisos)**:
   - Extraer todos los acuerdos accionables indicando: [Responsable, Tema a tratar / Tarea, Fecha de entrega].

4. **REFLEXIÓN FINAL**:
   - Párrafo de cierre metodológico sobre la madurez de la empresa, la transición del rol de dueño al de director, y la importancia de sacar el know-how de la cabeza de los socios y llevarlo a los procesos.

## REGLAS DE ESTILO:
- Lenguaje profesional, analítico y riguroso.
- Extensión máxima equivalente a 4-5 páginas.
- No omitir acuerdos ni compromisos clave.
- Devolver el resultado en formato JSON estructurado.
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } }
    })

    const { meeting_id } = await req.json()
    if (!meeting_id) throw new Error('meeting_id is required')

    // 1. Fetch meeting & organization info
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .select('*, organizations(*)')
      .eq('id', meeting_id)
      .single()

    if (meetingErr || !meeting) throw new Error('Meeting not found')

    // 2. Fetch transcription
    const { data: transcription } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('meeting_id', meeting_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const rawTranscript = transcription?.content_corrected || transcription?.content_raw || `Reunión de tutoría estratégica con ${meeting.organizations?.name}. Se trataron temas de gobernanza, procesos operativos y alineación de socios.`

    // 3. Call OpenAI to generate Minute
    const prompt = `Genera la Minuta Oficial de Seguimiento para la empresa cliente '${meeting.organizations?.name}'.
Título de la reunión: ${meeting.title}
Fecha: ${new Date(meeting.meeting_date).toLocaleDateString()}
Participantes: ${JSON.stringify(meeting.participants || [])}

Transcripción y notas de la reunión:
${typeof rawTranscript === 'string' ? rawTranscript : JSON.stringify(rawTranscript)}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: MINUTE_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const minuteContent = JSON.parse(response.choices[0].message.content || '{}')

    // 4. Insert or update minute record
    const { data: savedMinute, error: saveErr } = await supabase
      .from('minutes')
      .insert([{
        meeting_id: meeting_id,
        status: 'draft',
        content: minuteContent,
        version: 1
      }])
      .select()
      .single()

    if (saveErr) throw saveErr

    // 5. Insert commitments if extracted
    if (Array.isArray(minuteContent.proximos_pasos)) {
      for (const item of minuteContent.proximos_pasos) {
        await supabase.from('commitments').insert([{
          organization_id: meeting.organization_id,
          minute_id: savedMinute.id,
          description: item.tema || item.tarea || '',
          assigned_to: item.responsable || '',
          due_date: item.fecha_entrega ? new Date(item.fecha_entrega).toISOString() : null,
          status: 'pending'
        }])
      }
    }

    return new Response(JSON.stringify({ success: true, minute: savedMinute }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('generate-minute error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
