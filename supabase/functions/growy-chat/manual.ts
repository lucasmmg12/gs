export const MANUAL_PROCEDIMIENTOS = `
# Manual Metodológico y Procedimientos Operativos - Consultora GS (Grow Labs · Sanatorio Argentino)

Este manual establece los fundamentos teóricos, metodológicos y operativos de Consultora GS y de su asistente de inteligencia estratégica **Growy**.
Garantiza que el ciclo de vida de la información (reuniones, minutas, diagnóstico 360°, OMB, plan maestro y documentos RAG) se gestione bajo estricto aislamiento de datos entre clientes y bajo el principio inquebrantable de **Validación Humana Obligatoria (Filtro Humano)**.

---

## PR-01: Gestión de Reuniones, Grabaciones y Minutas Oficiales
1. **Captura y Registro**: Finalizada la sesión de tutoría, el audio se vincula al expediente del cliente en Supabase.
2. **Transcripción y Procesamiento (Whisper)**: El sistema transcribe el audio con marcas temporales e identificación de interlocutores.
3. **Generación de Borrador de Minuta**:
   - Cabecera formal con participantes (GS vs Cliente).
   - Temas tratados agrupados jerárquicamente.
   - **Tabla de Compromisos**: Acción concreta, Responsable unívoco, Fecha límite y Nivel de Prioridad.
   - Reflexión Estratégica Final orientada al crecimiento y despersonalización de la gestión.
4. **Ciclo de Estados**:
   - *Borrador (Draft)* $\\to$ *En Revisión* $\\to$ *Aprobado por Consultor* $\\to$ *Publicado en Portal del Cliente*.
   - **Regla de Privacidad**: Los estados Borrador y En Revisión son estrictamente invisibles para el cliente en su portal.
   - **Regla Inmutable**: Ninguna minuta redactada por IA se publica sin la revisión y firma del consultor a cargo.

---

## PR-02: Diagnóstico Integral 360° y Taxonomía de Preguntas
El diagnóstico evalúa la madurez de la empresa a través de 10 Áreas Críticas y 78 Preguntas Clave:
1. **Áreas del Diagnóstico**:
   - Área 1: Identidad, Misión y Cultura.
   - Área 2: Planificación Estratégica y Dirección.
   - Área 3: Procesos y Operaciones (ISO 9001).
   - Área 4: Finanzas, Costos y Control de Gestión.
   - Área 5: Talento, Personas y Estructura Organizativa.
   - Área 6: Comercial, Ventas y Canales.
   - Área 7: Marketing, Marca y Posicionamiento.
   - Área 8: Tecnología, Sistemas y Automatización.
   - Área 9: Gobernanza, Socios y Sucesión Familiar.
   - Área 10: Cumplimiento, Legales y Gestión de Riesgos.
2. **Taxonomía de Preguntas**:
   - **Preguntas Abiertas de Exploración Cualitativa (open_diagnostic)**: Indagan tensiones, dinámicas y cultura (ej: visión de los socios, historia familiar, expectativas).
   - **Preguntas de Nivelación y Madurez (maturity_level)**: Evalúan el estadio actual de la empresa en una escala técnica estructurada (0 a 10).
   - **Preguntas con Indicadores/KPIs (indicator)**: Validan métricas numéricas concretas (ej: punto de equilibrio, rotación de personal, margen de contribución).
3. **Actualización Incremental sin Sobrescritura Ciega**:
   - La IA nunca reemplaza respuestas ya consolidadas sin presentar evidencia explícita de una reunión reciente.

---

## PR-03: Objetivo Más Bárbaro (OMB) - Visión Trienal Estratégica
El **OMB** reemplaza denominaciones genéricas y define el horizonte a 3 años, retador, medible e inspirador, acordado entre los socios.
1. **Ciclo de Revisiones**:
   - **Rev A**: Primer borrador preliminar generado durante las primeras sesiones diagnósticas.
   - **Rev B, C, etc.**: Revisiones intermedias que incorporan correcciones y contrastes entre socios.
   - **Rev 0**: **Versión Oficial Definitiva y Aprobada**, firmada por la dirección de la empresa y Consultora GS.
2. **Consolidación de Perspectivas de Socios**:
   - Cada socio carga su perspectiva individual. Growy detecta puntos de encuentro, divergencias de visión y redacta una propuesta unificada coherente.
3. **Audios y Podcasts por Revisión**:
   - Cada hito del OMB cuenta con su archivo de audio o podcast explicativo grabado por el equipo consultor o socios para reforzar el alineamiento emocional y operativo.

---

## PR-04: Cierre de Sesión y Filtro Humano ("Human-in-the-Loop")
**Axioma Operativo**: Los modelos de IA presentan un margen de error estimado del ~15% en interpretación de lenguaje coloquial, matices de negocios y acuerdos implícitos.
1. **Filtro Humano Mandatorio**:
   - Tras el cierre de sesión, Growy procesa la transcripción y detecta sugerencias de actualización para el diagnóstico y la minuta.
   - Cada sugerencia incluye: Área impactada, Pregunta específica, Texto sugerido, Cita textual exacta (*exact quote*) de la transcripción y Nivel de Confianza (%).
   - **El consultor debe Aprobar, Rechazar o Editar manualmente cada tarjeta**.
   - Solo las tarjetas aprobadas/editadas impactan la base de datos oficial del cliente.

---

## PR-05: Pentágono del Orden y Evolución Matemática de Madurez
El Pentágono mide el Índice de Madurez Estratégica (IME, escala 0 a 10) en 5 Ejes Fundamentales:
1. **Gobernanza y Conducción**
2. **Procesos y Operaciones**
3. **Finanzas y Control de Gestión**
4. **Talento y Personas**
5. **Comercial y Expansión**

### Fórmula Matemática de Evolución por Acciones Ponderadas:
La subida de puntaje en un eje **no es una percepción subjetiva**, sino el producto exacto de las tareas del Master Plan completadas:
$$\\Delta \\text{Eje} = (10 - \\text{Base}) \\times \\sum_{i=1}^{n} (\\% \\text{Incidencia}_i \\times \\% \\text{Avance}_i)$$
- **Regla de Ponderación**: En cada eje, la suma de las incidencias de las acciones debe ser exactamente del **100%**.
- **Línea Base**: Puntaje inicial determinado en el diagnóstico 360°.
- **Puntaje Actual**: Se recalcula dinámicamente según el porcentaje de avance reportado en cada acción ponderada.

---

## PR-06: Medianera Conceptual (Procesos antes que Personas)
Bajo la filosofía de Consultora GS inspirada en ISO 9001:
- Primero se identifican los macroprocesos de la cadena de valor y sus responsables funcionales ideales (Puestos).
- Recién después se analiza a las personas físicas y su adecuación al puesto.
- Jamás se diseña un organigrama para acomodar las virtudes o defectos de las personas actuales, sino para responder a la eficiencia del negocio.

---

## PR-07: Gestor Documental y RAG Aislado (Base de Conocimiento)
1. **Aislamiento Multi-Tenant Estricto**:
   - Todo documento subido lleva asociado el \`client_id\` del cliente.
   - La búsqueda vectorial o semántica (RAG) filtra irrevocablemente por dicho identificador.
2. **Alcance y Etiquetado**:
   - **Global**: Documentos que rigen toda la empresa (Estatutos societarios, Estados Contables, Organigrama General).
   - **Por Área (1..10)**: Procedimientos operativos específicos, manuales de ventas, políticas de RRHH, flujos de caja.
   - **Por Pregunta**: Evidencias concretas que respaldan la respuesta a una pregunta del diagnóstico 360°.
3. **Permisos y Visibilidad**:
   - Documentos de Auditoría Interna / Notas de Consultor: Visibles solo por el equipo GS.
   - Documentos Oficiales / Entregables: Visibles tanto por el consultor como por el cliente en su portal.

---

## PR-08: Gestión de Prompts y Criterios del Consultor
El comportamiento analítico de Growy puede ser afinado mediante la tabla \`system_prompts\`:
- **Rol y Tono**: Profesional, riguroso, analítico y cercano (español argentino con voseo educado).
- **Adaptaciones por Industria**: Énfasis financiero en empresas agropecuarias, trazabilidad y costos en metalmecánica/manufactura, retención de talento en servicios/software.
- **Formato Ejecutivo de Respuestas**: Claridad, datos cuantitativos, citas verificables y sin rodeos genéricos.
`;
