# 💰 Gestor de Ingresos

Dashboard personal de finanzas construido con **React + Vite**, sincronizado en tiempo real con **Airtable** como base de datos.

> ⚠️ **Tus datos son privados.** Este repositorio solo contiene el código. Las credenciales de Airtable se guardan localmente en `.env.local` (ignorado por git) y nunca se suben a GitHub. Cada persona que use este proyecto conecta su propio Airtable.

---

## Funcionalidades

- 📊 **Dashboard** con resumen de ingresos, gastos y saldo total
- 💳 **Cuentas** — saldos en tiempo real, múltiples cuentas (Efectivo, Nu, Uala, etc.)
- 🔄 **Transferencias** entre cuentas
- 🎯 **Metas de ahorro** con progreso visual
- 📅 **Presupuesto por período** (semanal, quincenal, mensual, bimestral)
- 📈 **Gráfica Ingresos vs Gastos por día** con fix de zona horaria para México (UTC-6)
- 🗓️ **Constancia de registro** estilo heatmap de GitHub
- 🔍 Filtros por tipo, cuenta, categoría, fecha y búsqueda de texto
- ✏️ Edición y eliminación de transacciones desde la tabla

---

## Stack

| Tecnología | Uso |
|---|---|
| React 19 | UI |
| Vite 7 | Bundler y dev server |
| Recharts | Gráficas |
| Lucide React | Iconos |
| Airtable API | Base de datos |

---

## Instalación

### 1. Clona el repositorio

```bash
git clone https://github.com/Eltalchelo/gestor-de-ingresos.git
cd gestor-de-ingresos
```

### 2. Instala dependencias

```bash
npm install
```

### 3. Configura tu propio Airtable

Este proyecto requiere una base de Airtable con las siguientes tablas:

| Tabla | Campos principales |
|---|---|
| `Transacciones` | tipo, categoria, descripcion, monto, fecha, cuenta, impacta_presupuesto |
| `Cuentas` | nombre, tipo, saldo, interes_anual |
| `Tarjetas` | nombre, limite, deuda, dia_corte, dia_pago |
| `Metas` | nombre, objetivo, ahorrado, emoji, color |
| `GastosFijos` | nombre, categoria, monto |
| `Presupuesto` | nombre, periodo, total, fechaInicio, fechaFin |

**Obtén tus credenciales:**
- **Token:** [airtable.com/create/tokens](https://airtable.com/create/tokens) — permisos: `data.records:read` y `data.records:write`
- **Base ID:** URL de tu base → `airtable.com/appXXXXXXXXXX/...` (el `appXXX...`)

### 4. Crea el archivo `.env.local`

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:

```
VITE_AIRTABLE_TOKEN=tu_token_aqui
VITE_AIRTABLE_BASE=tu_base_id_aqui
```

### 5. Corre el proyecto

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## Privacidad

- El archivo `.env.local` **nunca se sube a GitHub** (está en `.gitignore`)
- Tus datos financieros viven en **tu Airtable**, no en este repositorio
- Cada usuario conecta su propia base — nadie tiene acceso a los datos de otro

---

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Vista previa del build
npm run lint     # Linter
```
