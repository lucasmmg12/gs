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

const MODEL_CASCADE = [
  Deno.env.get('OPENAI_MODEL'),
  'gpt-5.5',
  'gpt-5.4',
  'gpt-4.1',
  'gpt-4o'
].filter(Boolean) as string[]

async function createCompletionWithCascade(params: any) {
  let lastError: any = null
  for (const model of MODEL_CASCADE) {
    try {
      const response = await openai.chat.completions.create({ ...params, model })
      return { response, modelUsed: model }
    } catch (err: any) {
      lastError = err
      console.warn(`[growy-chat] Model ${model} unavailable, trying next:`, err?.message)
    }
  }
  throw lastError || new Error('All AI models in cascade failed')
}

const BASE_SYSTEM_PROMPT = `Sos "Growy", el asistente de IA experto (Familia GPT-5.5+), copiloto metodológico y analista de datos de Consultora GS (Grow Labs · Sanatorio Argentino).
Hablás en español profesional, analítico y cercano (usando voseo argentino cuando sea natural).

## TU ROL Y CAPACIDADES:
1. **Conocimiento Total del Sistema y Metodología GS**:
   - **PR-01: Gestión de Reuniones y Minutas**: Ciclo Recibido → Borrador → Pendiente de revisión → Aprobado → Publicado. Ningún contenido generado por IA se publica al cliente sin aprobación de un consultor humano.
   - **PR-02: Diagnóstico Integral 360°**: 10 áreas, 100 preguntas clave (Q1 a Q100). Taxonomía de preguntas: abiertas cualitativas (open_diagnostic), de nivelación estructurada (maturity_level) y con indicadores numéricos (indicator). Actualización incremental automática basada en evidencias del audio sin sobrescritura ciega.
   - **PR-03: Objetivo Más Bárbaro (OMB - Visión a 3 años)**: Visión trienal consensuada entre socios. Gestión estricta de versiones (Rev A, Rev B... hasta Rev 0 aprobada definitiva). Consolidación de visiones divergentes de socios y podcasts/audios explicativos por revisión.
   - **PR-04: Cierre de Sesión y Filtro Humano (Human-in-the-Loop)**: Mitigación del ~15% de margen de error de la IA. Todas las sugerencias detectadas deben incluir cita textual exacta y nivel de confianza. Requieren validación del consultor humano antes de impactar el diagnóstico oficial.
   - **PR-05: Pentágono del Orden y Evolución Matemática de Madurez**: 5 Ejes (Gobernanza, Procesos, Finanzas, Talento, Comercial) en escala 0 a 10. La evolución no es subjetiva, sino matemática: ΔEje = (10 - Base) × ∑(% Incidencia_i × % Avance_i), con suma de incidencias por eje igual al 100%.
   - **PR-06: Medianera Conceptual**: Primero se diseñan los procesos de la cadena de valor bajo ISO 9001 (organigrama de puestos), y recién después se analiza a las personas para no sesgar la estructura empresarial.
   - **PR-07: Gestor Documental y RAG Aislado**: Documentos de auditoría, balances y manuales organizados por alcance (Global, por Área del diagnóstico 1..10, o Pregunta específica) con aislamiento absoluto por client_id.
   - **PR-08: Personalización de Prompts y Criterios del Consultor**: Adaptación a directivas específicas del equipo consultor (rol, arquetipo de consultoría, adaptaciones sectoriales agro/industria/servicios).

2. **SEGURIDAD Y AISLAMIENTO DE DATOS POR CLIENTE (REGLA INQUEBRANTABLE)**:
   - Tienes acceso completo a todas las transcripciones, grabaciones, diagnósticos, OMB, documentos e informes del cliente en consulta.
   - **TIENES ESTRICTAMENTE PROHIBIDO MEZCLAR O REVELAR INFORMACIÓN ENTRE DISTINTOS ID_CLIENTE**.
   - Bajo ninguna circunstancia cruces, reveles, menciones o compares información, nombres, números o transcripciones pertenecientes a otro cliente. La confidencialidad entre empresas es absoluta y crítica.

3. **Acceso a la Base de Datos**:
   - Antes de responder sobre cualquier cliente, estado de proyecto, reuniones, minutas, diagnóstico o tareas, **CONSULTÁ SIEMPRE LAS TOOLS CORRESPONDIENTES**.
   - Traé datos reales: nombres exactos, números de IME, fechas de reuniones, revisiones de OMB, responsables y estados.

4. **Generación de Archivos Excel (.xlsx) e Informes en PDF**:
   - Si el usuario solicita generar, armar, exportar o descargar un Excel (ej: del Master Plan ponderado, de los Riesgos, del Diagnóstico, de las Reuniones), invocá la tool \`generate_excel_report\` con los datos formateados en filas y columnas limpias.
   - Si el usuario solicita un informe formal o documento en PDF (ej: resumen ejecutivo del diagnóstico, informe de madurez del pentágono, reporte de auditoría), invocá la tool \`generate_pdf_report\` con título, subtítulo, métricas clave (KPIs), secciones y tablas.
`

const tools: any = [
  {
    type: 'function',
    function: {
      name: 'query_omb_revisions',
      description: 'Consultar el historial de versiones del OMB (Objetivo Más Bárbaro - Visión a 3 años), visiones de socios, podcast/audio asociado y estado de revisión (Rev A, Rev B, Rev 0).',
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
      name: 'synthesize_omb_visions',
      description: 'Sintetizar y unificar las declaraciones o visiones estratégicas de múltiples socios en una redacción consolidada de OMB (Objetivo Más Bárbaro).',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          partner_visions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                partner_name: { type: 'string' },
                vision_text: { type: 'string' }
              },
              required: ['partner_name', 'vision_text']
            },
            description: 'Lista de visiones individuales de cada socio o directivo'
          }
        },
        required: ['partner_visions']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_client_documents',
      description: 'Consultar el repositorio documental RAG del cliente: manuales de procesos, balances, estatutos, clasificables por ámbito (global, por área 1..10 o por pregunta).',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          scope_type: { type: 'string', enum: ['global', 'area', 'question'], description: 'Ámbito del documento' },
          area_id: { type: 'string', description: 'Identificador del área diagnóstica (ej: area_3_operaciones)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_weighted_actions_and_pentagon_math',
      description: 'Consultar las acciones del Master Plan con sus porcentajes de incidencia (% inc) por eje y calcular la evolución matemática exacta del Pentágono según la fórmula GS: ΔEje = (10 - Base) × ∑(% Incidencia_i × % Avance_i).',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          axis_id: { type: 'string', description: 'Identificador del eje (gobernanza, procesos, finanzas, talento, comercial)' }
        }
      }
    }
  },
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
      description: 'Obtener historial de reuniones, audios y sesiones de tutoría.',
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
      description: 'Consultar contenido completo de las minutas oficiales y borradores con su tabla de compromisos.',
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
      description: 'Consultar tareas, hitos y avance general del Master Plan Estratégico (MPE).',
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
      description: 'Consultar el Pentágono del Orden y mediciones de madurez estratégica (IME 0-10) en los 5 ejes.',
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
      description: 'Consultar la Matriz de Riesgos Organizacionales (código, probabilidad, impacto, nivel y mitigación).',
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
      description: 'Consultar el Diagnóstico 360°, OMB, respuestas en las 10 áreas y puntajes IME/IRE.',
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
      name: 'query_system_prompts',
      description: 'Consultar los prompts, roles y directivas metodológicas personalizadas configuradas para el consultor o cliente.',
      parameters: {
        type: 'object',
        properties: {
          organization_id: { type: 'string', description: 'UUID de la organización' },
          role: { type: 'string', description: 'Rol del prompt (ej: consultant_copilot)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_gobernanza',
      description: 'Consultar sesiones de auditoría grabadas, plantillas y entrevistas de gobernanza.',
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
      description: 'Obtener información del Manual Metodológico GS (PR-01 a PR-08: reuniones, OMB, filtro humano, pentágono matemático, RAG).',
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
              required: ["sheetName", "headers", "rows"]
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
    let dynamicCustomPrompt = ''

    if (organization_id) {
      const { data: orgData } = await supabase.from('organizations').select('name, industry').eq('id', organization_id).maybeSingle()
      activeClientName = orgData?.name || 'Cliente Asignado'
      clientIsolationPrompt = `\n\n[ATENCIÓN - POLÍTICA DE SEGURIDAD Y AISLAMIENTO MULTI-TENANT OBLIGATORIA]:
Estás operando EXCLUSIVAMENTE para el cliente: "${activeClientName}" (ID: ${organization_id}, Industria: ${orgData?.industry || 'General'}).
Tienes acceso a todas sus grabaciones, minutas, OMB (Objetivo Más Bárbaro), diagnósticos, Master Plan con acciones ponderadas y documentos RAG.
BAJO NINGUNA CIRCUNSTANCIA debes consultar, mezclar, filtrar ni revelar datos de ninguna otra empresa u organización. Todas las consultas a la base de datos deben quedar restringidas estrictamente a este cliente.`

      // Carga dinámica de prompts del consultor para este cliente o rol global
      try {
        const { data: customPrompts } = await supabase
          .from('system_prompts')
          .select('*')
          .or(`organization_id.eq.${organization_id},organization_id.is.null`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3)

        if (customPrompts && customPrompts.length > 0) {
          dynamicCustomPrompt = `\n\n[DIRECTIVAS Y CRITERIOS PERSONALIZADOS DEL EQUIPO CONSULTOR]:\n` + 
            customPrompts.map((p: any) => `### ${p.title} (${p.role}):\n${p.prompt_text}`).join('\n\n')
        }
      } catch (promptErr) {
        console.warn('Could not load custom system prompts:', promptErr)
      }
    }

    const sysMsg = { role: 'system', content: BASE_SYSTEM_PROMPT + clientIsolationPrompt + dynamicCustomPrompt }
    const conversation = [sysMsg, ...messages]

    let generatedAttachment: any = null

    // Step 1: Call OpenAI (GPT-5.5+ Cascade)
    const { response } = await createCompletionWithCascade({
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
          if (name === 'query_omb_revisions') {
            let q = supabase.from('client_omb_revisions').select('*')
            if (scopedOrgId) q = q.eq('client_id', scopedOrgId)
            const { data, error } = await q.order('created_at', { ascending: true })
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'synthesize_omb_visions') {
            const partnerVisions = args.partner_visions || []
            const combinedStatements = partnerVisions.map((pv: any) => `• ${pv.partner_name}: "${pv.vision_text}"`).join('\n')
            
            const { response: synthesisCompletion } = await createCompletionWithCascade({
              messages: [
                {
                  role: 'system',
                  content: 'Sos el facilitador metodológico senior de Consultora GS. Unificá las visiones expresadas por los socios en una propuesta de OMB (Objetivo Más Bárbaro - Visión a 3 años) inspiradora, medible, desafiante y con indicadores cuantitativos claros.'
                },
                {
                  role: 'user',
                  content: `Perspectivas de los socios para la empresa:\n${combinedStatements}\n\nGenerá la redacción sintética del OMB (3 párrafos estructurados) y 3 KPIs clave trienales.`
                }
              ]
            })

            toolResult = JSON.stringify({
              synthesis_text: synthesisCompletion.choices[0].message.content,
              input_partner_count: partnerVisions.length
            })
          }
          else if (name === 'query_client_documents') {
            let q = supabase.from('client_documents').select('*')
            if (scopedOrgId) q = q.eq('client_id', scopedOrgId)
            if (args.scope_type) q = q.eq('scope_type', args.scope_type)
            if (args.area_id) q = q.eq('area_id', args.area_id)
            const { data, error } = await q.order('created_at', { ascending: false }).limit(20)
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_weighted_actions_and_pentagon_math') {
            let q = supabase.from('master_plan_weighted_actions').select('*')
            if (scopedOrgId) q = q.eq('client_id', scopedOrgId)
            if (args.axis_id) q = q.eq('axis_id', args.axis_id)
            const { data: actions, error } = await q.order('axis_id')

            if (error) {
              toolResult = `Error: ${error.message}`
            } else {
              // Fetch baseline pentagon
              const { data: pentagonData } = await supabase
                .from('pentagon_scores')
                .select('*')
                .eq('organization_id', scopedOrgId)
                .order('measurement_date', { ascending: true })
                .limit(1)
                .maybeSingle()

              const baselineScores = pentagonData?.scores || {
                gobernanza: 4.2,
                procesos: 3.5,
                finanzas: 4.0,
                talento: 3.8,
                comercial: 4.5
              }

              // Group actions by axis
              const axesSummary: Record<string, any> = {}
              const axesList = ['gobernanza', 'procesos', 'finanzas', 'talento', 'comercial']

              for (const axis of axesList) {
                const axisActions = (actions || []).filter((a: any) => a.axis_id === axis)
                const base = Number(baselineScores[axis] || 4.0)
                const totalIncidence = axisActions.reduce((sum: number, a: any) => sum + Number(a.weight_percentage || 0), 0)
                const effectiveProgressContribution = axisActions.reduce((sum: number, a: any) => {
                  const inc = Number(a.weight_percentage || 0) / 100
                  const prog = Number(a.progress_percentage || 0) / 100
                  return sum + (inc * prog)
                }, 0)

                const delta = (10 - base) * effectiveProgressContribution
                const calculatedScore = Math.min(10, Number((base + delta).toFixed(2)))

                axesSummary[axis] = {
                  baseline_score: base,
                  current_calculated_score: calculatedScore,
                  delta: Number(delta.toFixed(2)),
                  total_incidence_percentage: totalIncidence,
                  is_incidence_balanced_100: Math.abs(totalIncidence - 100) < 0.1,
                  actions_count: axisActions.length,
                  actions: axisActions
                }
              }

              toolResult = JSON.stringify({
                methodology: 'Fórmula GS: Delta = (10 - Base) * SUM(Incidencia% * Avance%)',
                summary: axesSummary
              })
            }
          }
          else if (name === 'query_system_prompts') {
            let q = supabase.from('system_prompts').select('*')
            if (scopedOrgId) q = q.or(`organization_id.eq.${scopedOrgId},organization_id.is.null`)
            if (args.role) q = q.eq('role', args.role)
            const { data, error } = await q.order('created_at', { ascending: false })
            toolResult = error ? `Error: ${error.message}` : JSON.stringify(data)
          }
          else if (name === 'query_organizations') {
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
      const { response: nextResponse } = await createCompletionWithCascade({
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
