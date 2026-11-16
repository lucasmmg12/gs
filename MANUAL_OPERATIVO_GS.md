# MANUAL OPERATIVO INTEGRAL v3.0 — PLATAFORMA ESTUDIO GS CONSULTORA (GROW LABS)

> **Propósito del Documento:** Guía maestra didáctica y operativa para el **Equipo de Consultores de Estudio GS** y para los **Socios / Directores de Empresas Clientes**, sincronizada al 100% con el cerebro de **Growy IA** y la persistencia en **Base de Datos PostgreSQL (Supabase)**.

---

## 1. Arquitectura de Dos Usuarios y Blindaje Multi-Tenant

| Dimensión | Perfil 1: Consultor Estudio GS (Back-Office) | Perfil 2: Empresa Cliente (Portal Ejecutivo Aislado) |
| :--- | :--- | :--- |
| **Ruta de Acceso** | `/login` → Pestaña **Equipo Consultor GS** (`/clients`, `/settings`, `/knowledge`) | `/portal/:id` o `/login` → Pestaña **Portal de Clientes** (Correo o Código `GS-XXXXXX-2026`) |
| **Alcance de Datos** | Cartera completa de empresas clientes | **Exclusivamente su propia empresa** (bloqueo cruzado estricto) |
| **Etapa 0 Comercial** | Visible y editable (dolores, alcance, honorarios mensuales) | **100% Invisible** (clave interna separada en BD) |
| **Control de Calidad** | Gobierna el **Semáforo Rojo / Verde** por módulo y minuta | Solo visualiza y descarga lo aprobado en **VERDE** |
| **Master Plan** | Crea ejes/acciones, pondera incidencias y **valida avances** | Consulta avances, descarga `.XLSX` 6 hojas y **reporta progreso** |
| **Asistente Growy IA** | Modo Consultor (análisis técnico, fórmulas, prompts, auditoría) | Modo Cliente (guía ejecutiva aislada sin acceso a borradores internos) |

---

## 2. Paso a Paso del Consultor de Estudio GS (Etapas 0 a 4)

### Paso 0: Alta de Empresa y Relevamiento Comercial (`/clients` → `0. Relevamiento & Propuesta`)
1. En **Clientes (`/clients`)**, pulse **+ Nuevo Cliente**. El sistema genera automáticamente su **Código Privado de Portal** (ej. `GS-EJEMPL-2026`) e inicializa todos sus módulos en **Semáforo ROJO** (ocultos al cliente).
2. Entre a **`0. Relevamiento & Propuesta`**:
   - Defina el **Código Oficial de Proyecto GS** (ej. `26-030`), que dará nombre normado a todos los entregables `.XLSX` y `.DOCX`.
   - Pulse **Grabar Entrevista Inicial** para registrar la primera charla exploratoria, documente dolores preliminares, alcance y presupuesto mensual.
   - Una vez aprobado el presupuesto por el titular, haga clic en **"Presupuesto Aprobado → Generar Kickoff"**.

### Paso 1: Kickoff, OMV en Tiempo Presente y 8 Valores TARGET CVA (`1. Kickoff & OMV`)
1. En la subpestaña **Visiones de Socios**, cargue lo que aspira cada socio fundador y pulse **"Unificar Visiones con Growy IA"**.
2. En **Declaración OMV (Tiempo Presente)**, revise que el **Objetivo Material Visualizado** esté redactado en presente (*"Hoy es septiembre de 2029..."*).
3. En **Valores TARGET a 3 Años (8 KPIs CVA)**, complete línea base y meta trienal de los 8 indicadores del marco *Construir desde el Valor Aspirado* (Facturación, Margen neto, Dotación, Proyectos simultáneos, Mix comercial, Reserva operativa, Rol del titular y Ventaja competitiva).
4. Suba el **Podcast MP3** si corresponde, fije la versión consensuada como **Rev 0 (Línea Base)** y, cuando esté lista para el cliente, pase el semáforo `1. Visión 2029` a **VERDE**.

### Paso 2: Sesiones Grabadas (Texto Plano) y Diagnóstico Integral 360° (`2. Diagnóstico 360°`)
1. Pulse **Grabar / Subir Audio Ahora** (`/clients/:id/meetings/live`):
   - **Nota Operativa Obligatoria**: La transcripción es en **texto plano continuo sin diarización**; hable una persona a la vez sin pisarse y mencione nombres propios al acordar tareas.
   - Al finalizar, el motor IA responde automáticamente las preguntas detectadas entre las **100 preguntas de las 10 áreas** (con cita textual de respaldo) y redacta la **Minuta Ejecutiva**, descargable al instante en **Word Oficial (`.DOCX`)**.
2. En **2. Diagnóstico 360°**, audite cada área combinando:
   - Opción estructurada de madurez (incluyendo las **8 preguntas Likert 1–5**),
   - Respuesta narrativa libre cualitativa,
   - Tabla de **KPIs cuantitativos por área**.
   - Todo cambio se guarda automáticamente en Supabase (`Respaldado en Base de Datos ✓`).

### Paso 3: Cierre Diagnóstico, Matrices e Informe Word 360° (`3. Matrices & Riesgos`)
1. Cambie la hoja de ruta a **3. Diagnóstico Cerrado** (se ocultan los avisos de sesiones en curso).
2. Inspeccione en **3. Matrices & Riesgos** el cálculo automático de FODA/TOWS, PESTEL, 5 Fuerzas de Porter, **IME** (9 áreas ponderadas = 100%) e **IRE** (12 dimensiones ponderadas = 100% + 27 riesgos).
3. Exporte `GS_Diagnostico_360_<EMPRESA>.docx` con el botón **Word 360° Oficial (.DOCX)** y pase el semáforo de Diagnóstico a **VERDE**.

### Paso 4: Master Plan, Puente `AVANCE-EJES` y Validación de Avances (`4. Master Plan`)
1. Seleccione cada uno de los **5 Ejes** para editar su **Brecha Asociada**, **Iniciativa Estratégica Rectora** y **OKRs**.
2. Controle el panel en vivo **Puente Oficial `AVANCE-EJES`** (`MPE ↔ PENT-PE`, tolerancia `±0,5 pp`):
   $$\Delta \text{Eje} = (10 - \text{Base}) \times \sum_{i=1}^{n} (\% \text{Incidencia}_i \times \% \text{Avance}_i)$$
3. Revise la **Bandeja Amarilla de Avances Reportados por el Cliente**: pulse **"Validar e Impactar"** para aprobar con criterio humano las actualizaciones enviadas desde el Portal Cliente.
4. En **Seguimiento Trimestral PENT-PE (3 Meses)** registre las remediciones cada 90 días y descargue en cualquier momento el **Workbook Oficial GS (`.XLSX` — 6 Hojas con Fórmulas Vivas)**.

### Configuración Transversal: Centro de Prompts IA (`/settings`)
- Desde el menú lateral **Prompts IA & Config. GS (`/settings`)**, el equipo de Estudio GS edita, guarda en Supabase (`system_prompts`) o restaura los **6 prompts maestros** y selecciona proveedor IA (**OpenAI** vs. **Anthropic Claude**).

---

## 3. Paso a Paso y Autogestión de la Empresa Cliente (`/portal/:id`)

1. **Acceso Simple y Seguro**: El socio entra al link enviado por WhatsApp o ingresa su **Código Corporativo de Acceso** en `/login` → **Portal de Clientes**.
2. **Consulta de Norte e Indicadores Auditados**:
   - **Visión 2029 (OMV)**: Lee su declaración en presente y sus **8 Valores TARGET a 3 años**.
   - **Pentágono & Evolución** y **Diagnóstico 360° & Riesgos**: Visualiza su **IME**, su **IRE** y descarga informes oficiales en **Word (`.DOCX`)** y **PDF**.
   - **Minutas Aprobadas**: Revisa acuerdos y compromisos de 30 días y descarga cada minuta en **Word Oficial (`.DOCX`)**.
3. **Co-Gestión de Tareas en Master Plan (*"Reportar Avance"*)**:
   - Filtra sus acciones por eje, hace clic en **Reportar Avance**, propone el nuevo estado (`EN PROCESO`, `FINALIZADO`, `RETRASADO`) y escribe una nota de respaldo. Se guarda en Supabase y notifica a su consultor GS.
   - También descarga su **Workbook Master Plan Oficial de 6 Hojas con Fórmulas (`.XLSX`)**.
4. **Autogestión Documental (*"Subir Documento a Estudio GS"*)**:
   - En la pestaña **Documentos**, adjunta balances, cashflows u organigramas directamente a la base de datos de su empresa.
5. **Autoevaluación Mensual del Directorio**:
   - Antes de cada comité mensual, responde las 4 preguntas ejecutivas de foco estratégico, cumplimiento de acuerdos, caja a 12 semanas y delegación.
6. **Preparar Reunión IA + Copiloto Growy**:
   - En **Preparar Reunión IA**, selecciona tipo de mesa (*Directorio / Socios*, *Cliente Corporativo*, *Mandos Medios* o *Banco / Financiamiento*), genera su estrategia cruzada con OMV + Riesgos + Master Plan y descarga el **Brief Ejecutivo en Word (`.DOCX`)**.
   - Abajo a la derecha cuenta siempre con **Growy Asistente** en Modo Cliente Aislado.
