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

const DIAGNOSTIC_UPDATE_PROMPT = `Sos el Consultor Senior de Diagnóstico 360° en Consultora GS.
Tu tarea es analizar la Minuta o Transcripción de una reunión reciente y actualizar el Formulario de Diagnóstico Integral 360° de la empresa cliente (10 áreas, 78 preguntas).

## REGLA CRÍTICA DE ACTUALIZACIÓN INCREMENTAL (CERO SOBRESCRITURA CIEGA):
1. **NO modifiques las respuestas de las preguntas que no fueron tratadas en esta reunión.**
2. Identifica con precisión qué preguntas (por número del 1 al 78) se abordaron en la sesión (por ejemplo: preguntas 13 a 20 sobre costos fijos, punto de equilibrio y mapa de procesos).
3. Para cada pregunta tratada:
   - Redacta la evaluación actualizada incorporando los nuevos hechos, acuerdos y decisiones.
   - Si corresponde, actualiza o sugiere nuevos valores para los KPIs asociados.
4. Genera una lista de sugerencias estructuradas en formato JSON para que el consultor humano las revise y apruebe una por una.

## FORMATO DE RESPUESTA JSON REQUERIDO:
{
  "summary": "Breve resumen de las áreas y preguntas impactadas",
  "suggested_changes": [
    {
      "question_id": 20,
      "area_id": "area_3_operaciones",
      "question_title": "Mapa de procesos principales",
      "new_assessment": "Texto actualizado con la evidencia de la reunión...",
      "kpi_updates": { "kpi_name": "Nuevo valor detectado" },
      "confidence": "alta",
      "reason": "Explicación de por qué se propone este cambio..."
    }
  ],
  "ime_impact_estimate": "+0.4 puntos en Eje de Procesos"
}
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

    const { meeting_id, organization_id } = await req.json()
    if (!organization_id) throw new Error('organization_id is required')

    // 1. Fetch meeting and minute
    let meetingText = ''
    if (meeting_id) {
      const { data: minute } = await supabase
        .from('minutes')
        .select('*')
        .eq('meeting_id', meeting_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (minute?.content) {
        meetingText = typeof minute.content === 'string' ? minute.content : JSON.stringify(minute.content)
      }
    }

    // 2. Fetch current Diagnostic 360
    const { data: currentDiag } = await supabase
      .from('diagnostic_360')
      .select('*')
      .eq('organization_id', organization_id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 3. Call OpenAI
    const prompt = `Analiza la siguiente información de la reunión de trabajo y genera las sugerencias de actualización sobre el Diagnóstico 360°.

INFORMACIÓN DE LA REUNIÓN:
${meetingText || 'Reunión de mapeo de procesos bajo norma ISO 9001, revisión de costos fijos y punto de equilibrio.'}

ESTADO ACTUAL DEL DIAGNÓSTICO:
${JSON.stringify(currentDiag?.areas_data || {})}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: DIAGNOSTIC_UPDATE_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const suggestions = JSON.parse(response.choices[0].message.content || '{}')

    // 4. Save into diagnostic_suggestions table
    const { data: savedSuggestion, error: sugErr } = await supabase
      .from('diagnostic_suggestions')
      .insert([{
        organization_id,
        meeting_id: meeting_id || null,
        suggested_changes: suggestions,
        status: 'pending'
      }])
      .select()
      .single()

    if (sugErr) throw sugErr

    return new Response(JSON.stringify({ success: true, suggestions: savedSuggestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('update-diagnostic error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
