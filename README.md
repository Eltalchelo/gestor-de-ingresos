# 💰 Gestor de Ingresos · Personal Finance Dashboard

> 🇲🇽 Español | 🇺🇸 [English below](#english)

---

## 🇲🇽 Español

Dashboard personal de finanzas construido con **React + Vite**, sincronizado en tiempo real con **Airtable** como base de datos.

> ⚠️ **Tus datos son privados.** Este repositorio solo contiene el código. Las credenciales de Airtable se guardan localmente en `.env.local` (ignorado por git) y nunca se suben a GitHub. Cada persona que use este proyecto conecta su propio Airtable.

### Funcionalidades

- 📊 Dashboard con resumen de ingresos, gastos y saldo total
- 💳 Cuentas — saldos en tiempo real, múltiples cuentas (Efectivo, Nu, Uala, etc.)
- 🔄 Transferencias entre cuentas
- 🎯 Metas de ahorro con progreso visual
- 📅 Presupuesto por período (semanal, quincenal, mensual, bimestral)
- 📈 Gráfica Ingresos vs Gastos por día con fix de zona horaria para México (UTC-6)
- 🗓️ Constancia de registro estilo heatmap de GitHub
- 🔍 Filtros por tipo, cuenta, categoría, fecha y búsqueda de texto
- ✏️ Edición y eliminación de transacciones desde la tabla

### Instalación

```bash
git clone https://github.com/Eltalchelo/gestor-de-ingresos.git
cd gestor-de-ingresos
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales de Airtable
npm run dev
```

### Tablas requeridas en Airtable

| Tabla | Campos principales |
|---|---|
| `Transacciones` | tipo, categoria, descripcion, monto, fecha, cuenta, impacta_presupuesto |
| `Cuentas` | nombre, tipo, saldo, interes_anual |
| `Tarjetas` | nombre, limite, deuda, dia_corte, dia_pago |
| `Metas` | nombre, objetivo, ahorrado, emoji, color |
| `GastosFijos` | nombre, categoria, monto |
| `Presupuesto` | nombre, periodo, total, fechaInicio, fechaFin |

### Variables de entorno

```
VITE_AIRTABLE_TOKEN=tu_token_aqui
VITE_AIRTABLE_BASE=tu_base_id_aqui
```

---

## 🇺🇸 English <a name="english"></a>

Personal finance dashboard built with **React + Vite**, synced in real time with **Airtable** as the database.

> ⚠️ **Your data is private.** This repository only contains code. Airtable credentials are stored locally in `.env.local` (ignored by git) and never uploaded to GitHub. Each user connects their own Airtable.

### Features

- 📊 Dashboard with income, expenses and total balance summary
- 💳 Accounts — real-time balances, multiple accounts (Cash, Nu, Uala, etc.)
- 🔄 Transfers between accounts
- 🎯 Savings goals with visual progress
- 📅 Budget by period (weekly, biweekly, monthly, bimonthly)
- 📈 Income vs Expenses per day chart with timezone fix for Mexico (UTC-6)
- 🗓️ Activity heatmap (GitHub-style streak tracker)
- 🔍 Filters by type, account, category, date and text search
- ✏️ Inline editing and deletion of transactions

### Installation

```bash
git clone https://github.com/Eltalchelo/gestor-de-ingresos.git
cd gestor-de-ingresos
npm install
cp .env.example .env.local
# Edit .env.local with your Airtable credentials
npm run dev
```

### Required Airtable tables

| Table | Main fields |
|---|---|
| `Transacciones` | tipo, categoria, descripcion, monto, fecha, cuenta, impacta_presupuesto |
| `Cuentas` | nombre, tipo, saldo, interes_anual |
| `Tarjetas` | nombre, limite, deuda, dia_corte, dia_pago |
| `Metas` | nombre, objetivo, ahorrado, emoji, color |
| `GastosFijos` | nombre, categoria, monto |
| `Presupuesto` | nombre, periodo, total, fechaInicio, fechaFin |

### Environment variables

```
VITE_AIRTABLE_TOKEN=your_token_here
VITE_AIRTABLE_BASE=your_base_id_here
```

Get your credentials at [airtable.com/create/tokens](https://airtable.com/create/tokens)

### Tech stack

| Technology | Use |
|---|---|
| React 19 | UI |
| Vite 7 | Bundler & dev server |
| Recharts | Charts |
| Lucide React | Icons |
| Airtable API | Database |

### Privacy

- `.env.local` is **never uploaded to GitHub** (listed in `.gitignore`)
- Your financial data lives in **your Airtable**, not in this repository
- Each user connects their own base — no one has access to anyone else's data

### Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
npm run lint     # Linter
```
