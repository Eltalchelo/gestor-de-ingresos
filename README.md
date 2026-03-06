# 💰 Gestor de Ingresos

Dashboard personal de finanzas construido con **React + Vite**, sincronizado en tiempo real con **Airtable** como base de datos.

> ⚠️ **Tus datos son privados.** Este repositorio solo contiene el código. Las credenciales de Airtable se guardan localmente en `.env.local` (ignorado por git) y nunca se suben a GitHub. Cada persona que use este proyecto conecta su propio Airtable.

## Funcionalidades

**Todo lo que necesitas. Nada que no necesitas.**

### 📊 Tu dinero, de un vistazo
¿Cuánto tienes realmente? No en teoría — ahora mismo. El dashboard consolida cada peso de todas tus cuentas en un número claro, actualizado al instante con cada movimiento que registras. Sin fórmulas. Sin hojas de cálculo. Solo la verdad de tus finanzas en pantalla.

### 💳 Todas tus cuentas, un solo lugar
Efectivo, Nu, Uala, Mercado Libre, DiDi, Story — cada cuenta con su saldo propio, actualizado automáticamente cada vez que registras un ingreso o un gasto. Haz una transferencia entre cuentas y ambos saldos se ajustan en el momento. Tu dinero, siempre donde debe estar.

### 📈 Entiende cuándo y cómo gastas
Una gráfica de Ingresos vs Gastos por día transforma tus movimientos en una historia visual. Ve de un solo vistazo en qué días del mes gastas más, cuándo entra más dinero, y qué tan cerca estás del balance ideal. Construida para México — sin los errores de zona horaria que hacen que las transacciones nocturnas aparezcan en el día equivocado.

### 🎯 Metas que avanzan solas
Crea una meta de ahorro, asígnale un nombre, un emoji y un objetivo. Cada vez que muevas dinero hacia ella, el progreso se actualiza y la barra avanza. Verlo moverse es motivación suficiente para seguir. Porque las metas que no se miden, no se cumplen.

### 📅 Un presupuesto que trabaja contigo
Semanal, quincenal, mensual o bimestral — el período que mejor se adapte a cómo recibes tu dinero. Define cuánto puedes gastar, y el sistema lleva la cuenta por ti: cuánto has usado, cuánto queda, y si vas bien o ya te pasaste. Sin sorpresas a fin de mes.

### 🗓️ La constancia que no se puede fingir
Un heatmap estilo GitHub marca cada día en que registraste movimientos. Verde significa que estuviste al tanto. Gris significa que no. No hay trampa posible — o llevas el registro o no lo llevas. Esa visibilidad, por sí sola, cambia el hábito.

### 🔍 Cualquier transacción, en segundos
Busca por descripción, filtra por cuenta, por categoría, por tipo o por rango de fechas. Combina filtros. Ordena como quieras. Lo que tardabas minutos en encontrar en un estado de cuenta, aquí aparece al instante. Tu historial financiero, siempre a la mano.

### ✏️ Tus datos, bajo tu control
Cometiste un error en el monto, la categoría o la fecha de una transacción. Sin problema — edítala directo desde la tabla con un clic. ¿Ya no la necesitas? Elimínala. Sin pasos extra, sin confirmaciones innecesarias. Porque tus datos deben obedecerte a ti, no al revés.

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
