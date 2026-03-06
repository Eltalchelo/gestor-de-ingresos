# 💰 Gestor de Ingresos

Dashboard personal de finanzas construido con **React + Vite**, sincronizado en tiempo real con **Airtable** como base de datos.

> ⚠️ **Tus datos son privados.** Este repositorio solo contiene el código. Las credenciales de Airtable se guardan localmente en `.env.local` (ignorado por git) y nunca se suben a GitHub. Cada persona que use este proyecto conecta su propio Airtable.

## Funcionalidades

**Todo lo que necesitas. Nada que no necesitas.**

### 📊 Tu dinero, de un vistazo
Ve exactamente cuánto entra, cuánto sale y cuánto tienes — en tiempo real, sin hojas de cálculo, sin complicaciones.

### 💳 Todas tus cuentas en un solo lugar
Efectivo, Nu, Uala, Mercado Libre, DiDi — cada cuenta con su saldo actualizado al instante cada vez que registras un movimiento.

### 📈 Entiende tus patrones de gasto
Una gráfica de Ingresos vs Gastos por día te muestra exactamente cuándo gastas más y cuándo más ingresa. Diseñada para México — sin errores de zona horaria.

### 🎯 Metas que sí se cumplen
Define una meta, ponle un emoji, y observa cómo el progreso avanza con cada ahorro registrado. Simple. Visual. Motivador.

### 📅 Presupuesto que se adapta a ti
Semanal, quincenal, mensual o bimestral — tú decides el período. El sistema calcula automáticamente cuánto has usado y cuánto te queda.

### 🗓️ Constancia hecha visible
Un heatmap estilo GitHub que muestra los días en que registraste movimientos. Ver tu racha activa es razón suficiente para no romperla.

### 🔍 Encuentra cualquier transacción en segundos
Filtra por tipo, cuenta, categoría o fecha. O simplemente escribe lo que buscas — el buscador encuentra hasta lo que no recordabas haber registrado.

### ✏️ Control total sobre tus datos
Edita o elimina cualquier transacción directo desde la tabla. Sin modales innecesarios, sin pasos extra.

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
