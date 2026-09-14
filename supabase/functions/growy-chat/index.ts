import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.28.0'
import { MANUAL_PROCEDIMIENTOS } from './manual.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const BASE_SYSTEM_PROMPT = `Sos "Growy", el asistente de IA experto, copiloto metodológico y analista de datos de Consultora GS (Grow Labs · Sanatorio Argentino).
Hablás en español profesional, analítico y cercano (usando voseo argentino cuando sea natural).

## TU ROL Y CAPACIDADES:
1. **Conocimiento Total del Sistema y Metodología GS**:
   - **PR-01: Gestión de Reuniones y Minutas**: Ciclo Recibido → Borrador → Pendiente de revisión → Aprobado → Publicado. Ningún contenido generado por IA se publica al cliente sin aprobación de un consultor humano.
   - **PR-02: Diagnóstico Integral 360°**: 10 áreas, 78 preguntas clave, OMV (Objetivo de Mediano Plazo a 3 años), cálculo del IME (Índice de Madurez Estratégica 0-100) y del IRE (Índice de Riesgo Empresario 0-100). Actualización incremental basada en evidencias sin sobrescritura ciega.
   - **PR-03: Master Plan Estratégico (MPE)**: Plan de acción priorizado en 5 Ejes (1. Gobernanza y Conducción, 2. Procesos y Operaciones, 3. Finanzas y Control de Gestión, 4. Talento y Personas, 5. Comercial y Expansión).
   - **Pentágono del Orden (PENT-PE)**: Medición de 0 a 10 en los 5 ejes, comparando Línea Base, Medición Actual y Meta Trienal.
   - **Medianera Conceptual**: Primero se mapea la cadena de valor y los procesos bajo ISO 9001, y recién después se diseña el organigrama de puestos para no acomodar la estructura a las personas actuales.
   - **Matriz de Riesgos (5x5)**: Probabilidad x Impacto, foco en riesgos inherentes críticos y planes de contingencia.
   - **Seguimiento Trimestral (3 Meses)**: Mediciones formales del Master Plan y remedición del Pentágono cada 90 días.

2. **SEGURIDAD Y AISLAMIENTO DE DATOS POR CLIENTE (REGLA INQUEBRANTABLE)**:
   - Tienes acceso completo a todas las transcripciones, grabaciones, diagnósticos e informes del cliente en consulta para comprender todo su contexto histórico.
   - **TIENES ESTRICTAMENTE PROHIBIDO MEZCLAR INFORMACIÓN ENTRE DISTINTOS ID_CLIENTE**.
   - Bajo ninguna circunstancia cruces, reveles, menciones o compares información, nombres, números o transcripciones pertenecientes a otro cliente. La confidencialidad entre empresas es absoluta y crítica.

3. **Acceso a la Base de Datos**:
   - Antes de responder sobre cualquier cliente, estado de proyecto, reuniones, minutas, diagnóstico o tareas, **CONSULTÁ SIEMPRE LAS TOOLS CORRESPONDIENTES**.
   - Traé datos reales: nombres exactos, números de IME, fechas de reuniones, responsables y estados.

4. **Generación de Archivos Excel (.xlsx) e Informes en PDF**:
   - Si el usuario solicita generar, armar, exportar o descargar un Excel o planilla de cálculo (ej: del Master Plan, de los Riesgos, del Diagnóstico, de las Reuniones), invocá la tool \`generate_excel_report\` con los datos formateados en filas y columnas limpias.
   - Si el usuario solicita un informe, reporte formal o documento en PDF (ej: resumen ejecutivo del diagnóstico, informe de madurez del pentágono, reporte de auditoría), invocá la tool \`generate_pdf_report\` con título, subtítulo, métricas clave (KPIs), secciones y tablas.
   - Además de invocar la tool, redactá en tu mensaje un resumen ejecutivo cordial informando que el archivo fue preparado y está disponible para descarga.
`

const tools: any = [
  {
    type: 'function',
    function: {
      name: 'query_quarterly_reviews',
      description: 'Consultar el historial de remediciones trimestrales (cada 3 meses) del Master Plan y evolución histórica del Pentágono del Orden.',
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
      description: 'Obtener historial de reuniones y audios. Puedes filtrar por organization_id.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          status: { type: 'string', description: 'Status de la reunión' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_minutes',
      description: 'Consultar contenido completo de las minutas oficiales y borradores.',
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
          min_level: { type: 'number', description: 'Nivel mínimo de riesgo inherente' }
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
      name: 'query_gobernanza',
      description: 'Consultar sesiones de auditoría grabadas, plantillas y entrevistas con IA.',
      parameters: {
        type: 'object',
        properties: {
          plantilla_id: { type: 'string', description: 'UUID de la plantilla' }
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
  },
  {
    type: 'function',
    function: {
      name: 'generate_excel_report',
      description: 'Generar una planilla de cálculo Excel (.xlsx) descargable con tablas de datos solicitadas.',
      parameters: {
        type: 'object',
        properties: {
          fileName: { type: 'string', description: 'Nombre del archivo .xlsx' },
          sheets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sheetName: { type: 'string' },
                headers: { type: 'array', items: { type: 'string' } },
                rows: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              },
              "required": ["sheetName", "headers", "rows"]
            }
          }
        },
        required: ["fileName", "sheets"]
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_pdf_report',
      description: 'Generar un informe ejecutivo en PDF estéticamente diseñado para presentación formal con métricas y tablas.',
      parameters: {
        type: 'object',
        properties: {
          fileName: { type: 'string', description: 'Nombre del archivo .pdf' },
          title: { type: 'string', description: 'Título del informe' },
          subtitle: { type: 'string', description: 'Subtítulo' },
          clientName: { type: 'string', description: 'Nombre del cliente' },
          consultantName: { type: 'string', description: 'Nombre del consultor o auditor' },
          date: { type: 'string', description: 'Fecha' },
          kpis: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
                change: { type: 'string' }
              },
              required: ["label", "value"]
            }
          },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                table: {
                  type: 'object',
                  properties: {
                    headers: { type: 'array', items: { type: 'string' } },
                    rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
                  }
                }
              },
              required: ["title"]
            }
          }
        },
        required: ["fileName", "title", "sections"]
      }
    }
  }
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { messages, organization_id } = await req.json()
    if (!messages) throw new Error('No messages provided')

    // Contexto de cliente activo y aislamiento multi-tenant
    let clientIsolationPrompt = ''
    let activeClientName = ''
    if (organization_id) {
      const { data: orgData } = await supabase.from('organizations').select('name').eq('id', organization_id).maybeSingle()
      activeClientName = orgData?.name || 'Cliente Asignado'
      clientIsolationPrompt = `\n\n[ATENCIÓN - POLÍTICA DE SEGURIDAD Y AISLAMIENTO MULTI-TENANT OBLIGATORIA]:
Estás operando EXCLUSIVAMENTE para el cliente: "${activeClientName}" (ID: ${organization_id}).
Tienes acceso a todas sus grabaciones, minutas, OMV, diagnósticos, Master Plan y remediciones trimestrales.
BAJO NINGUNA CIRCUNSTANCIA debes consultar, mezclar, filtrar ni revelar datos de ninguna otra empresa u organización. Todas las consultas a la base de datos deben quedar restringidas estrictamente a este cliente.`
    }

    const sysMsg = { role: 'system', content: BASE_SYSTEM_PROMPT + clientIsolationPrompt }
    const conversation = [sysMsg, ...messages]

    let generatedAttachment: any = null

    // Step 1: Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversation,
      tools: tools,
      tool_choice: 'auto'
    })

    let responseMessage = response.choices[0].message
    let stepCount = 0

    // Step 2: Handle tool calls with forced multi-tenant scoping
    while (responseMessage.tool_calls && stepCount < 6) {
      stepCount++
      conversation.push(responseMessage)

      for (const toolCall of responseMessage.tool_calls) {
        const name = toolCall.function.name
        const args = JSON.parse(toolCall.function.arguments || '{}')
        let toolResult = ''

        // Seguridad: El client_id activo tiene precedencia absoluta sobre argumentos
        const scopedOrgId = organization_id || args.organization_id

        try {
          if (name === 'query_organizations') {
            let q = supabase.from('organizations').select('*')
            if (scopedOrgId) {
              q = q.eq('id', scopedOrgId)
            } else {
              if (args.search) q = q.ilike('name', `%${args.search}%`)
              if (args.industry) q = q.eq('industry', args.industry)
            }
            const { data, error } = await q.limit(5)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          } 
          else if (name === 'query_meetings') {
            let q = supabase.from('meetings').select('*, organizations(*), minutes(*)')
            if (scopedOrgId) q = q.eq('organization_id', scopedOrgId)
            if (args.status) q = q.eq('status', args.status)
            const { data, error } = await q.order('meeting_date', { ascending: false }).limit(10)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_minutes') {
            let q = supabase.from('minutes').select('*, meetings(*, organizations(*))')
            if (args.meeting_id) q = q.eq('meeting_id', args.meeting_id)
            if (args.status) q = q.eq('status', args.status)
            if (scopedOrgId) q = q.eq('meetings.organization_id', scopedOrgId)
            const { data, error } = await q.order('created_at', { ascending: false }).limit(5)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_master_plan') {
            let q = supabase.from('master_plan_tasks').select('*')
            if (scopedOrgId) q = q.eq('organization_id', scopedOrgId)
            if (args.axis) q = q.eq('axis', args.axis)
            if (args.status) q = q.eq('status', args.status)
            const { data, error } = await q.order('axis').limit(25)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_quarterly_reviews') {
            let q = supabase.from('master_plan_quarterly_reviews').select('*')
            if (scopedOrgId) q = q.eq('organization_id', scopedOrgId)
            const { data, error } = await q.order('review_date', { ascending: false }).limit(10)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_pentagon_scores') {
            let q = supabase.from('pentagon_scores').select('*')
            if (scopedOrgId) q = q.eq('organization_id', scopedOrgId)
            const { data, error } = await q.order('measurement_date', { ascending: true })
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_risk_matrix') {
            let q = supabase.from('risk_matrix').select('*')
            if (scopedOrgId) q = q.eq('organization_id', scopedOrgId)
            if (args.min_level) q = q.gte('level_inherent', args.min_level)
            const { data, error } = await q.order('level_inherent', { ascending: false }).limit(20)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_diagnostic_360') {
            let q = supabase.from('diagnostic_360').select('*')
            if (scopedOrgId) q = q.eq('organization_id', scopedOrgId)
            const { data, error } = await q.order('version', { ascending: false }).limit(1).maybeSingle()
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_gobernanza') {
            let q = supabase.from('gobernanza_entrevistas').select('*')
            if (scopedOrgId) q = q.eq('client_id', scopedOrgId)
            const { data: entrevistas } = await q.order('created_at', { ascending: false }).limit(10)
            const { data: plantillas } = await supabase.from('gobernanza_plantillas').select('*').limit(5)
            toolResult = JSON.stringify({ entrevistas, plantillas })
          }
          else if (name === 'query_manual') {
            toolResult = MANUAL_PROCEDIMIENTOS
          }
          else if (name === 'generate_excel_report') {
            generatedAttachment = {
              type: 'excel',
              fileName: args.fileName || 'Reporte_Consultora_GS.xlsx',
              options: args
            }
            toolResult = 'OK: Archivo Excel preparado exitosamente para descarga por el usuario.'
          }
          else if (name === 'generate_pdf_report') {
            generatedAttachment = {
              type: 'pdf',
              fileName: args.fileName || 'Informe_Consultora_GS.pdf',
              options: args
            }
            toolResult = 'OK: Informe PDF generado exitosamente para descarga por el usuario.'
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

      // Next step
      const nextResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: conversation,
        tools: tools,
        tool_choice: 'auto'
      })
      responseMessage = nextResponse.choices[0].message
    }

    return new Response(JSON.stringify({ 
      reply: responseMessage.content,
      attachment: generatedAttachment 
    }), {
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
