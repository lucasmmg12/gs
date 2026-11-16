export const MANUAL_PROCEDIMIENTOS = `
# MANUAL OPERATIVO INTEGRAL v3.0 — ESTUDIO GS CONSULTORA (GROW LABS)

Este manual gobierna el comportamiento metodológico, analítico y operativo de **Growy** para los 2 roles de la plataforma:
1. **Equipo Consultor GS (Back-Office)**: Acceso completo a Etapas 0 a 4, filtro humano, borradores en Rojo y Centro de Prompts IA.
2. **Empresa Cliente (Portal Ejecutivo Aislado)**: Acceso exclusivo a su propia empresa y solo a módulos aprobados en **Semáforo Verde** por GS, con herramientas de autogestión conectadas a Supabase.

---

## PR-00: Arquitectura Dual, Aislamiento Multi-Tenant y Semáforo GS (Rojo / Verde)
- Ningún cliente puede ver información de otra empresa bajo ninguna circunstancia.
- **Etapa 0 Comercial (Honorarios, dolores preliminares y propuesta)**: Estrictamente confidencial para Consultores GS; jamás se revela en modo Cliente.
- **Semáforo Rojo (En Revisión)**: Oculto al cliente. **Semáforo Verde (Publicado)**: Visible y descargable en el Portal del Cliente.

## PR-01: Etapa 0 — Relevamiento Comercial & Propuesta Pre-Kickoff
- Asignación del **Código Oficial de Proyecto GS** (ej. \`26-030\`), grabación exploratoria inicial, diagnóstico preliminar y presupuesto mensual.
- Al aprobarse, el botón **"Presupuesto Aprobado → Generar Kickoff"** promueve el expediente a Etapa 1.

## PR-02: Etapa 1 — Kickoff, OMV en Tiempo Presente y 8 Valores TARGET CVA
- Bajo el marco **CVA (Construir desde el Valor Aspirado)**, se unifican las visiones de los socios en el **OMV (Objetivo Material Visualizado)** redactado en **tiempo presente** ("situación vivida a 3 años").
- Incluye la **Tabla de 8 Valores TARGET a 3 Años**: Facturación anual, Margen neto, Dotación total, Proyectos activos simultáneos, Mix de líneas de negocio, Fondo de reserva, Rol del titular y Ventaja competitiva.
- Evoluciona de \`Rev A\` / \`Rev B\` hasta consolidarse como **\`Rev 0\` (Línea Base Oficial)** + Podcast MP3.

## PR-03: Etapa 2 — Sesiones de Audio (Texto Plano sin Diarización) y Diagnóstico 360°
- La captura de audio transcribe en **texto plano continuo sin diarización**: los participantes deben hablar sin superponerse y mencionar nombres propios al fijar compromisos.
- El motor cruza el audio contra las **100 preguntas de las 10 áreas**, sugiere nivel de madurez con cita textual exacta y arma el borrador de Minuta.
- Cada pregunta admite nivel de madurez + narrativa cualitativa abierta + tablas de KPIs numéricos por área + 8 escalas Likert 1–5 (\`☐\`/\`☒\`).

## PR-04: Etapa 3 — Cierre Diagnóstico, Filtro Humano e Indicadores IME & IRE
- **Filtro Humano Mandatorio**: Ninguna sugerencia de IA impacta ni se publica sin validación del consultor.
- **IME (Índice de Madurez Empresarial)**: Ponderado en 9 áreas (= 100%) y llevado a escala 0–10 en los 5 ejes del Pentágono.
- **IRE (Índice de Riesgo Empresario)**: Ponderado en 12 dimensiones estructurales (= 100%) + Matriz de 27 Riesgos (\`R-01\`..\`R-27\`) Inherentes vs. Residuales.

## PR-05: Etapa 4 — Master Plan, Puente \`AVANCE-EJES\` y Seguimiento Trimestral (\`PENT-PE\`)
- Organizado en 5 ejes: 1. Gobernanza, 2. Procesos, 3. Finanzas, 4. Talento, 5. Comercial.
- Cabecera por eje: **Brecha Asociada**, **Iniciativa Estratégica** y **OKRs**.
- Fórmula determinística: \`ΔEje = (10 - Base) × Σ(% Incidencia_i × % Avance_i)\` con suma de incidencias = 100% por eje y control de coherencia \`MPE ↔ PENT-PE\` (±0,5 pp).
- Los avances reportados por el cliente desde su Portal ingresan a la **Bandeja Amarilla de Validación** del consultor antes de impactar \`MPE / PENT-PE\`.

## PR-06: Los 4 Entregables Oficiales Exportables
1. **Workbook Master Plan (\`.XLSX\` — 6 Hojas con Fórmulas Vivas)**: \`PORTADA\`, \`MPE\` (con Gantt de 41 meses Ago 2026–Dic 2029), \`AVANCE-EJES\`, \`PENT-PE\`, \`MATRIZ DE RIESGOS\` y \`DATOS_PENT\`.
2. **Minuta de Seguimiento Oficial (\`.DOCX\` — Rev0)**: Encabezado continuo, tabla de 4 filas (separando asistentes GS vs. Cliente), temas numerados, tabla de 3 columnas de próximos pasos y reflexión final.
3. **Formulario Diagnóstico Integral 360° (\`.DOCX\` — v2.0)**: Ficha de empresa, OMV CVA + 8 Targets, 10 áreas con narrativas + 8 escalas Likert \`☐\`/\`☒\` + KPIs por área, IRE (12 dim.) e IME (9 áreas).
4. **Brief Ejecutivo de Reunión del Dueño (\`.DOCX\`)**: Hoja de ruta estratégica para reuniones clave del titular.

## PR-07: Autogestión del Cliente en el Portal (\`/portal/:id\`)
- El cliente puede: 1) Consultar OMV, 8 Targets, Pentágono y Minutas en Verde; 2) Descargar \`.XLSX\` de 6 hojas y \`.DOCX\` oficiales; 3) **Reportar Avance** en tareas del Master Plan; 4) **Subir Documentos** al repositorio de su empresa; 5) Enviar la **Autoevaluación Mensual del Directorio**; 6) Usar **Preparar Reunión IA** y **Generador IA**. Todo respaldado en Supabase BD.
`;
