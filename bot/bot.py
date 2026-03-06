import os
import re
import logging
from datetime import datetime
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes
from pyairtable import Api

load_dotenv()

BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN")
AT_TOKEN    = os.getenv("VITE_AIRTABLE_TOKEN")
AT_BASE     = os.getenv("VITE_AIRTABLE_BASE")
ALLOWED_ID  = int(os.getenv("TELEGRAM_USER_ID", "0"))

logging.basicConfig(level=logging.INFO)

# ── Categorías y cuentas (deben coincidir con el dashboard) ──────────────────
CATS_GASTO   = ["comida", "transporte", "renta", "entretenimiento", "salud", "ropa", "servicios", "otro"]
CATS_INGRESO = ["salario", "freelance", "negocio", "inversión", "inversion", "regalo", "otro"]
CUENTAS      = ["efectivo", "uala", "nu", "mercado libre", "didi", "story", "plata", "revolut"]

CAT_MAP = {
    # Gastos
    "comida": "Comida", "comer": "Comida", "food": "Comida", "restaurante": "Comida",
    "uber eats": "Comida", "rappi": "Comida", "antojo": "Comida", "taco": "Comida",
    "super": "Comida", "supermercado": "Comida", "mercado": "Comida", "tienda": "Comida",
    "transporte": "Transporte", "taxi": "Transporte", "uber": "Transporte",
    "didi": "Transporte", "camion": "Transporte", "metro": "Transporte", "gasolina": "Transporte",
    "renta": "Renta", "alquiler": "Renta", "departamento": "Renta",
    "entretenimiento": "Entretenimiento", "cine": "Entretenimiento", "netflix": "Entretenimiento",
    "spotify": "Entretenimiento", "juego": "Entretenimiento", "concierto": "Entretenimiento",
    "salud": "Salud", "doctor": "Salud", "medicina": "Salud", "farmacia": "Salud",
    "ropa": "Ropa", "zapatos": "Ropa", "ropa": "Ropa",
    "servicios": "Servicios", "luz": "Servicios", "agua": "Servicios",
    "internet": "Servicios", "telefono": "Servicios", "seguro": "Servicios",
    # Ingresos
    "salario": "Salario", "sueldo": "Salario", "quincena": "Salario", "nomina": "Salario",
    "freelance": "Freelance", "trabajo": "Freelance", "proyecto": "Freelance",
    "negocio": "Negocio", "venta": "Negocio",
    "inversión": "Inversión", "inversion": "Inversión", "dividendo": "Inversión",
    "regalo": "Regalo", "prestamo": "Regalo",
}

CUENTA_MAP = {
    "efectivo": "Efectivo", "cash": "Efectivo",
    "uala": "Uala",
    "nu": "Nu", "nubank": "Nu",
    "mercado": "Mercado Libre", "meli": "Mercado Libre",
    "didi": "DiDi",
    "story": "Story", "stori": "Story",
    "plata": "Plata",
    "revolut": "Revolut",
}

PALABRAS_GASTO   = ["gasté", "gaste", "pagué", "pague", "compré", "compre", "debo", "debe", "gasto", "costó", "costo", "cobró", "cobro"]
PALABRAS_INGRESO = ["gané", "gane", "recibí", "recibi", "ingresé", "ingrese", "cobré", "cobre", "ingreso", "me pagaron", "me dieron"]


def local_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def parse_message(text: str) -> dict | None:
    text_lower = text.lower().strip()

    # ── Tipo ─────────────────────────────────────────────────────────────────
    tipo = None
    for p in PALABRAS_INGRESO:
        if p in text_lower:
            tipo = "ingreso"
            break
    if not tipo:
        for p in PALABRAS_GASTO:
            if p in text_lower:
                tipo = "gasto"
                break
    if not tipo:
        tipo = "gasto"  # default

    # ── Monto ────────────────────────────────────────────────────────────────
    match = re.search(r"\$?\s*(\d+(?:[.,]\d+)?)", text_lower)
    if not match:
        return None
    monto = float(match.group(1).replace(",", "."))

    # ── Categoría ────────────────────────────────────────────────────────────
    categoria = "Otro"
    for kw, cat in CAT_MAP.items():
        if kw in text_lower:
            categoria = cat
            break

    # ── Cuenta ───────────────────────────────────────────────────────────────
    cuenta = "Efectivo"
    for kw, ct in CUENTA_MAP.items():
        if kw in text_lower:
            cuenta = ct
            break

    # ── Descripción ──────────────────────────────────────────────────────────
    descripcion = text.strip()

    return {
        "tipo": tipo,
        "monto": monto,
        "categoria": categoria,
        "cuenta": cuenta,
        "descripcion": descripcion,
        "fecha": local_date(),
        "impacta_presupuesto": True,
    }


def save_to_airtable(data: dict) -> None:
    api    = Api(AT_TOKEN)
    table  = api.table(AT_BASE, "Transacciones")
    table.create({
        "tipo":                data["tipo"],
        "categoria":           data["categoria"],
        "descripcion":         data["descripcion"],
        "monto":               data["monto"],
        "fecha":               data["fecha"],
        "cuenta":              data["cuenta"],
        "impacta_presupuesto": data["impacta_presupuesto"],
    })


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id

    # Solo responde al dueño
    if ALLOWED_ID and user_id != ALLOWED_ID:
        await update.message.reply_text("⛔ No autorizado.")
        return

    text = update.message.text
    data = parse_message(text)

    if not data:
        await update.message.reply_text(
            "❓ No entendí. Ejemplo:\n"
            "• _gasté 150 en comida_\n"
            "• _pagué 800 de uber con nu_\n"
            "• _recibí 5000 de salario_",
            parse_mode="Markdown"
        )
        return

    try:
        save_to_airtable(data)
        emoji = "💸" if data["tipo"] == "gasto" else "💰"
        signo = "-" if data["tipo"] == "gasto" else "+"
        await update.message.reply_text(
            f"{emoji} Registrado\n"
            f"`{signo}${data['monto']:,.0f}` · {data['categoria']} · {data['cuenta']}\n"
            f"📅 {data['fecha']}",
            parse_mode="Markdown"
        )
    except Exception as e:
        logging.error(e)
        await update.message.reply_text("❌ Error al guardar. Revisa las credenciales.")


if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("🤖 Bot corriendo...")
    app.run_polling()
