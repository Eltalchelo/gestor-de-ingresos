import os
import re
import logging
from datetime import datetime, timedelta
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
    # Gastos — multi-palabra primero para evitar coincidencias parciales
    "uber eats": "Comida", "rappi": "Comida", "supermercado": "Comida",
    "restaurante": "Comida", "antojo": "Comida", "mercado": "Comida",
    "tienda": "Comida", "comida": "Comida", "super": "Comida",
    "comer": "Comida", "food": "Comida", "taco": "Comida",
    "gasolina": "Transporte", "transporte": "Transporte", "camion": "Transporte",
    "metro": "Transporte", "taxi": "Transporte", "uber": "Transporte", "didi": "Transporte",
    "departamento": "Renta", "alquiler": "Renta", "renta": "Renta",
    "entretenimiento": "Entretenimiento", "concierto": "Entretenimiento",
    "netflix": "Entretenimiento", "spotify": "Entretenimiento",
    "juego": "Entretenimiento", "cine": "Entretenimiento",
    "farmacia": "Salud", "medicina": "Salud", "doctor": "Salud", "salud": "Salud",
    "zapatos": "Ropa", "ropa": "Ropa",
    "internet": "Servicios", "telefono": "Servicios", "seguro": "Servicios",
    "servicios": "Servicios", "luz": "Servicios", "agua": "Servicios",
    # Ingresos
    "quincena": "Salario", "nomina": "Salario", "sueldo": "Salario", "salario": "Salario",
    "freelance": "Freelance", "proyecto": "Freelance", "trabajo": "Freelance",
    "negocio": "Negocio", "venta": "Negocio",
    "dividendo": "Inversión", "inversión": "Inversión", "inversion": "Inversión",
    "prestamo": "Regalo", "regalo": "Regalo",
}

CUENTA_MAP = {
    # Multi-palabra primero
    "mercado libre": "Mercado Libre", "mercado pago": "Mercado Libre",
    "efectivo": "Efectivo", "cash": "Efectivo",
    "nubank": "Nu", "revolut": "Revolut",
    "stori": "Story", "story": "Story",
    "plata": "Plata", "uala": "Uala",
    "meli": "Mercado Libre", "mercado": "Mercado Libre",
    "didi": "DiDi", "nu": "Nu",
}

PALABRAS_GASTO   = ["gasté", "gaste", "pagué", "pague", "compré", "compre",
                    "debo", "debe", "gasto", "costó", "costo", "cobró", "cobro"]
PALABRAS_INGRESO = ["gané", "gane", "recibí", "recibi", "ingresé", "ingrese",
                    "cobré", "cobre", "ingreso", "me pagaron", "me dieron"]

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}


def local_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _kw_found(kw: str, text: str) -> bool:
    """Devuelve True si la keyword está en el texto.
    Para keywords multi-palabra usa 'in'; para una sola palabra usa \\b."""
    if " " in kw:
        return kw in text
    return bool(re.search(r"\b" + re.escape(kw) + r"\b", text))


def parse_date(text_lower: str) -> str:
    now = datetime.now()

    # "antier" / "anteayer" — va antes de "ayer" para no confundirlos
    if "antier" in text_lower or "anteayer" in text_lower:
        return (now - timedelta(days=2)).strftime("%Y-%m-%d")
    if "ayer" in text_lower:
        return (now - timedelta(days=1)).strftime("%Y-%m-%d")

    # "el 3 de marzo"
    m = re.search(r"\bel\s+(\d{1,2})\s+de\s+(\w+)", text_lower)
    if m:
        day, mes_str = int(m.group(1)), m.group(2)
        mes_num = MESES.get(mes_str)
        if mes_num and 1 <= day <= 31:
            try:
                return datetime(now.year, mes_num, day).strftime("%Y-%m-%d")
            except ValueError:
                pass

    # "el 3"
    m = re.search(r"\bel\s+(\d{1,2})\b", text_lower)
    if m:
        day = int(m.group(1))
        if 1 <= day <= 31:
            try:
                return datetime(now.year, now.month, day).strftime("%Y-%m-%d")
            except ValueError:
                pass

    return local_date()


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
        tipo = "gasto"

    # ── Monto ────────────────────────────────────────────────────────────────
    match = re.search(r"\$?\s*(\d+(?:[.,]\d+)?)", text_lower)
    if not match:
        return None
    monto = float(match.group(1).replace(",", "."))

    # ── Fecha ────────────────────────────────────────────────────────────────
    fecha = parse_date(text_lower)

    # ── Cuenta — "con/en/vía X" primero; keywords más largos primero ─────────
    cuenta = "Efectivo"
    sorted_cuentas = sorted(CUENTA_MAP.keys(), key=len, reverse=True)

    for kw in sorted_cuentas:
        pattern = r"(?:con|en|v[ií]a|por)\s+" + re.escape(kw)
        if re.search(pattern, text_lower):
            cuenta = CUENTA_MAP[kw]
            break

    if cuenta == "Efectivo":
        for kw in sorted_cuentas:
            if _kw_found(kw, text_lower):
                cuenta = CUENTA_MAP[kw]
                break

    # ── Categoría — keywords más largos primero; omite kw ambiguas ──────────
    categoria = "Otro"
    AMBIGUOS = {"didi": "DiDi", "mercado": "Mercado Libre"}

    for kw in sorted(CAT_MAP.keys(), key=len, reverse=True):
        if not _kw_found(kw, text_lower):
            continue
        # Si la keyword es ambigua y ya fue tomada como cuenta, la saltamos
        if kw in AMBIGUOS and cuenta == AMBIGUOS[kw]:
            continue
        categoria = CAT_MAP[kw]
        break

    # ── Descripción ──────────────────────────────────────────────────────────
    descripcion = text.strip()

    return {
        "tipo": tipo,
        "monto": monto,
        "categoria": categoria,
        "cuenta": cuenta,
        "descripcion": descripcion,
        "fecha": fecha,
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

    if ALLOWED_ID and user_id != ALLOWED_ID:
        await update.message.reply_text("No autorizado.")
        return

    text = update.message.text
    data = parse_message(text)

    if not data:
        await update.message.reply_text(
            "No entendi. Ejemplos:\n"
            "- gaste 150 en comida\n"
            "- pague 800 de uber con nu\n"
            "- compre ropa por 300 con uala\n"
            "- recibi 5000 de salario\n"
            "- gaste 200 en pizza ayer\n"
            "- pague 500 el 3 de marzo con nu",
        )
        return

    try:
        save_to_airtable(data)
        emoji = "x" if data["tipo"] == "gasto" else "+"
        signo = "-" if data["tipo"] == "gasto" else "+"
        await update.message.reply_text(
            f"Registrado\n"
            f"{signo}${data['monto']:,.0f} - {data['categoria']} - {data['cuenta']}\n"
            f"Fecha: {data['fecha']}",
        )
    except Exception as e:
        logging.error(e)
        await update.message.reply_text("Error al guardar. Revisa las credenciales.")


if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("Bot corriendo...")
    app.run_polling()
