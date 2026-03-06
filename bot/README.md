# 🤖 Bot de Telegram — Gestor de Ingresos

Registra gastos e ingresos en Airtable escribiendo en Telegram.

## Ejemplos

```
gasté 150 en comida
pagué 800 de uber con nu
recibí 5000 de salario
compré ropa por 300 con uala
```

## Setup

### 1. Instalar Python y dependencias
```bash
pip install -r requirements.txt
```

### 2. Crear el bot
1. Abre Telegram → busca **@BotFather**
2. Escribe `/newbot` y sigue las instrucciones
3. Copia el token que te da

### 3. Obtener tu Telegram User ID
1. Busca **@userinfobot** en Telegram
2. Escríbele cualquier cosa
3. Te responde con tu ID numérico

### 4. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tus datos:
```
TELEGRAM_BOT_TOKEN=token_de_botfather
TELEGRAM_USER_ID=tu_id_numerico
VITE_AIRTABLE_TOKEN=mismo_que_en_el_dashboard
VITE_AIRTABLE_BASE=mismo_que_en_el_dashboard
```

### 5. Probar
```bash
python bot.py
```

### 6. Iniciar con Windows (Task Scheduler)
1. Abre **Task Scheduler** → *Create Basic Task*
2. Trigger: **At log on**
3. Action: **Start a program** → selecciona `iniciar_bot.bat`
4. ✅ Listo — el bot arranca automáticamente al encender la PC

## Categorías reconocidas

| Gasto | Ingreso |
|---|---|
| Comida, Transporte, Renta | Salario, Freelance |
| Entretenimiento, Salud | Negocio, Inversión |
| Ropa, Servicios, Otro | Regalo, Otro |

## Cuentas reconocidas
Efectivo · Nu · Uala · Mercado Libre · DiDi · Story · Plata · Revolut
