import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.28.0'
import { MANUAL_PROCEDIMIENTOS } from './manual.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const BASE_SYSTEM_PROMPT = `Sos "Growy", el asistente de IA experto y copiloto metodológico de Consultora GS.
Hablás en español profesional, analítico y cercano (usando voseo argentino cuando sea natural).
Sos experto en toda la plataforma y metodología de GS:
- PR-01: Gestión de Reuniones, Audios, Transcripciones y Minutas oficiales con aprobación humana.
- PR-02: Diagnóstico Integral 360° (10 Áreas, 78 Preguntas, OMV Target CVA, IME 0-100 e IRE 0-100) con actualización incremental.
- PR-03: Master Plan Estratégico (5 Ejes: Gobernanza, Procesos, Finanzas, Talento, Comercial), Pentágono del Orden (PENT-PE 0-10) y Matriz de Riesgos (R-01.., 5x5).

## REGLAS CRÍTICAS:
1. **SIEMPRE consultá datos reales ANTES de responder.** Usá las herramientas (tools) disponibles para traer datos actualizados de la base de datos de Supabase.
2. **Seguridad y Privacidad Estricta (RLS):** Si un cliente externo pregunta, solo puede acceder a la información de su propia organización. Si la base de datos devuelve vacío, explicale amablemente que no se encontraron registros o no cuenta con los permisos necesarios.
3. **Proactividad Metodológica:** Si te preguntan por un cliente, aportá contexto de su IME, estado del Pentágono, minutas recientes y riesgos críticos identificados. Si preguntan sobre cómo proceder, usá \`query_manual\`.
`

const tools: any = [
  {
    type: 'function',
    function: {
      name: 'query_organizations',
      description: 'Buscar organizaciones (clientes). Puedes filtrar por nombre o industria.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Nombre parcial a buscar' },
          industry: { type: 'string', description: 'Industria' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_meetings',
      description: 'Obtener historial de reuniones. Puedes filtrar por organization_id.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          status: { type: 'string', description: 'Status de la reunión (ej: completed, scheduled)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_minutes',
      description: 'Consultar contenido de las minutas.',
      parameters: {
        type: 'object',
        properties: {
          meeting_id: { type: 'string', description: 'UUID de la reunión' },
          status: { type: 'string', description: 'Status de la minuta (draft, in_review, approved, published)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_master_plan',
      description: 'Consultar tareas, hitos y avance del Master Plan Estratégico (MPE) por cliente o eje.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          axis: { type: 'number', description: 'Número de eje (1 al 5)' },
          status: { type: 'string', description: 'sin_iniciar, en_proceso, finalizado' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_pentagon_scores',
      description: 'Consultar el Pentágono del Orden y evolución histórica de madurez estratégica (IME 0-10) en los 5 ejes.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_risk_matrix',
      description: 'Consultar la Matriz de Riesgos Organizacionales (código, probabilidad, impacto, nivel y estrategias de mitigación).',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          min_level: { type: 'number', description: 'Nivel mínimo de riesgo inherente (ej: 10 para riesgos altos/extremos)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_diagnostic_360',
      description: 'Consultar el Diagnóstico 360°, OMV a 3 años, respuestas de las 10 áreas y puntajes IME/IRE.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_manual',
      description: 'Obtener información del Manual de Procedimientos de GS para responder dudas de metodología (PR-01, PR-02, PR-03, políticas de seguridad).',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
]

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

    const { messages } = await req.json()
    if (!messages) throw new Error('No messages provided')

    const sysMsg = { role: 'system', content: BASE_SYSTEM_PROMPT }
    const conversation = [sysMsg, ...messages]

    // Step 1: Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversation,
      tools: tools,
      tool_choice: 'auto'
    })

    let responseMessage = response.choices[0].message
    let stepCount = 0

    // Step 2: Handle tool calls (execute them)
    while (responseMessage.tool_calls && stepCount < 6) {
      stepCount++
      conversation.push(responseMessage)

      for (const toolCall of responseMessage.tool_calls) {
        const name = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments || '{}')
        let toolResult = ''

        try {
          if (name === 'query_organizations') {
            let q = supabase.from('organizations').select('id, name, industry, status')
            if (args.search) q = q.ilike('name', `%${args.search}%`)
            if (args.industry) q = q.eq('industry', args.industry)
            const { data, error } = await q.limit(10)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          } 
          else if (name === 'query_meetings') {
            let q = supabase.from('meetings').select('id, title, meeting_date, status, organization_id')
            if (args.organization_id) q = q.eq('organization_id', args.organization_id)
            if (args.status) q = q.eq('status', args.status)
            const { data, error } = await q.order('meeting_date', { ascending: false }).limit(10)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_minutes') {
            let q = supabase.from('minutes').select('id, meeting_id, status, content, version')
            if (args.meeting_id) q = q.eq('meeting_id', args.meeting_id)
            if (args.status) q = q.eq('status', args.status)
            const { data, error } = await q.limit(5)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_master_plan') {
            let q = supabase.from('master_plan_tasks').select('*')
            if (args.organization_id) q = q.eq('organization_id', args.organization_id)
            if (args.axis) q = q.eq('axis', args.axis)
            if (args.status) q = q.eq('status', args.status)
            const { data, error } = await q.order('axis').limit(15)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_pentagon_scores') {
            let q = supabase.from('pentagon_scores').select('*')
            if (args.organization_id) q = q.eq('organization_id', args.organization_id)
            const { data, error } = await q.order('measurement_date', { ascending: true })
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_risk_matrix') {
            let q = supabase.from('risk_matrix').select('*')
            if (args.organization_id) q = q.eq('organization_id', args.organization_id)
            if (args.min_level) q = q.gte('level_inherent', args.min_level)
            const { data, error } = await q.order('level_inherent', { ascending: false }).limit(10)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_diagnostic_360') {
            let q = supabase.from('diagnostic_360').select('*')
            if (args.organization_id) q = q.eq('organization_id', args.organization_id)
            const { data, error } = await q.order('version', { ascending: false }).limit(1).maybeSingle()
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_manual') {
            toolResult = MANUAL_PROCEDIMIENTOS
          }
        } catch (e: any) {
          toolResult = `Error en tool: ${e.message}`
        }

        conversation.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: name,
          content: toolResult
        })
      }

      // Step 3: Call OpenAI again with the tool results
      const nextResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: conversation,
        tools: tools,
        tool_choice: 'auto'
      })
      responseMessage = nextResponse.choices[0].message
    }

    return new Response(JSON.stringify({ reply: responseMessage.content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Growy Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
