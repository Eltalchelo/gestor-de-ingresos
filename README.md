# 💰 Gestor de Ingresos

Dashboard personal de finanzas construido con **React + Vite**, sincronizado en tiempo real con **Airtable** como base de datos.

> ⚠️ **Tus datos son privados.** Este repositorio solo contiene el código. Las credenciales de Airtable se guardan localmente en `.env.local` (ignorado por git) y nunca se suben a GitHub. Cada persona que use este proyecto conecta su propio Airtable.

## Funcionalidades

- 📊 Dashboard con resumen de ingresos, gastos y saldo total
- 💳 Cuentas — saldos en tiempo real, múltiples cuentas (Efectivo, Nu, Uala, etc.)
- 🔄 Transferencias entre cuentas
- 🎯 Metas de ahorro con progreso visual
- 📅 Presupuesto por período (semanal, quincenal, mensual, bimestral)
- 📈 Gráfica Ingresos vs Gastos por día
- 🗓️ Constancia de registro estilo heatmap de GitHub
- 🔍 Filtros por tipo, cuenta, categoría, fecha y búsqueda de texto
- ✏️ Edición y eliminación de transacciones desde la tabla

## Instalación

```bash
git clone https://github.com/Eltalchelo/gestor-de-ingresos.git
cd gestor-de-ingresos
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales de Airtable
npm run dev
```

## Tablas requeridas en Airtable

| Tabla | Campos principales |
|---|---|
| `Transacciones` | tipo, categoria, descripcion, monto, fecha, cuenta, impacta_presupuesto |
| `Cuentas` | nombre, tipo, saldo, interes_anual |
| `Tarjetas` | nombre, limite, deuda, dia_corte, dia_pago |
| `Metas` | nombre, objetivo, ahorrado, emoji, color |
| `GastosFijos` | nombre, categoria, monto |
| `Presupuesto` | nombre, periodo, total, fechaInicio, fechaFin |

## Variables de entorno

```
VITE_AIRTABLE_TOKEN=tu_token_aqui
VITE_AIRTABLE_BASE=tu_base_id_aqui
```

Obtén tus credenciales en [airtable.com/create/tokens](https://airtable.com/create/tokens)

## Stack

| Tecnología | Uso |
|---|---|
| React 19 | UI |
| Vite 7 | Bundler y dev server |
| Recharts | Gráficas |
| Lucide React | Iconos |
| Airtable API | Base de datos |

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Vista previa del build
npm run lint     # Linter
```
