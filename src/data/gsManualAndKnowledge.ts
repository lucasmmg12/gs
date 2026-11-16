export interface ManualGuideItem {
  id: string;
  title: string;
  category: 'consultor' | 'cliente' | 'entregables' | 'tutorial' | 'tecnico';
  readTime: string;
  summary: string;
  steps?: { title: string; desc: string; tip?: string }[];
  contentSections?: { heading: string; body: string; alert?: string }[];
  tags: string[];
}

export const MANUAL_OFICIAL_COMPLETO_GS = `
# MANUAL OPERATIVO INTEGRAL v3.0 — PLATAFORMA ESTUDIO GS CONSULTORA (GROW LABS)

Este manual constituye la base de conocimiento maestra de **Growy** y el protocolo operativo oficial para los **2 perfiles de usuario** de la plataforma:
1. **Equipo Consultor Estudio GS (Back-Office Multicartera)**
2. **Empresa Cliente — Socios y Directorio (Portal Ejecutivo Aislado Multi-Tenant)**

---

## SECTOR 1: ARQUITECTURA DE ROLES, PRIVACIDAD Y SEMÁFORO DE CALIDAD GS
1. **Separación Estricta de Entornos**:
   - **Usuario Consultor GS**: Accede al directorio completo de clientes (\`/clients\`), graba sesiones, administra Etapa 0 comercial, edita prompts maestros (\`/settings\`), valida sugerencias de IA (Filtro Humano) y gobierna qué ve cada cliente.
   - **Usuario Cliente**: Ingresa exclusivamente a \`/portal/:id\` mediante correo corporativo o **Código Corporativo de Acceso** (ej. \`GS-EJEMPL-2026\`). Tiene bloqueo duro multi-tenant: jamás puede ver otra empresa, ni presupuestos de Etapa 0, ni prompts internos, ni borradores en Rojo.
2. **Semáforo de Gobernanza GS (Rojo vs. Verde)**:
   - **ROJO (En Revisión Interna / Borrador)**: Visible únicamente para Consultores GS. En el Portal del Cliente aparece bloqueado con sello *"En Auditoría GS"*.
   - **VERDE (Aprobado y Publicado)**: Habilita instantáneamente la visualización y descarga oficial en el Portal del Cliente, con opción de disparo de aviso por WhatsApp en 1 clic.

---

## SECTOR 2: FLUJO PASO A PASO DEL CONSULTOR GS (ETAPAS 0 A 4)

### Etapa 0 — Relevamiento Comercial & Propuesta Pre-Kickoff (\`/clients/:id/relevamiento\`)
- **Cuándo se usa**: Primera llamada o entrevista exploratoria para conocer dolores del dueño antes de presupuestar.
- **Qué hace el consultor**:
  1. Asigna el **Código Oficial de Proyecto GS** (ej. \`26-030\`), que dará nombre a todos los archivos Word y Excel exportados.
  2. Graba o resume la entrevista inicial, documenta los dolores declarados, alcance propuesto y honorarios mensuales.
  3. Cuando el cliente aprueba el presupuesto, pulsa **"Presupuesto Aprobado → Generar Kickoff"**, pasando automáticamente el expediente a Etapa 1.
- **Confidencialidad**: Toda la Etapa 0 se guarda cifrada/aislada en Supabase bajo clave interna y jamás se expone al Portal del Cliente.

### Etapa 1 — Kickoff, OMV en Tiempo Presente y 8 Valores TARGET CVA (\`/clients/:id/omb\`)
- **Marco Metodológico CVA (*Construir desde el Valor Aspirado*)**:
  1. Se registran las visiones individuales de cada socio fundador y se consolidan (con asistencia de Growy) en el **OMV (Objetivo Material Visualizado)** redactado obligatoriamente en **tiempo presente** ("situación vivida a 3 años").
  2. Se completan los **8 Valores TARGET a 3 Años** (Facturación anual, Margen neto, Dotación total, Proyectos simultáneos, Mix de líneas de negocio, Fondo de reserva, Rol del titular y Ventaja competitiva).
  3. Evoluciona por versiones (\`Rev A\`, \`Rev B\` durante el diagnóstico) hasta fijarse como **Línea Base \`Rev 0\`**, acompañada de su Podcast inmersivo MP3.

### Etapa 2 — Sesiones de Audio (Texto Plano) y Diagnóstico Integral 360° (\`/clients/:id/diagnostic\`)
- **Regla Operativa de Grabación**: El motor transcribe voz continua en **texto plano sin separación de timbres (sin diarización)**. Al iniciar, el sistema exhibe la nota aclaratoria para hablar sin superponer voces y nombrar responsables explícitamente.
- **Automatización + Filtro Humano**:
  1. Al finalizar el audio (o subir un \`.mp3/.wav/.m4a\`), la IA cruza la charla contra las **100 preguntas de las 10 áreas**, sugiere nivel de madurez con cita textual exacta y redacta el borrador de Minuta.
  2. En el formulario 360°, el consultor dispone por cada pregunta de: **selector estructurado de madurez + cuadro narrativo abierto + tablas de KPIs cuantitativos por área**.
  3. Todo cambio se guarda automáticamente en la Base de Datos PostgreSQL (Supabase).

### Etapa 3 — Cierre Diagnóstico, Matrices FODA/PESTEL/Porter e Indicadores IME & IRE (\`/clients/:id/matrices\`)
- Al cerrar las 8–10 sesiones diagnósticas, el consultor cambia el estado a **3. Diagnóstico Cerrado** (ocultando banners de relevamiento en curso).
- **Cálculo Matemático Oficial**:
  - **IME (Índice de Madurez Empresarial)**: Ponderado en 9 áreas troncales (= 100%) y proyectado en escala 0–10 sobre el Pentágono del Orden.
  - **IRE (Índice de Riesgo Empresario)**: Calculado sobre 12 dimensiones estructurales ponderadas (= 100%, donde R1 Dependencia del dueño pesa 15% y R2 Concentración de clientes pesa 12%) + Matriz de 27 Riesgos (\`R-01\`..\`R-27\`) Inherentes vs. Residuales.
- **Exportación Oficial**: Botón **Word 360° Oficial (\`.DOCX\`)** que descarga \`GS_Diagnostico_360_<EMPRESA>.docx\` con las 8 escalas Likert \`☐\`/\`☒\` y todas las tablas oficiales.

### Etapa 4 — Master Plan Estratégico, Puente \`AVANCE-EJES\` y Seguimiento Trimestral (\`/clients/:id/master-plan\`)
- Organizado en los **5 Ejes del Pentágono**: 1. Gobernanza, 2. Procesos, 3. Finanzas, 4. Talento, 5. Comercial.
- **Cabecera Estratégica por Eje**: El consultor define y edita **Brecha Asociada**, **Iniciativa Estratégica Rectora** y **OKRs** de cada eje.
- **Fórmula Matemática Determinística**:
  $$\\Delta \\text{Eje} = (10 - \\text{Base}) \\times \\sum_{i=1}^{n} (\\% \\text{Incidencia}_i \\times \\% \\text{Avance}_i)$$
  La suma de incidencias por eje equivale al **100%**. El panel **Puente \`AVANCE-EJES\`** verifica la coherencia \`MPE ↔ PENT-PE\` (tolerancia metodológica \`±0,5 pp\`).
- **Validación Humana de Avances del Cliente**: Cuando el cliente reporta avances desde su Portal, aparecen en la **Bandeja Amarilla de Validación** del consultor para aprobarlos e impactarlos con 1 clic.

---

## SECTOR 3: EXPERIENCIA Y AUTOGESTIÓN DEL CLIENTE EN SU PORTAL (\`/portal/:id\`)
El socio o director de la PyME no es un espectador pasivo; cuenta con **6 herramientas de autogestión conectadas en vivo a Supabase**:
1. **Lectura Ejecutiva Validada (Semáforo Verde)**: Consulta su OMV \`Rev 0\` + los 8 Valores TARGET a 3 años, su Pentágono del Orden (Línea Base vs. Actual vs. Meta) y sus Minutas Oficiales aprobadas.
2. **Descarga Nativa de Entregables Oficiales**:
   - **Master Plan Workbook Oficial (\`.XLSX\` — 6 Hojas con Fórmulas Vivas)**.
   - **Minutas de Seguimiento Oficiales (\`.DOCX\`)** y PDF.
   - **Informe de Diagnóstico Integral 360° (\`.DOCX\`)** y PDF.
3. **Co-Gestión de Tareas del Master Plan (*"Reportar Avance"*)**: En cualquier tarea asignada a su equipo, el cliente propone cambio de estado (\`EN PROCESO\`, \`FINALIZADO\`, \`RETRASADO\`) y adjunta evidencia escrita. Queda guardado en Supabase y notifica al consultor GS para su validación.
4. **Autogestión Documental (*"Subir Documento / Evidencia"*)**: El cliente sube balances, flujos de caja, organigramas o procedimientos directamente desde la pestaña Documentos de su portal hacia la base documental aislada de su empresa.
5. **Autoevaluación Mensual del Directorio**: Antes de cada sesión mensual, los socios responden las 4 preguntas termómetro de delegación, caja y foco estratégico; las respuestas llegan directo al expediente del consultor.
6. **Preparador de Reuniones Clave con IA + Generador Comercial IA**:
   - En **Preparar Reunión IA**, el dueño elige el tipo de mesa (*Directorio / Socios*, *Cliente Corporativo*, *Mandos Medios* o *Banco / Financiamiento*), indica contraparte y objetivo, y descarga un **Brief Ejecutivo en Word (\`.DOCX\`)** cruzado con su OMV, Riesgos y Master Plan.
   - En **Generador IA**, redacta Propuesta de Valor, Brochure o Pitch Comercial de 3 minutos alineado a su diagnóstico.

---

## SECTOR 4: ESTÁNDAR DE LOS 4 ENTREGABLES OFICIALES EXPORTABLES
1. **\`<Codigo>-<EMPRESA>-Master_Plan_Estrategico_Revd.xlsx\`**: Libro Excel de **6 hojas interconectadas con fórmulas reales** (\`PORTADA\`, \`MPE\`, \`AVANCE-EJES\`, \`PENT-PE\`, \`MATRIZ DE RIESGOS\`, \`DATOS_PENT\`) y diagrama Gantt de 41 meses (\`Ago 2026 – Dic 2029\`).
2. **\`<Codigo>-<EMPRESA>-Minuta_de_Seguimiento_Rev0.docx\`**: Documento Word nativo con encabezado institucional continuo, tabla de metadatos de 4 filas (separando asistentes *Consultora GS* vs *Cliente*), \`TEMAS TRATADOS\`, tabla \`LOGÍSTICA Y PRÓXIMOS PASOS\` y cierre \`Reflexión:\`.
3. **\`GS_Diagnostico_360_<EMPRESA>.docx\`**: Formulario Word completo con ficha de 7 filas, OMV CVA + 8 Targets, 10 áreas con respuestas narrativas + 8 escalas Likert \`☐\`/\`☒\` + KPIs por área, matriz IRE (12 dimensiones) y tabla IME (9 áreas).
4. **\`Brief_Reunion_<EMPRESA>.docx\`**: Hoja de ruta ejecutiva en Word para preparar reuniones decisivas del dueño.

---

## SECTOR 5: CENTRO DE PROMPTS IA (\`/settings\`) Y GARANTÍA DE BASE DE DATOS
- En **Prompts IA & Config. GS (\`/settings\`)**, los consultores editan y versionan en Supabase (\`system_prompts\`) los 6 prompts maestros del sistema (*Relevamiento Comercial*, *Sintetizador OMV*, *Extractor Diagnóstico 100 Preguntas*, *Generador de Minutas*, *Arquitecto Master Plan* y *Copiloto de Reuniones del Dueño*) y eligen motor principal (**OpenAI** o **Anthropic Claude**).
- **Garantía de Persistencia Total**: Todos los módulos sincronizan en tiempo real contra PostgreSQL en Supabase (\`organizations\`, \`diagnostic_responses\`, \`omv_modules\`, \`client_omb_revisions\`, \`master_plan_tasks\`, \`quality_approvals\`, \`client_documents\`, \`client_portal_activities\`, \`system_prompts\` y estado consolidado en \`configuraciones\`), exhibiendo el sello verde **Respaldado en Base de Datos ✓**.
`;

export const UPDATED_KNOWLEDGE_GUIDES: ManualGuideItem[] = [
  {
    id: 'ruta-consultor-paso-a-paso',
    title: 'Guía Maestra del Consultor GS: Flujo Completo Etapas 0 a 4',
    category: 'consultor',
    readTime: '7 min',
    summary:
      'Recorrido operativo completo del consultor desde la entrevista comercial (Etapa 0) hasta el seguimiento trimestral del Master Plan y liberación al Portal del Cliente.',
    tags: ['Consultor', 'Etapa 0 a 4', 'Semáforo Verde', 'OMV', 'Master Plan'],
    steps: [
      {
        title: 'Etapa 0: Relevamiento Comercial y Código de Proyecto',
        desc: 'Ingrese al cliente y abra la pestaña "0. Relevamiento & Propuesta". Asigne el Código GS (ej. 26-030), grabe la charla exploratoria, registre dolores y honorarios. Al aprobarse, pulse "Presupuesto Aprobado → Generar Kickoff".',
        tip: 'Nada de la Etapa 0 es visible jamás para el cliente; es uso interno confidencial de Estudio GS.',
      },
      {
        title: 'Etapa 1: Kickoff, OMV en Presente y 8 Valores TARGET CVA',
        desc: 'En "1. Kickoff & OMV", cargue las visiones individuales de los socios, pulse "Unificar Visiones con Growy IA", complete la subpestaña "Valores TARGET a 3 Años (8 KPIs CVA)" y suba el Podcast MP3.',
        tip: 'Durante el diagnóstico iterará como Rev A / Rev B. Al consensuar la visión final, fíjela como Rev 0.',
      },
      {
        title: 'Etapa 2: Sesiones de Audio y Diagnóstico 360° (100 Preguntas)',
        desc: 'Use "Grabar / Subir Audio Ahora". El sistema transcribe en texto plano continuo, responde automáticamente las preguntas detectadas con cita textual y arma la minuta. Complete narrativas y KPIs por área en "2. Diagnóstico 360°".',
        tip: 'Recuerde la regla de oro de grabación: hablar de a uno sin pisarse y mencionar nombres al asignar tareas.',
      },
      {
        title: 'Etapa 3: Cierre Diagnóstico, Matrices e Informe Word 360°',
        desc: 'Cambie la etapa a "3. Diagnóstico Cerrado", revise "3. Matrices & Riesgos" (FODA, PESTEL, Porter, IME/IRE) y descargue el documento oficial con el botón "Word 360° Oficial (.DOCX)".',
        tip: 'Cuando esté auditado internamente, pase el semáforo de Diagnóstico a VERDE para habilitarlo en el Portal Cliente.',
      },
      {
        title: 'Etapa 4: Master Plan, Puente AVANCE-EJES y Validación de Avances',
        desc: 'En "4. Master Plan", edite Brecha, Iniciativa y OKRs de cada eje, revise la Bandeja Amarilla de avances reportados por el cliente, verifique coherencia MPE ↔ PENT-PE y exporte el "Workbook Oficial GS (.XLSX — 6 Hojas)".',
        tip: 'Recuerde que ningún reporte de avance del cliente modifica el Pentágono oficial hasta que usted pulse "Validar e Impactar".',
      },
    ],
  },
  {
    id: 'autogestion-cliente-portal',
    title: 'Manual de Autogestión del Cliente: Cómo Usar el Portal Ejecutivo',
    category: 'cliente',
    readTime: '6 min',
    summary:
      'Instructivo didáctico para Socios y Directores de la empresa cliente: acceso seguro, lectura de indicadores, reporte de avances, subida de documentos y preparación de reuniones con IA.',
    tags: ['Portal Cliente', 'Autogestión', 'Reportar Avance', 'Preparar Reunión IA'],
    steps: [
      {
        title: '1. Ingreso Aislado por Código Corporativo o Credenciales',
        desc: 'Entre al enlace enviado por su consultor GS (/portal/su-id) o desde /login eligiendo "Portal de Clientes" e ingresando su Código Corporativo (ej. GS-EJEMPL-2026).',
        tip: 'Su sesión está blindada: solo accede a los entregables aprobados en Verde de su propia organización.',
      },
      {
        title: '2. Consulta de Norte Estratégico (OMV + 8 Targets + Pentágono)',
        desc: 'En "Visión 2029 (OMV)" revise la declaración en tiempo presente y las 8 metas numéricas a 3 años. En "Pentágono & Evolución" controle su madurez IME (0-10) y reducción de riesgo IRE.',
        tip: 'Utilice esta pantalla como apertura fija en sus reuniones mensuales de Directorio.',
      },
      {
        title: '3. Co-Gestión Semanal en el Master Plan ("Reportar Avance")',
        desc: 'En la pestaña "Master Plan", ubique las tareas bajo su responsabilidad, pulse "Reportar Avance", indique el estado propuesto (En Proceso / Finalizado) y escriba una breve evidencia.',
        tip: 'Su reporte se guarda en la Base de Datos al instante y le aparece a su consultor GS para validarlo en la siguiente sesión.',
      },
      {
        title: '4. Subida de Documentación y Autoevaluación Mensual',
        desc: 'En "Documentos" suba balances, organigramas o planillas solicitadas por GS. En "Autoevaluación" complete las 4 preguntas termómetro antes de cada comité mensual.',
        tip: 'También puede abrir a Growy (abajo a la derecha) en cualquier momento para pedirle explicaciones sobre sus indicadores o tareas.',
      },
      {
        title: '5. Preparador de Reuniones Clave con IA + Descargas Word/Excel',
        desc: 'Antes de reunirse con socios, bancos, clientes corporativos o mandos medios, abra "Preparar Reunión IA", genere su hoja de ruta estratégica y descárguela en Word (.DOCX).',
        tip: 'En Minutas, Diagnóstico y Master Plan dispone siempre de botones de descarga directa en formatos oficiales .DOCX y .XLSX de 6 hojas.',
      },
    ],
  },
  {
    id: 'estandar-4-entregables-gs',
    title: 'Especificación de los 4 Entregables Oficiales Exportables (.XLSX y .DOCX)',
    category: 'entregables',
    readTime: '5 min',
    summary:
      'Detalle técnico y metodológico de los 4 archivos nativos de Microsoft Excel y Word que genera la plataforma cumpliendo el estándar documental de Estudio GS.',
    tags: ['Excel 6 Hojas', 'Word Oficial', 'Fórmulas Vivas', 'Gantt', 'Likert'],
    contentSections: [
      {
        heading: '1. Master Plan Estratégico Workbook (.XLSX — 6 Hojas con Fórmulas)',
        body: 'Contiene exactamente las 6 pestañas oficiales: PORTADA (ficha e índice), MPE (5 ejes con Brecha, Iniciativa, OKRs, jerarquía Iniciativa/Acción, Incidencia % = 100%, Avance % y Gantt de 41 meses Ago 2026–Dic 2029), AVANCE-EJES (puente matemático con control de coherencia ±0,5 pp), PENT-PE (evolución trimestral LB..M8..META), MATRIZ DE RIESGOS (27 riesgos inherentes/residuales y mapa de calor COUNTIFS) y DATOS_PENT.',
        alert: 'Todas las celdas de totales, promedios y semáforos se exportan con fórmulas nativas de Excel vivas, listas para editar en escritorio.',
      },
      {
        heading: '2. Minuta de Seguimiento Oficial (.DOCX — Rev0)',
        body: 'Documento Word nativo con encabezado institucional en cada página, tabla superior de 4 filas (Título, Fecha, Motivo y Asistentes divididos en Consultora GS vs. Empresa Cliente), desarrollo numerado de TEMAS TRATADOS, tabla de 3 columnas LOGÍSTICA Y PRÓXIMOS PASOS (Responsable | Tema a tratar | Fecha de entrega) y bloque final Reflexión.',
      },
      {
        heading: '3. Formulario de Diagnóstico Integral 360° (.DOCX — v2.0)',
        body: 'Incluye tabla de identificación de 7 filas con Código Cliente, Pregunta Central CVA (OMV en presente) + Tabla de 8 Valores TARGET a 3 años, las 10 áreas con respuestas narrativas + 8 escalas Likert 1–5 con casilleros ☐/☒ marcados + 10 tablas de KPIs por área, cierre reflexivo, Matriz IRE ponderada (12 dimensiones = 100%) y Tabla IME por área (9 áreas = 100%).',
      },
      {
        heading: '4. Brief Ejecutivo de Preparación de Reunión (.DOCX)',
        body: 'Entregable exclusivo del Portal del Cliente para que el dueño entre a negociaciones o directorios con agenda de 45 minutos, argumentos anclados en su OMV, alertas de caja/riesgo y preguntas de cierre con responsable único.',
      },
    ],
  },
  {
    id: 'arquitectura-bd-y-growy',
    title: 'Garantía de Persistencia en Base de Datos, Prompts IA y Cerebro Growy',
    category: 'tecnico',
    readTime: '5 min',
    summary:
      'Cómo funciona el respaldo automático en PostgreSQL (Supabase), el Centro de Prompts IA (/settings) y la asistencia contextual de Growy en modo Consultor y modo Cliente.',
    tags: ['Supabase BD', 'Growy IA', 'Prompts', 'Multi-tenant', 'Seguridad'],
    contentSections: [
      {
        heading: '1. Garantía de Guardado en Tiempo Real en Base de Datos',
        body: 'Cada acción del consultor o autogestión del cliente impacta automáticamente en PostgreSQL (Supabase): tablas relacionales (organizations, diagnostic_responses, omv_modules, client_omb_revisions, master_plan_tasks, quality_approvals, client_documents, client_portal_activities, system_prompts) más sincronización consolidada multi-dispositivo. El indicador "Respaldado en Base de Datos ✓" confirma cada escritura.',
        alert: 'Lo que el cliente reporta en su celular o notebook aparece al instante en el Back-Office del consultor, y lo que el consultor aprueba en Verde se actualiza al instante en el Portal del Cliente.',
      },
      {
        heading: '2. Growy Copiloto Dual (Modo Consultor vs. Modo Cliente)',
        body: 'Growy está entrenado con la totalidad de este Manual v3.0 y conectado en vivo a la base de datos de la empresa activa. En Back-Office asiste al consultor en análisis técnico, fórmulas y auditoría; en el Portal del Cliente actúa como guía ejecutivo del dueño respetando estrictamente el Semáforo Verde y el aislamiento multi-tenant.',
      },
      {
        heading: '3. Centro de Prompts IA (/settings)',
        body: 'Permite a los socios de Estudio GS inspeccionar, personalizar y restaurar en cualquier momento los 6 prompts maestros que gobiernan la IA, así como alternar entre motores OpenAI y Anthropic Claude.',
      },
    ],
  },
];
