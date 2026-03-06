import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, CreditCard, Edit2, Check, X, Target, Calendar, Star, ChevronUp, Lightbulb, PiggyBank, ChevronDown, Filter, Search, Cloud, CloudOff, RefreshCw, Eye, EyeOff, GripVertical, ArrowLeftRight } from "lucide-react";

// ══════════════════════════════════════════════════════════════
// AIRTABLE CONFIG
// ══════════════════════════════════════════════════════════════
const AT_TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const AT_BASE  = import.meta.env.VITE_AIRTABLE_BASE;
const AT_URL   = `https://api.airtable.com/v0/${AT_BASE}`;
const AT_HDR   = { "Authorization": `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" };

// ── Helpers Airtable ──────────────────────────────────────────
async function atGet(tabla) {
  const rows = [];
  let offset = null;
  do {
    const url = `${AT_URL}/${encodeURIComponent(tabla)}?pageSize=100${offset ? `&offset=${offset}` : ""}`;
    const res = await fetch(url, { headers: AT_HDR });
    if (!res.ok) throw new Error(`Airtable GET ${tabla}: ${res.status}`);
    const data = await res.json();
    rows.push(...data.records);
    offset = data.offset || null;
  } while (offset);
  return rows;
}

async function atCreate(tabla, fields) {
  const res = await fetch(`${AT_URL}/${encodeURIComponent(tabla)}`, {
    method: "POST", headers: AT_HDR,
    body: JSON.stringify({ records: [{ fields }] })
  });
  if (!res.ok) throw new Error(`Airtable POST ${tabla}: ${res.status}`);
  const data = await res.json();
  return data.records[0];
}

async function atUpdate(tabla, recordId, fields) {
  const res = await fetch(`${AT_URL}/${encodeURIComponent(tabla)}/${recordId}`, {
    method: "PATCH", headers: AT_HDR,
    body: JSON.stringify({ fields })
  });
  if (!res.ok) throw new Error(`Airtable PATCH ${tabla}: ${res.status}`);
  return res.json();
}

async function atDelete(tabla, recordId) {
  const res = await fetch(`${AT_URL}/${encodeURIComponent(tabla)}/${recordId}`, {
    method: "DELETE", headers: AT_HDR
  });
  if (!res.ok) throw new Error(`Airtable DELETE ${tabla}: ${res.status}`);
  return res.json();
}

// ── Mappers: Airtable → App ───────────────────────────────────
const mapTx     = r => ({ id: r.id, tipo: r.fields.tipo||"gasto", categoria: r.fields.categoria||"Otro", descripcion: r.fields.descripcion||"", monto: parseFloat(r.fields.monto)||0, fecha: r.fields.fecha||"", cuenta: r.fields.cuenta||"Efectivo", impacta_presupuesto: r.fields.impacta_presupuesto === true });
const mapCuenta = r => ({ id: r.id, nombre: r.fields.nombre||"", tipo: r.fields.tipo||"debito", saldo: parseFloat(r.fields.saldo)||0, interes_anual: parseFloat(r.fields.interes_anual)||null });
const mapTarjeta= r => ({ id: r.id, nombre: r.fields.nombre||"", limite: parseFloat(r.fields.limite)||0, deuda: parseFloat(r.fields.deuda)||0, dia_corte: r.fields.dia_corte||null, dia_pago: r.fields.dia_pago||null });
const mapMeta   = r => ({ id: r.id, nombre: r.fields.nombre||"", objetivo: parseFloat(r.fields.objetivo)||0, ahorrado: parseFloat(r.fields.ahorrado)||0, emoji: r.fields.emoji||"🎯", color: r.fields.color||"#D8DFE9" });
const mapFijo   = r => ({ id: r.id, nombre: r.fields.nombre||"", categoria: r.fields.categoria||"Otro", monto: parseFloat(r.fields.monto)||0 });
const mapPres   = r => ({ id: r.id, nombre: r.fields.nombre||"", periodo: r.fields.periodo||"Mensual", total: parseFloat(r.fields.total)||0, fechaInicio: r.fields.fechaInicio||"", fechaFin: r.fields.fechaFin||"" });

const CATEGORIAS_GASTO = ["Comida", "Transporte", "Renta", "Entretenimiento", "Salud", "Ropa", "Servicios", "Otro"];
const CATEGORIAS_INGRESO = ["Salario", "Freelance", "Negocio", "Inversión", "Regalo", "Otro"];
const TODAS_CATS = [...new Set([...CATEGORIAS_GASTO, ...CATEGORIAS_INGRESO])];
const CUENTAS_LIST = ["Efectivo", "Uala", "Nu", "Mercado Libre", "DiDi", "Story", "Plata", "Revolut"];
const PERIODOS = ["Semanal", "Quincenal", "Mensual", "Bimestral"];
const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
const pct = (a, b) => b > 0 ? Math.min((a / b) * 100, 100) : 0;
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const fmtFecha = (str) => {
  if (!str) return str;
  return new Date(str + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
};

const C = {
  aliceBlue: "#D8DFE9", honeydew: "#CFDECA", vanilla: "#EFF0A3",
  eerieBlack: "#212121", bg: "#F6F5FA", card: "#ffffff", border: "#e8e8ec",
  text: "#212121", muted: "#888", soft: "#b0b8c0",
  sage: "#7aab8a", amber: "#ab9a4a", rose: "#c47a7a", sky: "#7a9abc",
};

const CUENTA_ICONS = {
  "Efectivo":"💵","Uala":"🟣","Nu":"🟪","Mercado Libre":"🟡",
  "DiDi":"🧡","Story":"🔵","Plata":"⚪","Revolut":"🌍",
};
const TIPO_CUENTA_LABEL = { debito: "Débito", ahorro: "Ahorro", efectivo: "Efectivo" };
const PIE_PALETTE         = ["#7aab8a","#8a9abc","#ab9a4a","#c4a07a","#9a8ac4","#7ab8ab","#c47a9a","#a0b87a"];
const PIE_PALETTE_GASTO   = ["#fca5a5","#f87171","#ef4444","#dc2626","#b91c1c","#991b1b","#ff8080","#ff3d3d"];
const PIE_PALETTE_INGRESO = ["#bbf7d0","#86efac","#4ade80","#22c55e","#16a34a","#15803d","#34d399","#10b981"];

// ── INSIGHTS ────────────────────────────────────────────────────────────────────
function generarInsights(transacciones, presupuesto, gastosPeriodo, seccion) {
  const insights = [];
  const gastosPorCat = {};
  transacciones.filter(t => t.tipo === "gasto" && t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin)
    .forEach(t => { gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + t.monto; });
  const ingresosPeriodo = transacciones.filter(t => t.tipo === "ingreso" && t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin).reduce((s, t) => s + t.monto, 0);
  const pctUsado = presupuesto.total > 0 ? (gastosPeriodo / presupuesto.total) * 100 : 0;
  const tasaAhorro = ingresosPeriodo > 0 ? ((ingresosPeriodo - gastosPeriodo) / ingresosPeriodo) * 100 : 0;
  const topCat = Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1])[0];

  if (seccion === "home" || seccion === "ingresos" || seccion === "gastos") {
    if (pctUsado > 90) insights.push({ tipo: "alerta", texto: `⚠️ Usaste el ${pctUsado.toFixed(0)}% del presupuesto. Casi sin margen.` });
    else if (pctUsado > 70) insights.push({ tipo: "aviso", texto: `📊 Llevas el ${pctUsado.toFixed(0)}% del presupuesto. Ve con cuidado.` });
    else if (pctUsado < 40 && presupuesto.total > 0) insights.push({ tipo: "positivo", texto: `✅ Solo llevas el ${pctUsado.toFixed(0)}% del presupuesto. ¡Vas bien!` });
    if (topCat) insights.push({ tipo: "info", texto: `📌 Mayor gasto: ${topCat[0]} con ${fmt(topCat[1])}.` });
    if (gastosPorCat["Entretenimiento"] > 1500) insights.push({ tipo: "aviso", texto: `🎬 Entretenimiento supera $1,500. Considera recortar streaming.` });
    if (gastosPorCat["Comida"] > 4000) insights.push({ tipo: "aviso", texto: `🍔 Comida alta (${fmt(gastosPorCat["Comida"])}). Cocinar en casa ayuda.` });
    if (tasaAhorro > 20) insights.push({ tipo: "positivo", texto: `💚 Tasa de ahorro ${tasaAhorro.toFixed(0)}%. Mueve el excedente a tus metas.` });
    else if (tasaAhorro < 0) insights.push({ tipo: "alerta", texto: `🔴 Gastas más de lo que ingresas (${tasaAhorro.toFixed(0)}%). Revisa.` });
  }
  if (seccion === "presupuesto") {
    if (pctUsado > 80) insights.push({ tipo: "alerta", texto: `⚠️ ${pctUsado.toFixed(0)}% del presupuesto usado. Queda ${fmt(Math.max(presupuesto.total - gastosPeriodo, 0))}.` });
    else insights.push({ tipo: "positivo", texto: `✅ Presupuesto bajo control: ${pctUsado.toFixed(0)}% usado.` });
    if (topCat) insights.push({ tipo: "info", texto: `📋 Mayor categoría de gasto: ${topCat[0]} (${fmt(topCat[1])}).` });
  }
  if (seccion === "metas") {
    insights.push({ tipo: "info", texto: `🎯 Abona regularmente para alcanzar tus metas.` });
    if (tasaAhorro > 0) insights.push({ tipo: "positivo", texto: `💰 Con ${tasaAhorro.toFixed(0)}% de tasa de ahorro puedes avanzar en tus metas.` });
  }
  if (seccion === "cuentas") {
    insights.push({ tipo: "info", texto: `🏦 Mantén tus saldos actualizados para un panorama real.` });
    if (tasaAhorro > 15) insights.push({ tipo: "positivo", texto: `💡 Buen período. Considera mover excedente a cuenta de ahorro.` });
  }
  if (insights.length === 0) insights.push({ tipo: "info", texto: `📈 Período en orden. Sigue registrando movimientos.` });
  return insights;
}

// ── TOOLTIP LÍNEAS ───────────────────────────────────────────────────────────────
const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const ing = payload.find(p => p.dataKey === "ingresos")?.value || 0;
  const gas = payload.find(p => p.dataKey === "gastos")?.value || 0;
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", fontFamily: "Urbanist, sans-serif", minWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ fontSize: 12, color: C.sage, fontWeight: 600 }}>Ingresos</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.sage }}>{fmt(ing)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ fontSize: 12, color: C.rose, fontWeight: 600 }}>Gastos</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.rose }}>{fmt(gas)}</span>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ fontSize: 12, color: C.sky, fontWeight: 600 }}>Utilidad</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: ing - gas >= 0 ? C.sage : C.rose }}>{fmt(ing - gas)}</span>
        </div>
      </div>
    </div>
  );
};

// ── TOOLTIP PASTEL ───────────────────────────────────────────────────────────────
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontFamily: "Urbanist, sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", fontSize: 12 }}>
      <p style={{ fontWeight: 800, marginBottom: 4 }}>{name}</p>
      <p style={{ fontWeight: 700, color: C.muted }}>{fmt(value)}</p>
    </div>
  );
};

// ── CINTA TICKER ─────────────────────────────────────────────────────────────────
const InsightTicker = ({ insights }) => {
  const dotColor = { alerta: "#e88", aviso: "#dca", positivo: "#8c8", info: "#8af" };
  const items = [...insights, ...insights, ...insights];
  return (
    <div style={{ background: C.eerieBlack, overflow: "hidden", borderBottom: `1px solid #333` }}>
      <div className="ticker-track">
        {items.map((ins, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 32px", fontSize: 12, fontWeight: 600, color: "#f0f0f0", whiteSpace: "nowrap", borderRight: "1px solid #333" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor[ins.tipo] || "#8af", flexShrink: 0, display: "inline-block" }} />
            {ins.texto}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── CALENDARIO ESTILO GITHUB ──────────────────────────────────────────────────────
const ActivityCalendar = ({ transacciones }) => {
  const ref = useRef(null);
  const [cols, setCols] = useState(52);
  const CELL = 11;
  const GAP = 3;

  useEffect(() => {
    const calc = () => {
      if (!ref.current) return;
      const w = ref.current.offsetWidth;
      const c = Math.floor((w + GAP) / (CELL + GAP));
      setCols(Math.max(18, c));
    };
    calc();
    const obs = new ResizeObserver(calc);
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const today = new Date();
  const actMap = {};
  transacciones.forEach(t => { actMap[t.fecha] = (actMap[t.fecha] || 0) + 1; });

  const days = [];
  const start = new Date(today);
  start.setDate(today.getDate() - (cols * 7 - 1));
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    days.push({ date: key, count: actMap[key] || 0 });
  }
  const padDays = (() => { const s = start.getDay(); return s === 0 ? 6 : s - 1; })();
  const paddedDays = [...Array(padDays).fill(null), ...days];
  const numCols = Math.ceil(paddedDays.length / 7);
  const grid = [];
  for (let c = 0; c < numCols; c++) grid.push(paddedDays.slice(c * 7, c * 7 + 7));

  const months = [];
  let lastMonth = -1;
  grid.forEach((col, ci) => {
    const first = col.find(d => d !== null);
    if (first) {
      const m = new Date(first.date + "T12:00:00").getMonth();
      if (m !== lastMonth) { months.push({ col: ci, label: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m] }); lastMonth = m; }
    }
  });

  const getColor = (count) => {
    if (!count) return "#eee";
    if (count === 1) return "#c6e0d0";
    if (count === 2) return "#8ec4a8";
    if (count <= 4) return "#7aab8a";
    return "#4a8a6a";
  };

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div style={{ position: "relative", paddingTop: 20, marginBottom: 4 }}>
        {/* Labels mes */}
        {months.map((m, i) => (
          <span key={i} style={{ position: "absolute", left: m.col * (CELL + GAP), top: 2, fontSize: 10, color: C.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{m.label}</span>
        ))}
        <div style={{ display: "flex", gap: GAP }}>
          {grid.map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {col.map((day, ri) => (
                <div key={ri} title={day ? `${day.date}: ${day.count} movimiento(s)` : ""}
                  style={{ width: CELL, height: CELL, borderRadius: 2, background: day ? getColor(day.count) : "transparent", flexShrink: 0 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 11, color: C.muted }}>Mostrando <strong>{cols}</strong> semanas</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: C.muted }}>Menos</span>
        {[
          { color: "#eee",     label: "Sin movimientos" },
          { color: "#c6e0d0",  label: "1 movimiento" },
          { color: "#8ec4a8",  label: "2 movimientos" },
          { color: "#7aab8a",  label: "3–4 movimientos" },
          { color: "#4a8a6a",  label: "5 o más movimientos" },
        ].map((item, i) => (
          <div key={i} title={item.label} style={{ position: "relative", cursor: "default" }}
            onMouseEnter={e => {
              const t = document.createElement("div");
              t.id = "cal-tip";
              t.textContent = item.label;
              Object.assign(t.style, { position: "fixed", background: "#1a1a2e", color: "white", fontSize: "11px", fontWeight: 600, padding: "4px 9px", borderRadius: "7px", pointerEvents: "none", zIndex: 9999, whiteSpace: "nowrap", fontFamily: "Urbanist, sans-serif" });
              document.body.appendChild(t);
              const r = e.currentTarget.getBoundingClientRect();
              t.style.left = (r.left + r.width/2 - t.offsetWidth/2) + "px";
              t.style.top = (r.top - t.offsetHeight - 6) + "px";
            }}
            onMouseLeave={() => { const t = document.getElementById("cal-tip"); if(t) t.remove(); }}>
            <div style={{ width: 11, height: 11, borderRadius: 2, background: item.color }} />
          </div>
        ))}
          <span style={{ fontSize: 10, color: C.muted }}>Más</span>
        </div>
      </div>
    </div>
  );
};

// ── TARJETA CRÉDITO VISUAL ────────────────────────────────────────────────────────
const CreditCardVisual = ({ tarjeta, onDelete }) => {
  const p = pct(tarjeta.deuda, tarjeta.limite);
  const barC = p > 80 ? C.rose : p > 50 ? C.amber : C.sage;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, position: "relative", paddingBottom: 48, width: 280, height: 238, boxSizing: "border-box", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.aliceBlue, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CreditCard size={18} color={C.sky} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>{tarjeta.nombre}</p>
            <p style={{ fontSize: 11, color: C.muted }}>{p.toFixed(0)}% del límite usado</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: p > 80 ? C.rose : p > 50 ? C.amber : C.sage, fontWeight: 700, background: p > 80 ? "#fce8e8" : p > 50 ? "#fef9e8" : C.honeydew, padding: "3px 8px", borderRadius: 8 }}>
            {p > 80 ? "Alto" : p > 50 ? "Moderado" : "Saludable"}
          </span>
          <GripVertical size={14} color={C.muted} style={{ cursor: "grab" }} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Deuda</span>
          <span style={{ fontSize: 11, color: C.muted }}>{fmt(tarjeta.deuda)} / {fmt(tarjeta.limite)}</span>
        </div>
        <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1.5, color: C.eerieBlack, marginBottom: 10 }}>{fmt(tarjeta.deuda)}</p>
        {/* Barra de progreso */}
        <div style={{ height: 10, borderRadius: 5, background: C.bg, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ height: "100%", borderRadius: 5, width: `${p}%`, background: barC, transition: "width 0.6s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: C.muted }}>Disponible: <strong style={{ color: C.sage }}>{fmt(tarjeta.limite - tarjeta.deuda)}</strong></span>
          <span style={{ fontSize: 11, color: C.muted }}>Límite: {fmt(tarjeta.limite)}</span>
        </div>
        {(tarjeta.dia_corte || tarjeta.dia_pago) && (
          <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {tarjeta.dia_corte && <span style={{ fontSize: 11, color: C.muted }}>Corte: día <strong>{tarjeta.dia_corte}</strong></span>}
            {tarjeta.dia_pago && <span style={{ fontSize: 11, color: C.muted }}>Pago: día <strong>{tarjeta.dia_pago}</strong></span>}
          </div>
        )}
      </div>
      {onDelete && <button onClick={onDelete} className="icon-btn" style={{ position: "absolute", bottom: 14, right: 14 }}><Trash2 size={13}/></button>}
    </div>
  );
};

export default function Dashboard() {
  // ── AIRTABLE SYNC STATE ──────────────────────────────────────
  const [syncStatus, setSyncStatus] = useState("loading");
  const [syncMsg, setSyncMsg] = useState("");

  const [transacciones, setTransacciones] = useState(() => { try { return JSON.parse(localStorage.getItem("scf_cache_tx") || "null") || []; } catch { return []; } });
  const [cuentas, setCuentas] = useState(() => { try { return JSON.parse(localStorage.getItem("scf_cache_cuentas") || "null") || []; } catch { return []; } });
  const [showCuentaForm, setShowCuentaForm] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ nombre: "", tipo: "debito", saldo: "", interes_anual: "" });
  const [tarjetas, setTarjetas] = useState(() => { try { return JSON.parse(localStorage.getItem("scf_cache_tarjetas") || "null") || []; } catch { return []; } });
  const [showTarjetaForm, setShowTarjetaForm] = useState(false);
  const [tarjetaForm, setTarjetaForm] = useState({ nombre: "", limite: "", deuda: "", dia_corte: "", dia_pago: "" });
  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoForm, setPagoForm] = useState({ tarjeta: "", cuenta: "", monto: "", fecha: localDate(), descripcion: "" });
  const [gastosFijos, setGastosFijos] = useState(() => { try { return JSON.parse(localStorage.getItem("scf_cache_fijos") || "null") || []; } catch { return []; } });
  const [showFijoForm, setShowFijoForm] = useState(false);
  const [fijoForm, setFijoForm] = useState({ nombre: "", categoria: "Renta", monto: "" });
  const [metas, setMetas] = useState(() => { try { return JSON.parse(localStorage.getItem("scf_cache_metas") || "null") || []; } catch { return []; } });
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [metaForm, setMetaForm] = useState({ nombre: "", objetivo: "", ahorrado: "", emoji: "🎯" });
  const [editingMeta, setEditingMeta] = useState(null);
  const [presupuesto, setPresupuesto] = useState(() => { try { return JSON.parse(localStorage.getItem("scf_cache_pres") || "null") || { id: null, nombre: "", periodo: "Mensual", total: 0, fechaInicio: localDate().slice(0,7)+"-01", fechaFin: localDate() }; } catch { return { id: null, nombre: "", periodo: "Mensual", total: 0, fechaInicio: localDate().slice(0,7)+"-01", fechaFin: localDate() }; } });
  const [editPres, setEditPres] = useState(false);
  const [presForm, setPresForm] = useState({ ...presupuesto });
  const [showFechasHome, setShowFechasHome] = useState(false);
  const [hidePatrimonio, setHidePatrimonio] = useState(true);
  const [avisoCerrado, setAvisoCerrado] = useState(false);

  const [inlineCat, setInlineCat] = useState({ show: false, context: null, val: "" }); // context: "gasto"|"ingreso"|"fijo"
  const [inlineCuenta, setInlineCuenta] = useState({ show: false, val: "", tipo: "debito", saldo: "" });

  // ── CARGA INICIAL ────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setSyncStatus("loading"); setSyncMsg("Cargando desde Airtable…");
    try {
      const [rTx, rCuentas, rTarjetas, rMetas, rFijos, rPres] = await Promise.all([
        atGet("Transacciones"), atGet("Cuentas"), atGet("Tarjetas"),
        atGet("Metas"), atGet("GastosFijos"), atGet("Presupuesto")
      ]);
      setTransacciones(rTx.map(mapTx));
      setCuentas(rCuentas.map(mapCuenta));
      setTarjetas(rTarjetas.map(mapTarjeta));
      setMetas(rMetas.map(mapMeta));
      setGastosFijos(rFijos.map(mapFijo));
      if (rPres.length) { 
        const p = mapPres(rPres[0]); setPresupuesto(p); setPresForm(p); 
      } else {
        // Crear presupuesto inicial automáticamente
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);
        const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0).toISOString().slice(0,10);
        const mesNombre = hoy.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
        const campos = { nombre: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1), periodo: "Mensual", total: 0, fechaInicio: primerDia, fechaFin: ultimoDia };
        try {
          const rec = await atCreate("Presupuesto", campos);
          const p = mapPres(rec); setPresupuesto(p); setPresForm(p);
        } catch(e) { console.error("No se pudo crear presupuesto inicial", e); }
      }

      // Persistir caché para próxima apertura instantánea
      try {
        localStorage.setItem("scf_cache_tx",       JSON.stringify(rTx.map(mapTx)));
        localStorage.setItem("scf_cache_cuentas",  JSON.stringify(rCuentas.map(mapCuenta)));
        localStorage.setItem("scf_cache_tarjetas", JSON.stringify(rTarjetas.map(mapTarjeta)));
        localStorage.setItem("scf_cache_metas",    JSON.stringify(rMetas.map(mapMeta)));
        localStorage.setItem("scf_cache_fijos",    JSON.stringify(rFijos.map(mapFijo)));
        if (rPres.length) localStorage.setItem("scf_cache_pres", JSON.stringify(mapPres(rPres[0])));
      } catch(e) {} // ignorar errores de cuota de almacenamiento
      setSyncStatus("ok"); setSyncMsg("Sincronizado ✓");
      setHasLoaded(true);
    } catch(e) {
      setSyncStatus("error"); setSyncMsg("Error al conectar con Airtable");
      setHasLoaded(true);
      console.error(e);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, []);

  const [form, setForm] = useState({ tipo: "gasto", categoria: "Comida", descripcion: "", monto: "", fecha: localDate(), cuenta: "Efectivo", impacta_presupuesto: true });
  const [formError, setFormError] = useState("");
  const [transfError, setTransfError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(() => { try { return localStorage.getItem("scf_cache_tx") !== null; } catch { return false; } });
  const [showCatForm, setShowCatForm] = useState(false);

  // ── CATEGORÍAS PERSONALIZABLES ──────────────────────────────
  const [catsGasto, setCatsGasto] = useState(() => {
    try { return JSON.parse(localStorage.getItem("scf_cats_gasto") || "null") || [...CATEGORIAS_GASTO]; } catch { return [...CATEGORIAS_GASTO]; }
  });
  const [catsIngreso, setCatsIngreso] = useState(() => {
    try { return JSON.parse(localStorage.getItem("scf_cats_ingreso") || "null") || [...CATEGORIAS_INGRESO]; } catch { return [...CATEGORIAS_INGRESO]; }
  });
  const [newCatNombre, setNewCatNombre] = useState("");
  const [newCatTipo, setNewCatTipo] = useState("gasto");

  useEffect(() => { localStorage.setItem("scf_cats_gasto", JSON.stringify(catsGasto)); }, [catsGasto]);
  useEffect(() => { localStorage.setItem("scf_cats_ingreso", JSON.stringify(catsIngreso)); }, [catsIngreso]);

  const handleAddCatInline = (context) => {
    const nombre = inlineCat.val.trim();
    if (!nombre) return;
    if (context === "ingreso") {
      setCatsIngreso(prev => [...new Set([...prev, nombre])]);
      setForm(f => ({ ...f, categoria: nombre }));
    } else {
      setCatsGasto(prev => [...new Set([...prev, nombre])]);
      if (context === "fijo") setFijoForm(f => ({ ...f, categoria: nombre }));
      else setForm(f => ({ ...f, categoria: nombre }));
    }
    setInlineCat({ show: false, context: null, val: "" });
  };

  const handleAddCuentaInline = async () => {
    const nombre = inlineCuenta.val.trim();
    if (!nombre) return;
    saving("Creando cuenta…");
    try {
      const saldo = parseFloat(inlineCuenta.saldo) || 0;
      const tipo = inlineCuenta.tipo;
      const fields = { nombre, tipo, saldo };
      const rec = await atCreate("Cuentas", fields);
      const nuevaCuenta = { id: rec.id, nombre: rec.fields.nombre || nombre, tipo: rec.fields.tipo || tipo, saldo: parseFloat(rec.fields.saldo) || saldo, interes_anual: null };
      setCuentas(prev => {
        const nueva = [...prev, nuevaCuenta];
        return nueva;
      });
      setInlineCuenta({ show: false, val: "", tipo: "debito", saldo: "" });
      // Pequeño delay para que React actualice cuentas antes de setear form.cuenta
      setTimeout(() => setForm(f => ({ ...f, cuenta: nuevaCuenta.nombre })), 50);
      saved();
    } catch(e) { errAt(e); }
  };

  const micRecRef = useRef(null);

  const persistOrdenCuentas = (nuevo) => { setOrdenCuentas(nuevo); localStorage.setItem("scf_orden_cuentas", JSON.stringify(nuevo)); };
  const persistOrdenTarjetas = (nuevo) => { setOrdenTarjetas(nuevo); localStorage.setItem("scf_orden_tarjetas", JSON.stringify(nuevo)); };

  const getCuentasOrdenadas = (grupo) => {
    const ids = ordenCuentas[grupo[0]?.tipo] || [];
    if (ids.length === 0) return grupo.slice().sort((a, b) => b.saldo - a.saldo);
    const mapa = Object.fromEntries(grupo.map(c => [c.id, c]));
    const ordenadas = ids.map(id => mapa[id]).filter(Boolean);
    const nuevas = grupo.filter(c => !ids.includes(c.id)).sort((a, b) => b.saldo - a.saldo);
    return [...ordenadas, ...nuevas];
  };

  const getTarjetasOrdenadas = () => {
    if (ordenTarjetas.length === 0) return tarjetas.slice().sort((a, b) => b.deuda - a.deuda);
    const mapa = Object.fromEntries(tarjetas.map(t => [t.id, t]));
    const ordenadas = ordenTarjetas.map(id => mapa[id]).filter(Boolean);
    const nuevas = tarjetas.filter(t => !ordenTarjetas.includes(t.id)).sort((a, b) => b.deuda - a.deuda);
    return [...ordenadas, ...nuevas];
  };

  const handleDragStartCuenta = (e, id, tipo) => { e.dataTransfer.setData("cuentaId", id); e.dataTransfer.setData("cuentaTipo", tipo); };
  const handleDropCuenta = (e, targetId, tipo) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("cuentaId");
    if (!fromId || fromId === targetId) { setDragOver(null); return; }
    const grupo = cuentas.filter(c => c.tipo === tipo);
    const ordenActual = getCuentasOrdenadas(grupo).map(c => c.id);
    const fromIdx = ordenActual.indexOf(fromId);
    const toIdx = ordenActual.indexOf(targetId);
    const nuevo = [...ordenActual];
    nuevo.splice(fromIdx, 1);
    nuevo.splice(toIdx, 0, fromId);
    persistOrdenCuentas({ ...ordenCuentas, [tipo]: nuevo });
    setDragOver(null);
  };

  const handleDragStartTarjeta = (e, id) => { e.dataTransfer.setData("tarjetaId", id); };
  const handleDropTarjeta = (e, targetId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("tarjetaId");
    if (!fromId || fromId === targetId) { setDragOver(null); return; }
    const ordenActual = getTarjetasOrdenadas().map(t => t.id);
    const fromIdx = ordenActual.indexOf(fromId);
    const toIdx = ordenActual.indexOf(targetId);
    const nuevo = [...ordenActual];
    nuevo.splice(fromIdx, 1);
    nuevo.splice(toIdx, 0, fromId);
    persistOrdenTarjetas(nuevo);
    setDragOver(null);
  };

  const handleAddCat = () => {
    if (!newCatNombre.trim()) return;
    if (newCatTipo === "gasto") setCatsGasto(prev => [...new Set([...prev, newCatNombre.trim()])]);
    else setCatsIngreso(prev => [...new Set([...prev, newCatNombre.trim()])]);
    setNewCatNombre("");
  };
  const handleDeleteCat = (tipo, cat) => {
    if (tipo === "gasto") setCatsGasto(prev => prev.filter(c => c !== cat));
    else setCatsIngreso(prev => prev.filter(c => c !== cat));
  };
  const [showTransfForm, setShowTransfForm] = useState(false);
  const [transf, setTransf] = useState({ origen: "", destino: "", monto: "", descripcion: "", fecha: localDate() });
  const [tabPie, setTabPie] = useState("gasto");
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingTxData, setEditingTxData] = useState({});
  const [activeTab, setActiveTab] = useState("home");

  // Filtros tabla transacciones
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCuenta, setFiltroCuenta] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroOrden, setFiltroOrden] = useState("fecha_desc");
  const [filtroPresupuesto, setFiltroPresupuesto] = useState("todos"); // "todos"|"si"|"no"
  const [ordenCuentas, setOrdenCuentas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("scf_orden_cuentas") || "null") || {}; } catch { return {}; }
  });
  const [ordenTarjetas, setOrdenTarjetas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("scf_orden_tarjetas") || "null") || []; } catch { return []; }
  });
  const [dragOver, setDragOver] = useState(null);
  const [showFiltros, setShowFiltros] = useState(false);
  const [editingDateTxId, setEditingDateTxId] = useState(null);
  const [editingDateVal, setEditingDateVal] = useState("");
  const [lineChartCat, setLineChartCat] = useState("todas");
  const [showEditModal, setShowEditModal] = useState(false);

  // ── FILTROS PERSISTENTES ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("scf_filtros") || "{}");
      if (saved.filtroTipo)      setFiltroTipo(saved.filtroTipo);
      if (saved.filtroCuenta)    setFiltroCuenta(saved.filtroCuenta);
      if (saved.filtroCategoria) setFiltroCategoria(saved.filtroCategoria);
      if (saved.filtroFechaDesde)setFiltroFechaDesde(saved.filtroFechaDesde);
      if (saved.filtroFechaHasta)setFiltroFechaHasta(saved.filtroFechaHasta);
      if (saved.filtroBusqueda)  setFiltroBusqueda(saved.filtroBusqueda);
      if (saved.filtroOrden)     setFiltroOrden(saved.filtroOrden);
    } catch(e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("scf_filtros", JSON.stringify({ filtroTipo, filtroCuenta, filtroCategoria, filtroFechaDesde, filtroFechaHasta, filtroBusqueda, filtroOrden, filtroPresupuesto }));
    } catch(e) {}
  }, [filtroTipo, filtroCuenta, filtroCategoria, filtroFechaDesde, filtroFechaHasta, filtroBusqueda, filtroOrden]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setShowForm(false);
        setShowTransfForm(false);
        setShowPagoForm(false);
        setFormError("");
        setTransfError("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── COMPUTED ───────────────────────────────────────────────────────────────────
  const totalDisponible = useMemo(() => cuentas.reduce((s, c) => s + (c.saldo || 0), 0), [cuentas]);
  const totalAhorro = useMemo(() => cuentas.filter(c => c.tipo === "ahorro").reduce((s, c) => s + (c.saldo || 0), 0), [cuentas]);
  const totalDeuda = useMemo(() => tarjetas.reduce((s, t) => s + (t.deuda || 0), 0), [tarjetas]);
  const totalLimite = useMemo(() => tarjetas.reduce((s, t) => s + (t.limite || 0), 0), [tarjetas]);
  const totalIngresos = useMemo(() => transacciones.filter(t => t.tipo === "ingreso").reduce((s, t) => s + t.monto, 0), [transacciones]);
  const totalGastos = useMemo(() => transacciones.filter(t => t.tipo === "gasto").reduce((s, t) => s + t.monto, 0), [transacciones]);
  const gastosPeriodo = useMemo(() => transacciones.filter(t => t.tipo === "gasto" && t.impacta_presupuesto !== false && t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin).reduce((s, t) => s + t.monto, 0), [transacciones, presupuesto]);
  const gastosPeriodoAll = useMemo(() => transacciones.filter(t => t.tipo === "gasto" && t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin).reduce((s, t) => s + t.monto, 0), [transacciones, presupuesto]);
  const ingresosPeriodo = useMemo(() => transacciones.filter(t => t.tipo === "ingreso" && t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin).reduce((s, t) => s + t.monto, 0), [transacciones, presupuesto]);
  const balancePeriodo = ingresosPeriodo - gastosPeriodoAll;
  const disponiblePres = Math.max(presupuesto.total - gastosPeriodo, 0);

  const gastosFijosConEstado = useMemo(() => gastosFijos.map(gf => {
    const gastoEnCat = transacciones
      .filter(t => t.tipo === "gasto" && t.categoria === gf.categoria && t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin)
      .reduce((s, t) => s + t.monto, 0);
    return { ...gf, pagado: gastoEnCat >= gf.monto, gastoEnCat };
  }), [gastosFijos, transacciones, presupuesto]);
  const disponibleReal = useMemo(() => {
    const pendienteMonto = gastosFijosConEstado.filter(g => !g.pagado).reduce((s, g) => s + g.monto, 0);
    return Math.max(disponiblePres - pendienteMonto, 0);
  }, [disponiblePres, gastosFijosConEstado]);

  const pieData = useMemo(() => {
    const cats = {};
    transacciones.filter(t => t.tipo === tabPie).forEach(t => { cats[t.categoria] = (cats[t.categoria] || 0) + t.monto; });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transacciones, tabPie]);

  const lineData = useMemo(() => {
    const map = {};
    const start = new Date(presupuesto.fechaInicio + "T12:00:00");
    const end = new Date(presupuesto.fechaFin + "T12:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      map[key] = { dia: key.slice(5), ingresos: 0, gastos: 0 };
    }
    transacciones.forEach(t => {
      if (t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin) {
        if (lineChartCat !== "todas" && t.categoria !== lineChartCat) return;
        if (!map[t.fecha]) map[t.fecha] = { dia: t.fecha.slice(5), ingresos: 0, gastos: 0 };
        if (t.tipo === "ingreso") map[t.fecha].ingresos += t.monto;
        else if (t.categoria !== "Transferencia") map[t.fecha].gastos += t.monto;
      }
    });
    return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [transacciones, presupuesto, lineChartCat]);

  // Transacciones filtradas
  const cuentasEnTransacciones = useMemo(() => [...new Set(transacciones.map(t => t.cuenta))], [transacciones]);
  const txFiltradas = useMemo(() => {
    let tx = [...transacciones];
    // Filtrar por pestaña activa
    if (activeTab === "ingresos") tx = tx.filter(t => t.tipo === "ingreso");
    else if (activeTab === "gastos") tx = tx.filter(t => t.tipo === "gasto");
    else if (filtroTipo !== "todos") tx = tx.filter(t => t.tipo === filtroTipo);
    if (filtroCuenta !== "todas") tx = tx.filter(t => t.cuenta === filtroCuenta);
    if (filtroCategoria !== "todas") tx = tx.filter(t => t.categoria === filtroCategoria);
    if (filtroFechaDesde) tx = tx.filter(t => t.fecha >= filtroFechaDesde);
    if (filtroFechaHasta) tx = tx.filter(t => t.fecha <= filtroFechaHasta);
    if (filtroBusqueda) tx = tx.filter(t => t.descripcion.toLowerCase().includes(filtroBusqueda.toLowerCase()) || t.categoria.toLowerCase().includes(filtroBusqueda.toLowerCase()));
    if (filtroPresupuesto === "si") tx = tx.filter(t => t.impacta_presupuesto === true);
    if (filtroPresupuesto === "no") tx = tx.filter(t => t.impacta_presupuesto !== true);
    const [campo, dir] = filtroOrden.split("_");
    tx.sort((a, b) => {
      let va = campo === "monto" ? a.monto : a[campo];
      let vb = campo === "monto" ? b.monto : b[campo];
      if (typeof va === "string") return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return dir === "asc" ? va - vb : vb - va;
    });
    return tx;
  }, [transacciones, activeTab, filtroTipo, filtroCuenta, filtroCategoria, filtroFechaDesde, filtroFechaHasta, filtroBusqueda, filtroOrden, filtroPresupuesto]);

  const totalMetasObj = useMemo(() => metas.reduce((s, m) => s + m.objetivo, 0), [metas]);
  const totalMetasAh = useMemo(() => metas.reduce((s, m) => s + m.ahorrado, 0), [metas]);
  const ultimasTx = [...transacciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);

  // Categorías que ya tienen transacciones (para filtros)
  const catsGastoUsadas = useMemo(() => [...new Set(transacciones.filter(t => t.tipo === "gasto").map(t => t.categoria))].filter(Boolean), [transacciones]);
  const catsIngresoUsadas = useMemo(() => [...new Set(transacciones.filter(t => t.tipo === "ingreso").map(t => t.categoria))].filter(Boolean), [transacciones]);

  const insightsHome = useMemo(() => {
    const base = generarInsights(transacciones, presupuesto, gastosPeriodo, "home");
    const hoy = new Date();
    const diaHoy = hoy.getDate();
    // Tarjetas al límite / en riesgo + fechas de corte/pago
    tarjetas.forEach(t => {
      const p = t.limite > 0 ? (t.deuda / t.limite) * 100 : 0;
      if (p >= 100) base.push({ tipo: "alerta", texto: `🚨 ${t.nombre} al límite (${p.toFixed(0)}%).` });
      else if (p >= 85) base.push({ tipo: "aviso", texto: `⚠️ ${t.nombre} al ${p.toFixed(0)}% de su límite.` });
      if (t.dia_corte) {
        const diff = t.dia_corte >= diaHoy ? t.dia_corte - diaHoy : (new Date(hoy.getFullYear(), hoy.getMonth() + 1, t.dia_corte) - hoy) / 86400000;
        const d = Math.ceil(diff);
        if (d >= 0 && d <= 3) base.push({ tipo: "aviso", texto: `📅 Corte de ${t.nombre} ${d === 0 ? "hoy" : `en ${d} día${d > 1 ? "s" : ""}`}.` });
      }
      if (t.dia_pago) {
        const diff = t.dia_pago >= diaHoy ? t.dia_pago - diaHoy : (new Date(hoy.getFullYear(), hoy.getMonth() + 1, t.dia_pago) - hoy) / 86400000;
        const d = Math.ceil(diff);
        if (d >= 0 && d <= 3) base.push({ tipo: "alerta", texto: `💳 Pago de ${t.nombre} vence ${d === 0 ? "hoy" : `en ${d} día${d > 1 ? "s" : ""}`}.` });
      }
    });
    // Gastos fijos pendientes
    const pendientes = gastosFijosConEstado.filter(g => !g.pagado);
    if (pendientes.length > 0) {
      const totalPend = pendientes.reduce((s, g) => s + g.monto, 0);
      base.push({ tipo: "aviso", texto: `📋 ${pendientes.length} gasto${pendientes.length > 1 ? "s" : ""} fijo${pendientes.length > 1 ? "s" : ""} sin pagar: ${fmt(totalPend)}.` });
    }
    // Días restantes del período
    if (presupuesto.fechaFin) {
      const fin = new Date(presupuesto.fechaFin + "T12:00:00");
      const dias = Math.ceil((fin - hoy) / 86400000);
      if (dias >= 0 && dias <= 7) base.push({ tipo: dias <= 2 ? "alerta" : "aviso", texto: `⏳ Quedan ${dias === 0 ? "hoy termina el período" : `${dias} día${dias > 1 ? "s" : ""} del período`}.` });
    }
    // ── Datos del día, mes y año al inicio del ticker ──
    const hoyStr = hoy.toISOString().split("T")[0];
    const mesStr = hoyStr.slice(0, 7);
    const añoStr = hoyStr.slice(0, 4);
    const mesNombre = hoy.toLocaleDateString("es-MX", { month: "long" });
    const gHoy = transacciones.filter(t => t.tipo === "gasto"    && t.fecha === hoyStr          && t.impacta_presupuesto !== false).reduce((s,t) => s+t.monto, 0);
    const iHoy = transacciones.filter(t => t.tipo === "ingreso"  && t.fecha === hoyStr).reduce((s,t) => s+t.monto, 0);
    const gMes = transacciones.filter(t => t.tipo === "gasto"    && t.fecha.startsWith(mesStr)  && t.impacta_presupuesto !== false).reduce((s,t) => s+t.monto, 0);
    const iMes = transacciones.filter(t => t.tipo === "ingreso"  && t.fecha.startsWith(mesStr)).reduce((s,t) => s+t.monto, 0);
    const gAño = transacciones.filter(t => t.tipo === "gasto"    && t.fecha.startsWith(añoStr)  && t.impacta_presupuesto !== false).reduce((s,t) => s+t.monto, 0);
    const iAño = transacciones.filter(t => t.tipo === "ingreso"  && t.fecha.startsWith(añoStr)).reduce((s,t) => s+t.monto, 0);
    // Gasto por tarjeta de crédito hoy
    tarjetas.forEach(tj => {
      const gastadoHoy = transacciones.filter(t => t.tipo === "gasto" && t.fecha === hoyStr && t.cuenta === tj.nombre).reduce((s,t) => s+t.monto, 0);
      if (gastadoHoy > 0) base.unshift({ tipo: "aviso", texto: `💳 ${tj.nombre}: -${fmt(gastadoHoy)} hoy.` });
    });
    base.unshift({ tipo: "info", texto: `📅 Hoy: ${iHoy > 0 ? `+${fmt(iHoy)} ingresos` : "sin ingresos"} · ${gHoy > 0 ? `-${fmt(gHoy)} gastos` : "sin gastos"}.` });
    base.unshift({ tipo: "info", texto: `📆 ${mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1)}: +${fmt(iMes)} ingresos · -${fmt(gMes)} gastos.` });
    base.unshift({ tipo: "info", texto: `📊 ${añoStr}: +${fmt(iAño)} ingresos · -${fmt(gAño)} gastos.` });
    return base;
  }, [transacciones, presupuesto, gastosPeriodo, tarjetas, gastosFijosConEstado]);
  const insightsFinanzas = useMemo(() => generarInsights(transacciones, presupuesto, gastosPeriodo, "ingresos"), [transacciones, presupuesto, gastosPeriodo, tarjetas, gastosFijosConEstado]);
  const insightsPres     = useMemo(() => generarInsights(transacciones, presupuesto, gastosPeriodo, "presupuesto"), [transacciones, presupuesto, gastosPeriodo, tarjetas, gastosFijosConEstado]);
  const insightsMetas    = useMemo(() => generarInsights(transacciones, presupuesto, gastosPeriodo, "metas"), [transacciones, presupuesto, gastosPeriodo, tarjetas, gastosFijosConEstado]);
  const insightsCuentas  = useMemo(() => generarInsights(transacciones, presupuesto, gastosPeriodo, "cuentas"), [transacciones, presupuesto, gastosPeriodo, tarjetas, gastosFijosConEstado]);
  const currentInsights = { home: insightsHome, ingresos: insightsFinanzas, gastos: insightsFinanzas, presupuesto: insightsPres, metas: insightsMetas, cuentas: insightsCuentas }[activeTab] || insightsHome;

  // ── HANDLERS CON AIRTABLE ───────────────────────────────────────────────────────
  const saving = (msg) => { setSyncStatus("saving"); setSyncMsg(msg); };
  const saved  = ()    => { setSyncStatus("ok");     setSyncMsg("Guardado ✓"); };
  const errAt  = (e)   => { setSyncStatus("error");  setSyncMsg("Error al guardar"); console.error(e); };

  // Transacciones
  const handleAdd = async () => {
    if (!form.descripcion || !form.monto || !form.fecha) return;
    const tarjetaObj = tarjetas.find(t => t.nombre === form.cuenta);
    const cuentaObj  = cuentas.find(c => c.nombre === form.cuenta);
    // Validar que exista como cuenta o tarjeta
    if (!cuentaObj && !tarjetaObj) {
      setFormError(`La cuenta "${form.cuenta}" no existe. Primero créala en la pestaña Cuentas.`);
      return;
    }
    const monto = parseFloat(form.monto);
    const fields = { tipo: form.tipo, categoria: form.categoria, descripcion: form.descripcion, monto, fecha: form.fecha, cuenta: form.cuenta, impacta_presupuesto: form.impacta_presupuesto };
    setFormError("");
    saving("Guardando transacción…");
    try {
      const rec = await atCreate("Transacciones", fields);
      setTransacciones(prev => [...prev, mapTx(rec)]);

      if (tarjetaObj && form.tipo === "gasto") {
        // ── Gasto con tarjeta de crédito: aumentar deuda ──
        const nuevaDeuda = (tarjetaObj.deuda || 0) + monto;
        await atUpdate("Tarjetas", tarjetaObj.id, { deuda: nuevaDeuda });
        setTarjetas(prev => prev.map(t => t.id === tarjetaObj.id ? { ...t, deuda: nuevaDeuda } : t));
      } else if (cuentaObj) {
        // ── Actualizar saldo de la cuenta automáticamente ──
        const delta = form.tipo === "ingreso" ? monto : -monto;
        const nuevoSaldo = (cuentaObj.saldo || 0) + delta;
        await atUpdate("Cuentas", cuentaObj.id, { saldo: nuevoSaldo });
        setCuentas(prev => prev.map(c => c.id === cuentaObj.id ? { ...c, saldo: nuevoSaldo } : c));
      }

      setForm({ tipo: form.tipo, categoria: form.tipo === "ingreso" ? (catsIngreso[0] || "Salario") : (catsGasto[0] || "Comida"), descripcion: "", monto: "", fecha: localDate(), cuenta: form.cuenta, impacta_presupuesto: true });
      setShowForm(false); saved();
    } catch(e) { errAt(e); }
  };

  const handleSaveEditModal = async () => {
    if (!editingTxId) return;
    saving("Guardando cambios…");
    try {
      const fields = { descripcion: editingTxData.descripcion, categoria: editingTxData.categoria, monto: parseFloat(editingTxData.monto) || 0, fecha: editingTxData.fecha, cuenta: editingTxData.cuenta, impacta_presupuesto: editingTxData.impacta_presupuesto };
      await atUpdate("Transacciones", editingTxId, fields);
      setTransacciones(prev => prev.map(t => t.id !== editingTxId ? t : { ...t, ...fields }));
      setEditingTxId(null); setShowEditModal(false); saved();
    } catch(e) { errAt(e); }
  };

  const handleSaveTxEdit = async () => {
    if (!editingTxId) return;
    saving("Guardando cambios…");
    try {
      const fields = {
        descripcion: editingTxData.descripcion,
        categoria: editingTxData.categoria,
        monto: parseFloat(editingTxData.monto) || 0,
        fecha: editingTxData.fecha,
        cuenta: editingTxData.cuenta,
        impacta_presupuesto: editingTxData.impacta_presupuesto,
      };
      await atUpdate("Transacciones", editingTxId, fields);
      setTransacciones(prev => prev.map(t => t.id !== editingTxId ? t : { ...t, ...fields }));
      setEditingTxId(null);
      saved();
    } catch(e) { errAt(e); }
  };

  const handleDeleteTx = async (id) => {
    if (!window.confirm("¿Eliminar esta transacción? Esta acción no se puede deshacer.")) return;
    saving("Eliminando…");
    try {
      // ── Revertir saldo al eliminar ──
      const tx = transacciones.find(t => t.id === id);
      if (tx) {
        const cuentaObj = cuentas.find(c => c.nombre === tx.cuenta);
        if (cuentaObj) {
          const delta = tx.tipo === "ingreso" ? -tx.monto : tx.monto;
          const nuevoSaldo = Math.max((cuentaObj.saldo || 0) + delta, 0);
          await atUpdate("Cuentas", cuentaObj.id, { saldo: nuevoSaldo });
          setCuentas(prev => prev.map(c => c.id === cuentaObj.id ? { ...c, saldo: nuevoSaldo } : c));
        }
      }
      await atDelete("Transacciones", id);
      setTransacciones(prev => prev.filter(t => t.id !== id));
      saved();
    } catch(e) { errAt(e); }
  };

  // Cuentas
  const startEdit = (c) => { setEditingId(c.id); setEditVal(c.saldo); };
  const saveEdit = async (id) => {
    const nuevoSaldo = parseFloat(editVal) || 0;
    saving("Guardando saldo…");
    try {
      await atUpdate("Cuentas", id, { saldo: nuevoSaldo });
      setCuentas(prev => prev.map(c => c.id !== id ? c : { ...c, saldo: nuevoSaldo }));
      setEditingId(null); saved();
    } catch(e) { errAt(e); }
  };

  const handleAddCuenta = async () => {
    if (!cuentaForm.nombre) return;
    const fields = { nombre: cuentaForm.nombre, tipo: cuentaForm.tipo, saldo: parseFloat(cuentaForm.saldo) || 0, interes_anual: parseFloat(cuentaForm.interes_anual) || null };
    saving("Guardando cuenta…");
    try {
      const rec = await atCreate("Cuentas", fields);
      setCuentas(prev => [...prev, mapCuenta(rec)]);
      setCuentaForm({ nombre: "", tipo: "debito", saldo: "" }); setShowCuentaForm(false); saved();
    } catch(e) { errAt(e); }
  };

  const handleDeleteCuenta = async (id) => {
    if (!window.confirm("¿Eliminar esta cuenta? Esta acción no se puede deshacer.")) return;
    saving("Eliminando…");
    try { await atDelete("Cuentas", id); setCuentas(prev => prev.filter(c => c.id !== id)); saved(); }
    catch(e) { errAt(e); }
  };

  // Tarjetas
  const handleAddTarjeta = async () => {
    if (!tarjetaForm.nombre) return;
    const fields = { nombre: tarjetaForm.nombre, limite: parseFloat(tarjetaForm.limite) || 0, deuda: parseFloat(tarjetaForm.deuda) || 0, dia_corte: parseInt(tarjetaForm.dia_corte) || null, dia_pago: parseInt(tarjetaForm.dia_pago) || null };
    saving("Guardando tarjeta…");
    try {
      const rec = await atCreate("Tarjetas", fields);
      setTarjetas(prev => [...prev, mapTarjeta(rec)]);
      setTarjetaForm({ nombre: "", limite: "", deuda: "" }); setShowTarjetaForm(false); saved();
    } catch(e) { errAt(e); }
  };

  const handleDeleteTarjeta = async (id) => {
    if (!window.confirm("¿Eliminar esta tarjeta? Esta acción no se puede deshacer.")) return;
    saving("Eliminando…");
    try { await atDelete("Tarjetas", id); setTarjetas(prev => prev.filter(t => t.id !== id)); saved(); }
    catch(e) { errAt(e); }
  };

  // Gastos fijos
  const handlePagoTarjeta = async () => {
    if (!pagoForm.tarjeta || !pagoForm.cuenta || !pagoForm.monto || !pagoForm.fecha) return;
    const monto = parseFloat(pagoForm.monto);
    const cuentaObj = cuentas.find(c => c.nombre === pagoForm.cuenta);
    const tarjetaObj = tarjetas.find(t => t.nombre === pagoForm.tarjeta);
    if (!cuentaObj || !tarjetaObj) return;
    // S4: Validar saldo suficiente
    if (cuentaObj.saldo < monto) {
      setTransfError(`Saldo insuficiente: ${fmt(cuentaObj.saldo)} disponible en ${cuentaObj.nombre}.`);
      return;
    }
    setTransfError("");
    saving("Registrando pago…");
    const createdTxIds = [];
    try {
      // Registrar transacción como gasto
      const desc = pagoForm.descripcion || `Pago ${pagoForm.tarjeta}`;
      const fields = { tipo: "gasto", categoria: "Pago tarjeta", descripcion: desc, monto, fecha: pagoForm.fecha, cuenta: pagoForm.cuenta, impacta_presupuesto: false };
      const rec = await atCreate("Transacciones", fields);
      createdTxIds.push(rec.id);
      setTransacciones(prev => [...prev, mapTx(rec)]);
      // Descontar saldo de la cuenta y reducir deuda de la tarjeta en paralelo
      const nuevoSaldoCuenta = (cuentaObj.saldo || 0) - monto;
      const nuevaDeuda = Math.max((tarjetaObj.deuda || 0) - monto, 0);
      await Promise.all([
        atUpdate("Cuentas",  cuentaObj.id,   { saldo: nuevoSaldoCuenta }),
        atUpdate("Tarjetas", tarjetaObj.id,  { deuda: nuevaDeuda })
      ]);
      setCuentas(prev => prev.map(c => c.id === cuentaObj.id   ? { ...c, saldo: nuevoSaldoCuenta } : c));
      setTarjetas(prev => prev.map(t => t.id === tarjetaObj.id ? { ...t, deuda: nuevaDeuda }       : t));
      setPagoForm({ tarjeta: "", cuenta: "", monto: "", fecha: localDate(), descripcion: "" });
      setShowPagoForm(false); saved();
    } catch(e) {
      // S3: Rollback si los updates fallaron
      if (createdTxIds.length > 0) {
        await Promise.all(createdTxIds.map(id => atDelete("Transacciones", id))).catch(() => {});
        setTransacciones(prev => prev.filter(t => !createdTxIds.includes(t.id)));
      }
      errAt(e);
    }
  };

  const handleAddFijo = async () => {
    if (!fijoForm.nombre || !fijoForm.monto) return;
    const fields = { nombre: fijoForm.nombre, categoria: fijoForm.categoria, monto: parseFloat(fijoForm.monto) };
    saving("Guardando gasto fijo…");
    try {
      const rec = await atCreate("GastosFijos", fields);
      setGastosFijos(prev => [...prev, mapFijo(rec)]);
      setFijoForm({ nombre: "", categoria: "Renta", monto: "" }); setShowFijoForm(false); saved();
    } catch(e) { errAt(e); }
  };

  const handleDeleteFijo = async (id) => {
    if (!window.confirm("¿Eliminar este gasto fijo?")) return;
    saving("Eliminando…");
    try { await atDelete("GastosFijos", id); setGastosFijos(prev => prev.filter(g => g.id !== id)); saved(); }
    catch(e) { errAt(e); }
  };

  // Metas
  const handleAddMeta = async () => {
    if (!metaForm.nombre || !metaForm.objetivo) return;
    const cols = [C.aliceBlue, C.honeydew, C.vanilla];
    const fields = { nombre: metaForm.nombre, objetivo: parseFloat(metaForm.objetivo), ahorrado: parseFloat(metaForm.ahorrado) || 0, emoji: metaForm.emoji, color: cols[metas.length % 3] };
    saving("Guardando meta…");
    try {
      const rec = await atCreate("Metas", fields);
      setMetas(prev => [...prev, mapMeta(rec)]);
      setMetaForm({ nombre: "", objetivo: "", ahorrado: "", emoji: "🎯" }); setShowMetaForm(false); saved();
    } catch(e) { errAt(e); }
  };

  const handleDeleteMeta = async (id) => {
    if (!window.confirm("¿Eliminar esta meta?")) return;
    saving("Eliminando…");
    try { await atDelete("Metas", id); setMetas(prev => prev.filter(m => m.id !== id)); saved(); }
    catch(e) { errAt(e); }
  };

  const handleAbonoMeta = async (id, abono) => {
    const meta = metas.find(m => m.id === id);
    if (!meta) return;
    const nuevoAhorrado = Math.min(meta.ahorrado + (parseFloat(abono) || 0), meta.objetivo);
    saving("Guardando abono…");
    try {
      await atUpdate("Metas", id, { ahorrado: nuevoAhorrado });
      setMetas(prev => prev.map(m => m.id === id ? { ...m, ahorrado: nuevoAhorrado } : m));
      setEditingMeta(null); saved();
    } catch(e) { errAt(e); }
  };

  // Presupuesto
  const handleSavePresupuesto = async () => {
    const campos = { nombre: presForm.nombre, periodo: presForm.periodo, total: parseFloat(presForm.total) || 0, fechaInicio: presForm.fechaInicio, fechaFin: presForm.fechaFin };
    saving("Guardando presupuesto…");
    try {
      if (presupuesto.id) {
        await atUpdate("Presupuesto", presupuesto.id, campos);
        setPresupuesto({ ...presForm, id: presupuesto.id, total: campos.total });
      } else {
        const rec = await atCreate("Presupuesto", campos);
        setPresupuesto(mapPres(rec));
      }
      setEditPres(false); saved();
    } catch(e) { errAt(e); }
  };

  const resetFiltros = () => { setFiltroTipo("todos"); setFiltroCuenta("todas"); setFiltroCategoria("todas"); setFiltroFechaDesde(""); setFiltroFechaHasta(""); setFiltroBusqueda(""); setFiltroOrden("fecha_desc"); setFiltroPresupuesto("todos"); };

  const handleTransferencia = async () => {
    if (!transf.origen || !transf.destino || !transf.monto) return;
    const monto = parseFloat(transf.monto);
    if (isNaN(monto) || monto <= 0) return;

    const origenCuenta   = cuentas.find(c => c.nombre === transf.origen);
    const destinoCuenta  = cuentas.find(c => c.nombre === transf.destino);
    const origenTarjeta  = tarjetas.find(t => t.nombre === transf.origen);
    const destinoTarjeta = tarjetas.find(t => t.nombre === transf.destino);

    // S4: Validar saldo suficiente antes de operar
    if (origenCuenta && origenCuenta.saldo < monto) {
      setTransfError(`Saldo insuficiente: ${fmt(origenCuenta.saldo)} disponible en ${origenCuenta.nombre}.`);
      return;
    }
    setTransfError("");
    saving("Registrando transferencia…");
    const createdTxIds = []; // S3: para rollback si los updates fallan
    try {
      if (origenCuenta && destinoCuenta) {
        // Cuenta → Cuenta
        const desc = transf.descripcion || `Transferencia ${origenCuenta.nombre} → ${destinoCuenta.nombre}`;
        const nuevoOrigen  = origenCuenta.saldo - monto;
        const nuevoDestino = destinoCuenta.saldo + monto;
        const [recSalida, recEntrada] = await Promise.all([
          atCreate("Transacciones", { tipo: "gasto",   categoria: "Transferencia", descripcion: desc, monto, fecha: transf.fecha, cuenta: origenCuenta.nombre,  impacta_presupuesto: false }),
          atCreate("Transacciones", { tipo: "ingreso", categoria: "Transferencia", descripcion: desc, monto, fecha: transf.fecha, cuenta: destinoCuenta.nombre, impacta_presupuesto: false }),
        ]);
        createdTxIds.push(recSalida.id, recEntrada.id);
        setTransacciones(prev => [...prev, mapTx(recSalida), mapTx(recEntrada)]);
        await Promise.all([
          atUpdate("Cuentas", origenCuenta.id,  { saldo: nuevoOrigen }),
          atUpdate("Cuentas", destinoCuenta.id, { saldo: nuevoDestino }),
        ]);
        setCuentas(prev => prev.map(c =>
          c.id === origenCuenta.id  ? { ...c, saldo: nuevoOrigen }  :
          c.id === destinoCuenta.id ? { ...c, saldo: nuevoDestino } : c
        ));
      } else if (origenCuenta && destinoTarjeta) {
        // Cuenta → Tarjeta (pagar tarjeta)
        const nuevoSaldo = origenCuenta.saldo - monto;
        const nuevaDeuda = Math.max(destinoTarjeta.deuda - monto, 0);
        const desc = transf.descripcion || `Pago ${destinoTarjeta.nombre}`;
        const rec = await atCreate("Transacciones", { tipo: "gasto", categoria: "Pago tarjeta", descripcion: desc, monto, fecha: transf.fecha, cuenta: origenCuenta.nombre, impacta_presupuesto: false });
        createdTxIds.push(rec.id);
        setTransacciones(prev => [...prev, mapTx(rec)]);
        await Promise.all([
          atUpdate("Cuentas",  origenCuenta.id,   { saldo: nuevoSaldo }),
          atUpdate("Tarjetas", destinoTarjeta.id, { deuda: nuevaDeuda }),
        ]);
        setCuentas (prev => prev.map(c => c.id === origenCuenta.id   ? { ...c, saldo: nuevoSaldo } : c));
        setTarjetas(prev => prev.map(t => t.id === destinoTarjeta.id ? { ...t, deuda: nuevaDeuda } : t));
      } else if (origenTarjeta && destinoCuenta) {
        // Tarjeta → Cuenta (gasto/retiro con tarjeta de crédito)
        const nuevaDeuda   = origenTarjeta.deuda + monto;
        const nuevoDestino = destinoCuenta.saldo + monto;
        const desc = transf.descripcion || `Retiro ${origenTarjeta.nombre}`;
        const rec = await atCreate("Transacciones", { tipo: "gasto", categoria: "Otro", descripcion: desc, monto, fecha: transf.fecha, cuenta: origenTarjeta.nombre, impacta_presupuesto: true });
        createdTxIds.push(rec.id);
        setTransacciones(prev => [...prev, mapTx(rec)]);
        await Promise.all([
          atUpdate("Tarjetas", origenTarjeta.id, { deuda: nuevaDeuda }),
          atUpdate("Cuentas",  destinoCuenta.id, { saldo: nuevoDestino }),
        ]);
        setTarjetas(prev => prev.map(t => t.id === origenTarjeta.id  ? { ...t, deuda: nuevaDeuda }   : t));
        setCuentas (prev => prev.map(c => c.id === destinoCuenta.id  ? { ...c, saldo: nuevoDestino } : c));
      } else {
        errAt(new Error("Combinación no válida")); return;
      }
      setTransf({ origen: "", destino: "", monto: "", descripcion: "", fecha: localDate() });
      setShowTransfForm(false);
      saved();
    } catch(e) {
      // S3: Rollback — eliminar transacciones creadas si los updates fallaron
      if (createdTxIds.length > 0) {
        await Promise.all(createdTxIds.map(id => atDelete("Transacciones", id))).catch(() => {});
        setTransacciones(prev => prev.filter(t => !createdTxIds.includes(t.id)));
      }
      errAt(e);
    }
  };

  const S = {
    page: { fontFamily: "'Urbanist', sans-serif", background: C.bg, minHeight: "100vh", color: C.text, width: "100%" },
    card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 20 },
    btnPrimary: { background: C.eerieBlack, border: "none", color: "#fff", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, padding: "11px 22px" },
    btnSec: { background: "none", border: `1.5px solid ${C.border}`, color: C.muted, borderRadius: 12, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 600 },
    lbl: { fontSize: 12, color: C.muted, display: "block", marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 },
    select: { background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: "Urbanist, sans-serif", fontSize: 13, fontWeight: 600, padding: "7px 12px", outline: "none", cursor: "pointer" },
  };

  const NAV = [
    { id: "home",         label: "🏠 Inicio" },
    { id: "ingresos",     label: "💰 Ingresos" },
    { id: "gastos",       label: "💸 Gastos" },
    { id: "presupuesto",  label: "🎯 Presupuesto" },
    { id: "cuentas",      label: "🏦 Cuentas" },
    { id: "metas",        label: "⭐ Metas" },
  ];

  const filtrosActivos = filtroTipo !== "todos" || filtroCuenta !== "todas" || filtroCategoria !== "todas" || filtroFechaDesde || filtroFechaHasta || filtroBusqueda;

  if (!hasLoaded && syncStatus === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, fontFamily: "'Urbanist', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw size={32} color={C.sage} style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <p style={{ color: C.muted, fontWeight: 600, fontSize: 15 }}>Cargando tus finanzas…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: ${C.bg}; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input, select { background: ${C.bg}; border: 1.5px solid ${C.border}; border-radius: 12px; color: ${C.text}; font-family: 'Urbanist', sans-serif; font-size: 14px; font-weight: 500; padding: 10px 14px; width: 100%; outline: none; transition: border-color 0.2s; }
        input:focus, select:focus { border-color: ${C.sage}; }
        select option { background: white; }
        .tab { background: none; border: none; cursor: pointer; font-family: 'Urbanist', sans-serif; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 8px; transition: all 0.2s; }
        .tab.active { background: ${C.sage}; color: white; } .tab:not(.active) { color: ${C.muted}; }
        .nav-tab { background: none; border: none; cursor: pointer; font-family: 'Urbanist', sans-serif; font-size: 14px; font-weight: 700; padding: 12px 16px; border-bottom: 2.5px solid transparent; transition: all 0.2s; color: ${C.muted}; white-space: nowrap; }
        .nav-tab.active { color: ${C.eerieBlack}; border-bottom-color: ${C.sage}; }
        .icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 5px; border-radius: 8px; transition: background 0.2s; color: ${C.soft}; }
        .icon-btn:hover { background: ${C.aliceBlue}; color: ${C.eerieBlack}; }
        .progress-bar { height: 8px; border-radius: 4px; background: ${C.bg}; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .row-hover:hover { background: ${C.bg}; }
        .fijo-pendiente { opacity: 0.38; }
        .meta-card { transition: transform 0.2s, box-shadow 0.2s; }
        .meta-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }
        .kpi-card { transition: transform 0.15s; }
        .kpi-card:hover { transform: translateY(-1px); }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { display: flex; animation: ticker 32s linear infinite; white-space: nowrap; }
        .ticker-track:hover { animation-play-state: paused; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-5px); } 40%,80% { transform: translateX(5px); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .sync-error { animation: shake 0.4s ease; }
        .fade { animation: fadeIn 0.22s ease; }
        .slide-up { animation: slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1); }
        .cal-cell:hover { opacity: 0.7; }
        .filter-select { background: ${C.bg}; border: 1.5px solid ${C.border}; border-radius: 10px; color: ${C.text}; font-family: 'Urbanist', sans-serif; font-size: 13px; font-weight: 600; padding: 7px 12px; outline: none; cursor: pointer; transition: border-color 0.2s; }
        .filter-select:focus { border-color: ${C.sage}; }
        .chip { display: inline-flex; align-items: center; gap: 4px; padding: "2px 10px"; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .nav-tab { transition: color 0.18s, border-bottom-color 0.18s; }
        .row-hover { transition: background 0.12s; }
        button { transition: opacity 0.15s, transform 0.12s; }
        button:active { opacity: 0.75; transform: scale(0.97); }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -1.5 }}>Salto Cuántico</h1>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, letterSpacing: 1 }}>FINANZAS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <p style={{ color: C.soft, fontSize: 13, fontWeight: 500 }}>Tu control financiero personal</p>
            <a href="https://airtable.com/appOnwaGxsTKHCEWI/tblOGaAmA0Zm7REcR/viwA4g8HiUhkWUsgw?blocks=hide" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.sky, background: C.aliceBlue, border: `1px solid #b8cce0`, borderRadius: 8, padding: "3px 9px", textDecoration: "none", letterSpacing: 0.3 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Airtable
            </a>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {(activeTab === "ingresos" || activeTab === "gastos") && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={activeTab === "ingresos" ? S.btnPrimary : { ...S.btnPrimary, background: C.rose, borderColor: C.rose }} onClick={() => { setForm(f => ({ ...f, tipo: activeTab === "ingresos" ? "ingreso" : "gasto", categoria: activeTab === "ingresos" ? (catsIngreso[0] || "Salario") : (catsGasto[0] || "Comida") })); setShowForm(!showForm); }}>
                <Plus size={16} /> {activeTab === "ingresos" ? "Nuevo ingreso" : "Nuevo gasto"}
              </button>
              <button style={{ ...S.btnSec, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowCatForm(!showCatForm)}>🏷️ Categorías</button>
            </div>
          )}

          {activeTab === "presupuesto" && <button style={S.btnPrimary} onClick={() => setShowFijoForm(!showFijoForm)}><Plus size={16} /> Gasto fijo</button>}
          {activeTab === "metas" && <button style={S.btnPrimary} onClick={() => setShowMetaForm(!showMetaForm)}><Plus size={16} /> Nueva meta</button>}
          {activeTab === "cuentas" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.btnPrimary} onClick={() => { setShowCuentaForm(!showCuentaForm); setShowTarjetaForm(false); }}><Plus size={16} /> Cuenta</button>
              <button style={{ ...S.btnSec, display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setShowTarjetaForm(!showTarjetaForm); setShowCuentaForm(false); }}><CreditCard size={14} /> Tarjeta</button>
              <button style={{ ...S.btnSec, display: "flex", alignItems: "center", gap: 6, color: C.rose, borderColor: C.rose }} onClick={() => { setPagoForm(f => ({ ...f, tarjeta: tarjetas[0]?.nombre || "", cuenta: cuentas[0]?.nombre || "" })); setShowPagoForm(true); }}><Wallet size={14} /> Pagar tarjeta</button>
            </div>
          )}
        </div>
      </div>

      {/* ── NAV ── */}
      <div style={{ padding: "14px 24px 0", borderBottom: `1.5px solid ${C.border}`, display: "flex", overflowX: "auto" }}>
        {NAV.map(t => <button key={t.id} className={`nav-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
      </div>

      {/* ── CINTA INSIGHTS (todas las páginas) ── */}
      <InsightTicker insights={currentInsights} />

      {/* ══════════════════════ HOME ══════════════════════ */}
      {activeTab === "home" && (
        <>
        <div style={{ padding: "24px 24px 40px" }}>

          {/* Título + acciones rápidas */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Resumen de <span style={{ color: C.sage }}>{presupuesto.nombre}</span></h2>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{presupuesto.periodo} · {fmtFecha(presupuesto.fechaInicio)} – {fmtFecha(presupuesto.fechaFin)}</p>
              </div>
              <button onClick={() => setShowFechasHome(!showFechasHome)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontFamily: "Urbanist, sans-serif", fontSize: 13, fontWeight: 600, color: C.muted }}>
                <Calendar size={14} /> Cambiar fechas {showFechasHome ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {/* Desplegable fechas */}
            {showFechasHome && (
              <div className="fade" style={{ marginTop: 12, ...S.card, padding: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={S.lbl}>Nombre del período</label>
                  <input value={presupuesto.nombre} onChange={e => setPresupuesto({ ...presupuesto, nombre: e.target.value })} placeholder="Ej: Febrero 2026" />
                </div>
                <div>
                  <label style={S.lbl}>Desde</label>
                  <input type="date" value={presupuesto.fechaInicio} onChange={e => setPresupuesto({ ...presupuesto, fechaInicio: e.target.value })} style={{ width: "auto" }} />
                </div>
                <div>
                  <label style={S.lbl}>Hasta</label>
                  <input type="date" value={presupuesto.fechaFin} onChange={e => setPresupuesto({ ...presupuesto, fechaFin: e.target.value })} style={{ width: "auto" }} />
                </div>
                <div>
                  <label style={S.lbl}>Presupuesto total</label>
                  <input type="number" value={presupuesto.total} onChange={e => setPresupuesto({ ...presupuesto, total: parseFloat(e.target.value) || 0 })} style={{ width: 130 }} />
                </div>
                <button onClick={() => setShowFechasHome(false)} style={{ ...S.btnPrimary, marginTop: 18, alignSelf: "flex-end" }}><Check size={14}/> Listo</button>
              </div>
            )}
          </div>

          {/* Avisos corte/pago tarjetas — modal central */}
          {!avisoCerrado && (() => {
            const hoy = new Date();
            const manana = hoy.getDate() + 1;
            const avisos = [];
            tarjetas.forEach(t => {
              if (t.dia_pago && t.dia_pago === manana) avisos.push({ tipo: "pago", nombre: t.nombre, dia: t.dia_pago, color: C.rose, bg: "#fce8e8" });
            });
            if (avisos.length === 0) return null;
            return (
              <div onClick={() => setAvisoCerrado(true)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(420px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: "#fef9e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔔</div>
                      <h3 style={{ fontSize: 16, fontWeight: 900 }}>Recordatorio de tarjeta</h3>
                    </div>
                    <button onClick={() => setAvisoCerrado(true)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {avisos.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, background: a.bg, border: `1.5px solid ${a.color}` }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <CreditCard size={18} color={a.color} />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 800, color: a.color }}>
                            {a.tipo === "corte" ? "Mañana es tu fecha de corte" : "Mañana es tu fecha de pago"}
                          </p>
                          <p style={{ fontSize: 12, color: a.color, opacity: 0.8, marginTop: 2 }}>{a.nombre} · Día {a.dia}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", marginTop: 20 }} onClick={() => setAvisoCerrado(true)}>Entendido</button>
                </div>
              </div>
            );
          })()}

          {/* Tarjeta Patrimonio Neto */}
          <div style={{ ...S.card, marginBottom: 16, padding: 24, background: "linear-gradient(135deg, #eef6f0 0%, #e8f4ff 100%)", border: "1px solid #d0e8d8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.muted }}>Patrimonio neto</p>
                  <button onClick={() => setHidePatrimonio(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", padding: 2 }}>
                    {hidePatrimonio ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                <p style={{ fontSize: 38, fontWeight: 900, letterSpacing: -2, color: totalDisponible - totalDeuda >= 0 ? C.sage : C.rose }}>
                  {hidePatrimonio ? "******" : fmt(totalDisponible - totalDeuda)}
                </p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Dinero disponible menos deudas</p>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>Activos</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: C.sage }}>{hidePatrimonio ? "****" : `+${fmt(totalDisponible)}`}</p>
                  <p style={{ fontSize: 11, color: C.soft, marginTop: 2 }}>{cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>Deudas</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: C.rose }}>{hidePatrimonio ? "****" : `-${fmt(totalDeuda)}`}</p>
                  <p style={{ fontSize: 11, color: C.soft, marginTop: 2 }}>{tarjetas.length} tarjeta{tarjetas.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
            {/* Barra visual activos vs deuda */}
            {(totalDisponible + totalDeuda) > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((totalDisponible / (totalDisponible + totalDeuda)) * 100, 100)}%`, background: "linear-gradient(90deg, #7ee8a2, #34d399)", borderRadius: 99, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 10, color: C.muted }}>Activos {((totalDisponible / (totalDisponible + totalDeuda)) * 100).toFixed(0)}%</span>
                  <span style={{ fontSize: 10, color: C.muted }}>Deuda {((totalDeuda / (totalDisponible + totalDeuda)) * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Fila 1: Presupuesto + KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ ...S.card, padding: 24, background: C.aliceBlue, border: `1px solid #b8cce0`, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: C.sky, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Disponible real</p>
                <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: -2 }}>{fmt(disponiblePres)}</p>
                <p style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>De {fmt(presupuesto.total)} pres.</p>
                <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                  <div><p style={{ fontSize: 10, color: C.sky, fontWeight: 700 }}>GASTADO</p><p style={{ fontSize: 16, fontWeight: 800, color: C.rose }}>{fmt(gastosPeriodo)}</p></div>
                  <div>
                    <p style={{ fontSize: 10, color: C.sky, fontWeight: 700 }}>DISPONIBLE</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: C.sage }}>{fmt(disponiblePres)}</p>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: C.sky, marginTop: 10 }}>{pct(gastosPeriodo, presupuesto.total).toFixed(0)}% utilizado</p>
              </div>
              <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
                <PieChart width={120} height={120}>
                  <Pie data={[{ name: "Gastado", value: gastosPeriodo || 0.01 }, { name: "Disponible", value: Math.max(disponiblePres, 0.01) }]} cx={56} cy={56} innerRadius={35} outerRadius={54} paddingAngle={0} dataKey="value" startAngle={90} endAngle={-270}>
                    <Cell fill="#e0e0e0" />
                    <Cell fill="#7aab8a" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: "Urbanist", fontSize: 11 }} formatter={v => [fmt(v)]} />
                </PieChart>
                <div style={{ position: "absolute", top: 56, left: 56, transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                  <p style={{ fontSize: 14, fontWeight: 900, letterSpacing: -0.5, color: C.eerieBlack }}>{Math.max(100 - pct(gastosPeriodo, presupuesto.total), 0).toFixed(0)}%</p>
                  <p style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>libre</p>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Ingresos del período", val: ingresosPeriodo, bg: C.honeydew, color: C.sage, icon: "↑" },
                { label: "Egresos del período", val: gastosPeriodoAll, bg: "#fce8e8", color: C.rose, icon: "↓" },
                { label: "Balance", val: balancePeriodo, bg: C.aliceBlue, color: C.sky, icon: "=" },
              ].map(k => (
                <div key={k.label} className="kpi-card" style={{ ...S.card, padding: "14px 20px", background: k.bg, border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: k.color }}>{k.icon}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: k.color }}>{k.label}</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{fmt(k.val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fila 2: Crédito + Distribución */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16, alignItems: "stretch" }}>
            <div style={{ ...S.card, padding: 24, display: "flex", flexDirection: "column", maxHeight: 360, overflow: "hidden" }}>
              <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>💳 Crédito</p>
              {tarjetas.length === 0 ? <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin tarjetas registradas</p> : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 12 }}>
                    {[{ label: "Deuda total", val: totalDeuda, color: C.rose }, { label: "Límite total", val: totalLimite, color: C.muted }, { label: "Crédito libre", val: totalLimite - totalDeuda, color: C.sage }].map(k => (
                      <div key={k.label} style={{ textAlign: "center", padding: "8px 4px", borderRight: k.label !== "Crédito libre" ? `1px solid ${C.border}` : "none" }}>
                        <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 3 }}>{k.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 900, color: k.color }}>{fmt(k.val)}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
                    {tarjetas.map(t => {
                      const p = pct(t.deuda, t.limite);
                      return (
                        <div key={t.id} style={{ padding: "10px 12px", borderRadius: 12, background: C.bg }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{t.nombre}</span>
                              {p >= 100 && <span style={{ fontSize: 9, fontWeight: 800, background: C.rose, color: "white", borderRadius: 4, padding: "1px 6px" }}>LLENA</span>}
                              {p >= 85 && p < 100 && <span style={{ fontSize: 9, fontWeight: 800, background: C.amber, color: "white", borderRadius: 4, padding: "1px 6px" }}>RIESGO</span>}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 800, color: C.rose }}>{fmt(t.deuda)}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "#e0e0e8", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(p, 100)}%`, background: p > 80 ? C.rose : p > 50 ? C.amber : C.sage }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: C.muted }}>Disponible: {fmt(Math.max(t.limite - t.deuda, 0))}</span>
                            <div style={{ display: "flex", gap: 8 }}>
                              {t.dia_corte > 0 && <span style={{ fontSize: 10, color: C.muted }}>Corte: {t.dia_corte}</span>}
                              {t.dia_pago  > 0 && <span style={{ fontSize: 10, color: C.muted }}>Pago: {t.dia_pago}</span>}
                              <span style={{ fontSize: 10, color: p >= 85 ? C.rose : C.muted }}>{p.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div style={{ ...S.card, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 800 }}>Distribución</p>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className={`tab ${tabPie === "gasto" ? "active" : ""}`} onClick={() => setTabPie("gasto")}>Gastos</button>
                  <button className={`tab ${tabPie === "ingreso" ? "active" : ""}`} onClick={() => setTabPie("ingreso")}>Ingresos</button>
                </div>
              </div>
              {pieData.length === 0 ? <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>Sin datos</div> : (
                <div style={{ position: "relative" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                        style={{ cursor: "pointer" }}
                        onClick={(data) => { setActiveTab(tabPie === "gasto" ? "gastos" : "ingresos"); setFiltroCategoria(data.name); }}>
                        {pieData.map((_, i) => { const pal = tabPie === "gasto" ? PIE_PALETTE_GASTO : PIE_PALETTE_INGRESO; return <Cell key={i} fill={pal[i % pal.length]} />; })}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <p style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.5, color: tabPie === "gasto" ? C.rose : C.sage }}>{fmt(pieData.reduce((s, d) => s + d.value, 0))}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>total</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: Últimas tx + Dinero disponible */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16, alignItems: "stretch" }}>
            <div style={{ ...S.card, padding: 0, overflow: "hidden", maxHeight: 360 }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 800 }}>Últimas transacciones</p>
                <button onClick={() => setActiveTab("ingresos")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.sage, fontWeight: 700, fontFamily: "inherit" }}>Ver todas →</button>
              </div>
              {ultimasTx.length === 0 && <p style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 13 }}>Sin transacciones aún</p>}
              <div style={{ overflowY: "auto", flex: 1 }}>
              {ultimasTx.map((t, i) => (
                <div key={t.id} className="row-hover" onClick={() => { setEditingTxId(t.id); setEditingTxData({ fecha: t.fecha, categoria: t.categoria, descripcion: t.descripcion, cuenta: t.cuenta, monto: t.monto, impacta_presupuesto: t.impacta_presupuesto, tipo: t.tipo }); setShowEditModal(true); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", borderBottom: i < ultimasTx.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: t.tipo === "ingreso" ? C.honeydew : "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{CUENTA_ICONS[t.cuenta] || "💳"}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{t.descripcion}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>{t.categoria} · {new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: t.tipo === "ingreso" ? C.sage : C.rose }}>{t.tipo === "ingreso" ? "+" : "-"}{fmt(t.monto)}</span>
                </div>
              ))}
              </div>
            </div>
            {/* Tarjeta dinero disponible — azul (aliceBlue) como Balance */}
            <div style={{ ...S.card, padding: 22, background: C.aliceBlue, border: `1px solid #b8cce0`, maxHeight: 360, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 14, color: C.sky }}>💰 Dinero disponible</p>
              <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: C.sky, fontWeight: 700, marginBottom: 4 }}>TOTAL EN CUENTAS</p>
                <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>{fmt(totalDisponible)}</p>
                <p style={{ fontSize: 11, color: C.sky, marginTop: 2 }}>Sin tarjetas de crédito</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflowY: "auto" }}>
                {cuentas.filter(c => c.saldo > 0).map(c => (
                  <div key={c.id} onClick={() => setActiveTab("cuentas")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 9, background: "rgba(255,255,255,0.5)", cursor: "pointer", transition: "opacity 0.15s" }} onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    <span style={{ fontSize: 13 }}>{CUENTA_ICONS[c.nombre] || (c.tipo === "ahorro" ? "🏦" : "💳")} {c.nombre}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(c.saldo)}</span>
                      {c.tipo === "ahorro" && <span style={{ fontSize: 9, background: C.vanilla, borderRadius: 4, padding: "1px 5px", fontWeight: 700, color: C.amber }}>ahorro</span>}
                    </div>
                  </div>
                ))}
                {cuentas.filter(c => c.saldo > 0).length === 0 && <p style={{ color: C.sky, fontSize: 12, textAlign: "center", padding: "10px 0" }}>Sin saldos registrados</p>}
              </div>
            </div>
          </div>

        </div>

        {/* Ingresos vs Gastos por día */}
        <div style={{ ...S.card, padding: 24, margin: "0 0 0 0", borderRadius: 0, borderTop: `1px solid ${C.border}`, borderLeft: "none", borderRight: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>Ingresos vs Gastos por día</h3>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fmtFecha(presupuesto.fechaInicio)} – {fmtFecha(presupuesto.fechaFin)}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <select value={lineChartCat} onChange={e => setLineChartCat(e.target.value)} className="filter-select" style={{ fontSize: 12, padding: "5px 10px" }}>
                <option value="todas">Todas las categorías</option>
                {[...new Set(transacciones.filter(t => t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin).map(t => t.categoria))].sort().map(c => <option key={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 3, borderRadius: 2, background: C.sage }} /><span style={{ fontSize: 12, color: C.muted }}>Ingresos</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 3, borderRadius: 2, background: C.rose }} /><span style={{ fontSize: 12, color: C.muted }}>Gastos</span></div>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: C.muted, fontSize: 11, fontFamily: "Urbanist" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: C.muted, fontSize: 11, fontFamily: "Urbanist" }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? "" : `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomLineTooltip />} />
              <Line type="monotone" dataKey="ingresos" stroke={C.sage} strokeWidth={2.5} dot={{ fill: C.sage, strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: C.sage }} />
              <Line type="monotone" dataKey="gastos" stroke={C.rose} strokeWidth={2.5} dot={{ fill: C.rose, strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: C.rose }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Calendario de actividad estilo GitHub - full width */}
        <div style={{ ...S.card, padding: 24, marginTop: 0, borderRadius: 0, borderTop: `1px solid ${C.border}`, borderLeft: "none", borderRight: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800 }}>📅 Constancia de registro</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Días en que metiste datos</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                {[
                  { color: "#eee",    label: "Sin movimientos" },
                  { color: "#c6e0d0", label: "1 movimiento" },
                  { color: "#8ec4a8", label: "2 movimientos" },
                  { color: "#7aab8a", label: "3–4 movimientos" },
                  { color: "#4a8a6a", label: "5 o más" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, border: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.sage, background: C.honeydew, borderRadius: 10, padding: "5px 12px" }}>
              {Object.keys((() => { const m = {}; transacciones.forEach(t => { m[t.fecha] = 1; }); return m; })()).length} días activos
            </div>
          </div>
          <div style={{ overflowX: "auto", paddingTop: 20, width: "95%", margin: "0 auto" }}>
            <ActivityCalendar transacciones={transacciones} />
          </div>
        </div>
        </>
      )}

      {/* ══════════════════════ INGRESOS ══════════════════════ */}
      {/* ══════════════════════ GASTOS   ══════════════════════ */}
      {(activeTab === "ingresos" || activeTab === "gastos") && (
        <>
          {showCatForm && (
            <div className="fade" style={{ margin: "24px 24px 0" }}>
              <div style={{ ...S.card, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>🏷️ Gestionar categorías</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {[{ label: "Gastos", tipo: "gasto", cats: catsGasto }, { label: "Ingresos", tipo: "ingreso", cats: catsIngreso }].map(({ label, tipo, cats }) => (
                    <div key={tipo}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{label}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {cats.map(cat => (
                          <span key={cat} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: tipo === "gasto" ? "#fce8e8" : C.honeydew, color: tipo === "gasto" ? C.rose : C.sage, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                            {cat}
                            <button onClick={() => handleDeleteCat(tipo, cat)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                  <select value={newCatTipo} onChange={e => setNewCatTipo(e.target.value)} style={{ width: "auto" }}>
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                  <input placeholder="Nueva categoría..." value={newCatNombre} onChange={e => setNewCatNombre(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddCat()} style={{ flex: 1 }} />
                  <button style={{ ...S.btnPrimary, padding: "10px 16px" }} onClick={handleAddCat}><Plus size={14} /></button>
                  <button style={S.btnSec} onClick={() => setShowCatForm(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          )}



          {/* KPIs según pestaña */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, margin: "24px 24px 0" }}>
            {(activeTab === "ingresos" ? [
              { label: "Ingresos del período", val: ingresosPeriodo, bg: C.honeydew, ic: C.sage, icon: <TrendingUp size={20}/> },
              { label: "Ingresos totales", val: totalIngresos, bg: C.honeydew, ic: C.sage, icon: <Wallet size={20}/> },
              { label: "Balance del período", val: balancePeriodo, bg: C.aliceBlue, ic: C.sky, icon: <TrendingUp size={20}/> },
            ] : [
              { label: "Gastos del período", val: gastosPeriodoAll, bg: "#fce8e8", ic: C.rose, icon: <TrendingDown size={20}/> },
              { label: "Gastos totales", val: totalGastos, bg: "#fce8e8", ic: C.rose, icon: <Wallet size={20}/> },
              { label: "Disponible presupuesto", val: disponiblePres, bg: C.aliceBlue, ic: C.sky, icon: <TrendingDown size={20}/> },
            ]).map(k => (
              <div key={k.label} style={{ ...S.card, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.ic, flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{k.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{fmt(k.val)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pie — fijo según pestaña activa */}
          {(() => {
            const tipo = activeTab === "ingresos" ? "ingreso" : "gasto";
            const cats = {};
            transacciones.filter(t => t.tipo === tipo).forEach(t => { cats[t.categoria] = (cats[t.categoria] || 0) + t.monto; });
            const data = Object.entries(cats).map(([name, value]) => ({ name, value }));
            return (
              <div style={{ ...S.card, margin: "20px 24px 0", padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Por categoría</h3>
                {data.length === 0 ? <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>Sin datos</div> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={75} outerRadius={120} paddingAngle={3} dataKey="value">
                        {(() => { const pal = tipo === "gasto" ? PIE_PALETTE_GASTO : PIE_PALETTE_INGRESO; return data.map((_, i) => <Cell key={i} fill={pal[i % pal.length]} />); })()}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })()}

          {/* ── TABLA CON FILTROS ── */}
          <div style={{ ...S.card, margin: "16px 24px 24px" }}>
            <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>{activeTab === "ingresos" ? "Ingresos" : "Gastos"}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{txFiltradas.length} de {transacciones.length}</span>
                  <button onClick={() => setShowFiltros(!showFiltros)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: filtrosActivos ? C.aliceBlue : "none", border: `1.5px solid ${filtrosActivos ? C.sky : C.border}`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontFamily: "Urbanist, sans-serif", fontSize: 13, fontWeight: 700, color: filtrosActivos ? C.sky : C.muted }}>
                    <Filter size={13} /> Filtros {filtrosActivos && <span style={{ background: C.sky, color: "white", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>!</span>}
                  </button>
                  {filtrosActivos && <button onClick={resetFiltros} style={{ fontSize: 12, color: C.rose, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>× Limpiar</button>}
                </div>
              </div>

              {/* Panel de filtros */}
              {showFiltros && (
                <div className="fade" style={{ background: C.bg, borderRadius: 14, padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
                  {/* Búsqueda */}
                  <div style={{ gridColumn: "1/-1", position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
                    <input placeholder="Buscar por descripción o categoría..." value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} style={{ paddingLeft: 34 }} />
                  </div>

                  <div>
                    <label style={S.lbl}>Cuenta</label>
                    <select className="filter-select" style={{ width: "100%" }} value={filtroCuenta} onChange={e => setFiltroCuenta(e.target.value)}>
                      <option value="todas">Todas</option>
                      {cuentasEnTransacciones.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Categoría</label>
                    <select className="filter-select" style={{ width: "100%" }} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                      <option value="todas">Todas</option>
                      {(activeTab === "ingresos" ? catsIngresoUsadas : activeTab === "gastos" ? catsGastoUsadas : [...new Set([...catsGastoUsadas, ...catsIngresoUsadas])]).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Desde</label>
                    <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.lbl}>Hasta</label>
                    <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.lbl}>Impacta presupuesto</label>
                    <select className="filter-select" style={{ width: "100%" }} value={filtroPresupuesto} onChange={e => setFiltroPresupuesto(e.target.value)}>
                      <option value="todos">Todos</option>
                      <option value="si">Sí impacta</option>
                      <option value="no">No impacta</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Ordenar por</label>
                    <select className="filter-select" style={{ width: "100%" }} value={filtroOrden} onChange={e => setFiltroOrden(e.target.value)}>
                      <option value="fecha_desc">Fecha (reciente)</option>
                      <option value="fecha_asc">Fecha (antigua)</option>
                      <option value="monto_desc">Monto (mayor)</option>
                      <option value="monto_asc">Monto (menor)</option>
                      <option value="categoria_asc">Categoría A-Z</option>
                      <option value="descripcion_asc">Descripción A-Z</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Resumen de filtros activos */}
              {filtrosActivos && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {filtroTipo !== "todos" && <span style={{ background: C.aliceBlue, color: C.sky, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{filtroTipo === "ingreso" ? "Ingresos" : "Gastos"}</span>}
                  {filtroCuenta !== "todas" && <span style={{ background: C.honeydew, color: C.sage, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{filtroCuenta}</span>}
                  {filtroCategoria !== "todas" && <span style={{ background: C.vanilla, color: C.amber, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{filtroCategoria}</span>}
                  {filtroFechaDesde && <span style={{ background: C.bg, color: C.muted, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${C.border}` }}>Desde: {filtroFechaDesde}</span>}
                  {filtroFechaHasta && <span style={{ background: C.bg, color: C.muted, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${C.border}` }}>Hasta: {filtroFechaHasta}</span>}
                  {filtroBusqueda && <span style={{ background: C.bg, color: C.muted, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${C.border}` }}>"{filtroBusqueda}"</span>}
                  {filtroPresupuesto !== "todos" && <span style={{ background: C.honeydew, color: C.sage, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{filtroPresupuesto === "si" ? "Impacta presupuesto" : "No impacta presupuesto"}</span>}
                </div>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Fecha","Tipo","Categoría","Descripción","Cuenta","Monto","Pres.",""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
                <tr><td colSpan={8} style={{ padding: "4px 16px 6px", fontSize: 10, color: C.soft, fontStyle: "italic" }}>Toca la fecha para editarla · toca la fila para editar todos los campos</td></tr></thead>
                <tbody>
                  {txFiltradas.map(t => {
                    const openEdit = () => { setEditingTxId(t.id); setEditingTxData({ fecha: t.fecha, categoria: t.categoria, descripcion: t.descripcion, cuenta: t.cuenta, monto: t.monto, impacta_presupuesto: t.impacta_presupuesto, tipo: t.tipo }); setShowEditModal(true); };
                    return (
                      <tr key={t.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }} onClick={openEdit}>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: C.muted, whiteSpace: "nowrap" }} onClick={e => { e.stopPropagation(); setEditingDateTxId(t.id); setEditingDateVal(t.fecha); }}>
                          {editingDateTxId === t.id
                            ? <input type="date" value={editingDateVal} onChange={e => setEditingDateVal(e.target.value)} autoFocus onClick={e => e.stopPropagation()} onBlur={async () => { if (editingDateVal && editingDateVal !== t.fecha) { saving("Guardando fecha…"); try { await atUpdate("Transacciones", t.id, { fecha: editingDateVal }); setTransacciones(prev => prev.map(tx => tx.id !== t.id ? tx : { ...tx, fecha: editingDateVal })); saved(); } catch(ex) { errAt(ex); } } setEditingDateTxId(null); }} style={{ fontSize: 12, padding: "3px 6px", width: 128 }} />
                            : <span style={{ borderBottom: `1px dashed ${C.border}`, paddingBottom: 1, cursor: "text" }}>{new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}</span>
                          }
                        </td>
                        <td style={{ padding: "12px 16px" }}><span style={{ background: t.tipo === "ingreso" ? C.honeydew : "#fce8e8", color: t.tipo === "ingreso" ? C.sage : C.rose, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{t.tipo === "ingreso" ? "Ingreso" : "Gasto"}</span></td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{t.categoria}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: C.muted }}>{t.descripcion}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{CUENTA_ICONS[t.cuenta] || "💳"} {t.cuenta}</td>
                        <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800 }}>
                          <span style={{ color: t.tipo === "ingreso" ? C.sage : C.rose }}>{t.tipo === "ingreso" ? "+" : "-"}{fmt(t.monto)}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {t.impacta_presupuesto
                            ? <span style={{ fontSize: 10, fontWeight: 700, background: C.honeydew, color: C.sage, borderRadius: 6, padding: "2px 7px" }}>✓</span>
                            : <span style={{ fontSize: 10, fontWeight: 700, background: C.bg, color: C.muted, borderRadius: 6, padding: "2px 7px", border: `1px solid ${C.border}` }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDeleteTx(t.id)} className="icon-btn"><Trash2 size={14}/></button>
                        </td>
                      </tr>
                    );
                  })}
                  {txFiltradas.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.muted }}>No hay transacciones con esos filtros</td></tr>}
                </tbody>
              </table>
            </div>
            {/* Total filtrado */}
            {txFiltradas.length > 0 && (
              <div style={{ padding: "12px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 24, justifyContent: "flex-end" }}>
                {activeTab === "ingresos" ? (
                  <span style={{ fontSize: 13, color: C.sage, fontWeight: 700 }}>Ingresos: {fmt(txFiltradas.reduce((s, t) => s + t.monto, 0))}</span>
                ) : activeTab === "gastos" ? (
                  <span style={{ fontSize: 13, color: C.rose, fontWeight: 700 }}>Gastos: {fmt(txFiltradas.reduce((s, t) => s + t.monto, 0))}</span>
                ) : (
                  <>
                    <span style={{ fontSize: 13, color: C.sage, fontWeight: 700 }}>Ingresos: {fmt(txFiltradas.filter(t => t.tipo === "ingreso").reduce((s, t) => s + t.monto, 0))}</span>
                    <span style={{ fontSize: 13, color: C.rose, fontWeight: 700 }}>Gastos: {fmt(txFiltradas.filter(t => t.tipo === "gasto").reduce((s, t) => s + t.monto, 0))}</span>
                    <span style={{ fontSize: 13, color: C.sky, fontWeight: 800 }}>Balance: {fmt(txFiltradas.filter(t => t.tipo === "ingreso").reduce((s, t) => s + t.monto, 0) - txFiltradas.filter(t => t.tipo === "gasto").reduce((s, t) => s + t.monto, 0))}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── HISTORIAL DE TRANSFERENCIAS ── */}
          {(() => {
            const txTransf = transacciones
              .filter(t => (t.categoria === "Transferencia" && t.tipo === "gasto") || t.categoria === "Pago tarjeta")
              .sort((a, b) => b.fecha.localeCompare(a.fecha));
            return (
              <div style={{ ...S.card, margin: "16px 24px 24px" }}>
                <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>Historial de transferencias</h3>
                </div>
                {txTransf.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Sin transferencias registradas</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["Fecha","Tipo","Descripción","Cuenta","Monto",""].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {txTransf.map(t => {
                          const openEditT = () => { setEditingTxId(t.id); setEditingTxData({ fecha: t.fecha, categoria: t.categoria, descripcion: t.descripcion, cuenta: t.cuenta, monto: t.monto, impacta_presupuesto: t.impacta_presupuesto, tipo: t.tipo }); setShowEditModal(true); };
                          return (
                            <tr key={t.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }} onClick={openEditT}>
                              <td style={{ padding: "12px 16px", fontSize: 13, color: C.muted, whiteSpace: "nowrap" }} onClick={e => { e.stopPropagation(); setEditingDateTxId(t.id); setEditingDateVal(t.fecha); }}>
                                {editingDateTxId === t.id
                                  ? <input type="date" value={editingDateVal} onChange={e => setEditingDateVal(e.target.value)} autoFocus onClick={e => e.stopPropagation()} onBlur={async () => { if (editingDateVal && editingDateVal !== t.fecha) { saving("Guardando fecha…"); try { await atUpdate("Transacciones", t.id, { fecha: editingDateVal }); setTransacciones(prev => prev.map(tx => tx.id !== t.id ? tx : { ...tx, fecha: editingDateVal })); saved(); } catch(ex) { errAt(ex); } } setEditingDateTxId(null); }} style={{ fontSize: 12, padding: "3px 6px", width: 128 }} />
                                  : <span style={{ borderBottom: `1px dashed ${C.border}`, paddingBottom: 1, cursor: "text" }}>{new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}</span>
                                }
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{ background: "#e8f0fe", color: C.sky, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                                  {t.categoria === "Pago tarjeta" ? "Pago tarjeta" : "Transferencia"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: 13, color: C.muted }}>{t.descripcion}</td>
                              <td style={{ padding: "12px 16px", fontSize: 13 }}>{CUENTA_ICONS[t.cuenta] || "💳"} {t.cuenta}</td>
                              <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 800, color: C.rose }}>-{fmt(t.monto)}</td>
                              <td style={{ padding: "12px 16px" }}></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ══════════════════════ PRESUPUESTO ══════════════════════ */}
      {activeTab === "presupuesto" && (
        <>
          {editPres && (
            <div onClick={() => setEditPres(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(480px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: C.vanilla, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎯</div>
                    <h3 style={{ fontSize: 16, fontWeight: 900 }}>Configurar presupuesto</h3>
                  </div>
                  <button onClick={() => setEditPres(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1/-1" }}><label style={S.lbl}>Nombre</label><input value={presForm.nombre} onChange={e => setPresForm({ ...presForm, nombre: e.target.value })} autoFocus /></div>
                  <div><label style={S.lbl}>Período</label><select value={presForm.periodo} onChange={e => setPresForm({ ...presForm, periodo: e.target.value })}>{PERIODOS.map(p => <option key={p}>{p}</option>)}</select></div>
                  <div><label style={S.lbl}>Total (MXN)</label><input type="number" value={presForm.total} onChange={e => setPresForm({ ...presForm, total: e.target.value })} /></div>
                  <div><label style={S.lbl}>Fecha inicio</label><input type="date" value={presForm.fechaInicio} onChange={e => setPresForm({ ...presForm, fechaInicio: e.target.value })} /></div>
                  <div><label style={S.lbl}>Fecha fin</label><input type="date" value={presForm.fechaFin} onChange={e => setPresForm({ ...presForm, fechaFin: e.target.value })} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }} onClick={handleSavePresupuesto}>Guardar presupuesto</button>
                  <button style={S.btnSec} onClick={() => setEditPres(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          {(!editPres || true) && (
            <div style={{ margin: "24px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.vanilla, display: "flex", alignItems: "center", justifyContent: "center" }}><Calendar size={18} color={C.amber} /></div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 17 }}>{presupuesto.nombre}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{presupuesto.periodo} · {fmtFecha(presupuesto.fechaInicio)} – {fmtFecha(presupuesto.fechaFin)}</p>
                </div>
              </div>
              <button style={{ ...S.btnSec, display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setPresForm({ ...presupuesto }); setEditPres(true); }}><Edit2 size={14}/> Editar</button>
            </div>
          )}
          {showFijoForm && (
            <div onClick={() => setShowFijoForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(420px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📌</div>
                    <h3 style={{ fontSize: 16, fontWeight: 900 }}>Nuevo gasto fijo</h3>
                  </div>
                  <button onClick={() => setShowFijoForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={S.lbl}>Monto (MXN)</label>
                    <input type="text" inputMode="decimal" placeholder="0.00 o 100+50" value={fijoForm.monto}
                      onChange={e => setFijoForm({ ...fijoForm, monto: e.target.value })}
                      onBlur={e => {
                        try {
                          const val = e.target.value.trim();
                          if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(val)) {
                            const result = Function('"use strict"; return (' + val + ')')();
                            if (!isNaN(result) && isFinite(result)) setFijoForm(f => ({ ...f, monto: String(Math.abs(result)) }));
                          }
                        } catch {}
                      }} autoFocus />
                  </div>
                  <div><label style={S.lbl}>Nombre</label><input placeholder="Ej: Netflix" value={fijoForm.nombre} onChange={e => setFijoForm({ ...fijoForm, nombre: e.target.value })} /></div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label style={S.lbl}>Categoría</label>
                      <button onClick={() => setInlineCat({ show: !inlineCat.show, context: "fijo", val: "" })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.sky, fontWeight: 700, padding: 0 }}>+</button>
                    </div>
                    {inlineCat.show && inlineCat.context === "fijo" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input placeholder="Nombre categoría" value={inlineCat.val} onChange={e => setInlineCat(s => ({ ...s, val: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleAddCatInline("fijo")} autoFocus style={{ flex: 1 }} />
                        <button onClick={() => handleAddCatInline("fijo")} style={{ ...S.btnPrimary, padding: "0 12px" }}><Check size={14}/></button>
                        <button onClick={() => setInlineCat({ show: false, context: null, val: "" })} style={{ ...S.btnSec, padding: "0 10px" }}><X size={14}/></button>
                      </div>
                    ) : (
                      <select value={fijoForm.categoria} onChange={e => setFijoForm({ ...fijoForm, categoria: e.target.value })}>
                        {[...new Set([...CATEGORIAS_GASTO, ...catsGasto])].map(c => <option key={c}>{c}</option>)}
                      </select>
                    )}
                  </div>

                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }} onClick={handleAddFijo}>Agregar gasto fijo</button>
                  <button style={S.btnSec} onClick={() => setShowFijoForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, margin: "20px 24px 0" }}>
            {[
              { label: "Presupuesto total", val: presupuesto.total, bg: C.vanilla, ic: C.amber, icon: <Target size={20}/> },
              { label: "Gastado en período", val: gastosPeriodo, bg: "#fce8e8", ic: C.rose, icon: <TrendingDown size={20}/> },
              { label: "Disponible", val: disponiblePres, bg: C.honeydew, ic: C.sage, icon: <Wallet size={20}/> },
            ].map(k => (
              <div key={k.label} style={{ ...S.card, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.ic, flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{k.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{fmt(k.val)}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, margin: "12px 24px 24px" }}>
            <div style={{ ...S.card, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Consumido</h3>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{pct(gastosPeriodo, presupuesto.total).toFixed(0)}% utilizado · <span style={{ color: C.sage, fontWeight: 700 }}>{fmt(disponiblePres)} restante</span></p>
              <div style={{ position: "relative" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[{ name: "Gastado", value: gastosPeriodo || 0.01 }, { name: "Disponible", value: Math.max(disponiblePres, 0.01) }]} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={0} dataKey="value" startAngle={90} endAngle={-270}>
                      <Cell fill="#e0e0e0" />
                      <Cell fill="#7aab8a" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, fontFamily: "Urbanist", fontSize: 13 }} formatter={v => [fmt(v)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                  <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: -0.5, color: C.text }}>{fmt(disponiblePres)}</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>disponible</p>
                </div>
              </div>
              <div className="progress-bar" style={{ marginTop: 10, height: 10 }}>
                <div className="progress-fill" style={{ width: `${pct(gastosPeriodo, presupuesto.total)}%`, background: pct(gastosPeriodo, presupuesto.total) > 85 ? C.rose : pct(gastosPeriodo, presupuesto.total) > 60 ? C.amber : C.sage }} />
              </div>
            </div>
            <div style={{ ...S.card, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>Gastos fijos</h3>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.sage, fontWeight: 700 }}>✓ {fmt(gastosFijosConEstado.filter(g => g.pagado).reduce((s, g) => s + g.monto, 0))}</span>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>○ {fmt(gastosFijosConEstado.filter(g => !g.pagado).reduce((s, g) => s + g.monto, 0))}</span>
                </div>
              </div>
              <p style={{ fontSize: 10, color: C.soft, marginBottom: 10 }}>Verde cuando el gasto acumulado de esa categoría cubre el monto fijo. Eliminar un gasto fijo solo borra el recordatorio, no afecta las transacciones.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                {gastosFijosConEstado.length === 0 && <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Agrega gastos fijos ↑</p>}
                {gastosFijosConEstado.map(gf => (
                  <div key={gf.id} className={gf.pagado ? "" : "fijo-pendiente"} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 12, background: gf.pagado ? C.honeydew : C.bg, border: `1.5px ${gf.pagado ? "solid" : "dashed"} ${gf.pagado ? "#a0c8a8" : C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: gf.pagado ? C.sage : C.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {gf.pagado ? <Check size={12} color="white" /> : <span style={{ fontSize: 10, color: C.muted }}>○</span>}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{gf.nombre}</p>
                        <p style={{ fontSize: 10, color: C.muted }}>{gf.categoria}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{fmt(gf.monto)}</span>
                      <button className="icon-btn" onClick={() => handleDeleteFijo(gf.id)}><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════ METAS ══════════════════════ */}
      {activeTab === "metas" && (
        <>
          {showMetaForm && (
            <div onClick={() => setShowMetaForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(460px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: C.aliceBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⭐</div>
                    <h3 style={{ fontSize: 16, fontWeight: 900 }}>Nueva meta de ahorro</h3>
                  </div>
                  <button onClick={() => setShowMetaForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
                  <div><label style={S.lbl}>Emoji</label><input placeholder="🎯" value={metaForm.emoji} onChange={e => setMetaForm({ ...metaForm, emoji: e.target.value })} /></div>
                  <div><label style={S.lbl}>Nombre</label><input placeholder="Ej: Viaje a Europa" value={metaForm.nombre} onChange={e => setMetaForm({ ...metaForm, nombre: e.target.value })} autoFocus /></div>
                  <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={S.lbl}>Monto objetivo (MXN)</label><input type="number" placeholder="0.00" value={metaForm.objetivo} onChange={e => setMetaForm({ ...metaForm, objetivo: e.target.value })} /></div>
                    <div><label style={S.lbl}>Ya ahorrado (MXN)</label><input type="number" placeholder="0.00" value={metaForm.ahorrado} onChange={e => setMetaForm({ ...metaForm, ahorrado: e.target.value })} /></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }} onClick={handleAddMeta}>Crear meta</button>
                  <button style={S.btnSec} onClick={() => setShowMetaForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, margin: "24px 24px 0" }}>
            {[
              { label: "Total a ahorrar", val: totalMetasObj, bg: C.aliceBlue, ic: C.sky, icon: <Target size={20}/> },
              { label: "Ya ahorrado", val: totalMetasAh, bg: C.honeydew, ic: C.sage, icon: <ChevronUp size={20}/> },
              { label: "Falta en total", val: totalMetasObj - totalMetasAh, bg: C.vanilla, ic: C.amber, icon: <Star size={20}/> },
            ].map(k => (
              <div key={k.label} style={{ ...S.card, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.ic, flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{k.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{fmt(k.val)}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, margin: "12px 24px 24px" }}>
            {metas.length === 0 && <div style={{ ...S.card, padding: 60, textAlign: "center", color: C.muted, gridColumn: "1/-1" }}><p style={{ fontSize: 36, marginBottom: 12 }}>⭐</p><p style={{ fontWeight: 600 }}>Sin metas aún.</p></div>}
            {metas.map(meta => {
              const p = pct(meta.ahorrado, meta.objetivo);
              const barC = p >= 100 ? C.sage : p > 60 ? C.amber : C.sky;
              return (
                <div key={meta.id} className="meta-card" style={{ ...S.card, padding: 24, background: meta.color }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div><span style={{ fontSize: 28 }}>{meta.emoji}</span><p style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>{meta.nombre}</p></div>
                    <button onClick={() => handleDeleteMeta(meta.id)} className="icon-btn"><Trash2 size={14}/></button>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>AHORRADO</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{p.toFixed(0)}%</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 9 }}>
                      <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: -1 }}>{fmt(meta.ahorrado)}</p>
                      <span style={{ fontSize: 12, color: C.muted }}>de {fmt(meta.objetivo)}</span>
                    </div>
                    <div className="progress-bar" style={{ background: "rgba(255,255,255,0.5)" }}>
                      <div className="progress-fill" style={{ width: `${p}%`, background: barC }} />
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 7 }}>{p >= 100 ? "🎉 ¡Meta alcanzada!" : `Faltan ${fmt(meta.objetivo - meta.ahorrado)}`}</p>
                  </div>
                  {p < 100 && (editingMeta === meta.id ? (
                    <div style={{ marginTop: 12, display: "flex", gap: 7 }}>
                      <input id={`ab-${meta.id}`} type="number" placeholder="Monto a abonar" style={{ background: "rgba(255,255,255,0.7)" }} />
                      <button style={{ ...S.btnPrimary, padding: "8px 12px", fontSize: 13, flexShrink: 0 }} onClick={() => handleAbonoMeta(meta.id, document.getElementById(`ab-${meta.id}`).value)}><Check size={14}/></button>
                      <button className="icon-btn" onClick={() => setEditingMeta(null)}><X size={16}/></button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingMeta(meta.id)} style={{ marginTop: 12, width: "100%", background: "rgba(33,33,33,0.08)", border: "none", borderRadius: 10, padding: "8px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Plus size={14}/> Abonar
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════ CUENTAS ══════════════════════ */}
      {activeTab === "cuentas" && (
        <>
          {showCuentaForm && (
            <div onClick={() => setShowCuentaForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(440px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: C.honeydew, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏦</div>
                    <h3 style={{ fontSize: 16, fontWeight: 900 }}>Agregar cuenta</h3>
                  </div>
                  <button onClick={() => setShowCuentaForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div><label style={S.lbl}>Nombre / Alias</label><input placeholder="Ej: Nu Ahorro" value={cuentaForm.nombre} onChange={e => setCuentaForm({ ...cuentaForm, nombre: e.target.value })} autoFocus /></div>
                  <div><label style={S.lbl}>Tipo de cuenta</label>
                    <select value={cuentaForm.tipo} onChange={e => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}>
                      <option value="debito">Débito</option>
                      <option value="ahorro">Ahorro</option>
                      <option value="efectivo">Efectivo</option>
                    </select></div>
                  <div><label style={S.lbl}>Saldo actual (MXN)</label><input type="number" placeholder="0.00" value={cuentaForm.saldo} onChange={e => setCuentaForm({ ...cuentaForm, saldo: e.target.value })} /></div>
                  <div><label style={S.lbl}>Interés anual (%) <span style={{fontWeight:400,color:C.muted}}>opcional</span></label><input type="number" placeholder="Ej: 7.5" step="0.1" value={cuentaForm.interes_anual} onChange={e => setCuentaForm({ ...cuentaForm, interes_anual: e.target.value })} /></div>
                  {cuentaForm.tipo === "ahorro" && <p style={{ fontSize: 12, color: C.sage, background: C.honeydew, borderRadius: 10, padding: "8px 12px" }}>🏦 Las cuentas de ahorro se incluyen en tu dinero disponible pero se destacan visualmente.</p>}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }} onClick={handleAddCuenta}>Agregar cuenta</button>
                  <button style={S.btnSec} onClick={() => setShowCuentaForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          {showTarjetaForm && (
            <div onClick={() => setShowTarjetaForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(440px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💳</div>
                    <h3 style={{ fontSize: 16, fontWeight: 900 }}>Agregar tarjeta de crédito</h3>
                  </div>
                  <button onClick={() => setShowTarjetaForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
                </div>
                <p style={{ fontSize: 12, color: C.rose, marginBottom: 14, background: "#fce8e8", borderRadius: 10, padding: "8px 12px" }}>💳 Las tarjetas de crédito NO se suman a tu dinero disponible — son deuda.</p>
                <div style={{ display: "grid", gap: 12 }}>
                  <div><label style={S.lbl}>Nombre</label><input placeholder="Ej: Nu Card" value={tarjetaForm.nombre} onChange={e => setTarjetaForm({ ...tarjetaForm, nombre: e.target.value })} autoFocus /></div>
                  <div><label style={S.lbl}>Límite (MXN)</label><input type="number" placeholder="0.00" value={tarjetaForm.limite} onChange={e => setTarjetaForm({ ...tarjetaForm, limite: e.target.value })} /></div>
                  <div><label style={S.lbl}>Deuda actual (MXN)</label><input type="number" placeholder="0.00" value={tarjetaForm.deuda} onChange={e => setTarjetaForm({ ...tarjetaForm, deuda: e.target.value })} /></div>
                  <div><label style={S.lbl}>Día de corte</label><input type="number" placeholder="Ej: 15" min="1" max="31" value={tarjetaForm.dia_corte} onChange={e => setTarjetaForm({ ...tarjetaForm, dia_corte: e.target.value })} /></div>
                  <div><label style={S.lbl}>Día de pago</label><input type="number" placeholder="Ej: 5" min="1" max="31" value={tarjetaForm.dia_pago} onChange={e => setTarjetaForm({ ...tarjetaForm, dia_pago: e.target.value })} /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }} onClick={handleAddTarjeta}>Agregar tarjeta</button>
                  <button style={S.btnSec} onClick={() => setShowTarjetaForm(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* KPIs + Gráficas */}
          {/* Fila 1: 3 KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, margin: "16px 24px 0" }}>
            {[
              { label: "Dinero disponible", val: totalDisponible, bg: C.honeydew, ic: C.sage, icon: <Wallet size={18}/>, desc: "Débito + ahorro + efectivo" },
              { label: "En cuentas de ahorro", val: totalAhorro, bg: C.vanilla, ic: C.amber, icon: <PiggyBank size={18}/>, desc: "Solo cuentas tipo ahorro" },
              { label: "Deuda en tarjetas", val: totalDeuda, bg: "#fce8e8", ic: C.rose, icon: <CreditCard size={18}/>, desc: "No incluido en disponible" },
            ].map(k => (
              <div key={k.label} style={{ ...S.card, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.ic, flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 2, fontWeight: 600 }}>{k.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>{fmt(k.val)}</p>
                  <p style={{ fontSize: 11, color: C.soft, marginTop: 1 }}>{k.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fila 2: Dos pie charts — Gastos e Ingresos del período */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "14px 24px 0" }}>
            {[
              { tipo: "gasto", label: "Gastos del período", color: C.rose, palette: ["#c47a7a","#d4948a","#e4a898","#c46060","#a45050","#e47a6a","#b46050","#f4a898"] },
              { tipo: "ingreso", label: "Ingresos del período", color: C.sage, palette: ["#7aab8a","#8abc9a","#9ac4a8","#6a9b7a","#5a8b6a","#8abcaa","#7aac9a","#aadaba"] },
            ].map(({ tipo, label, color, palette }) => {
              const cats = {};
              transacciones
                .filter(t => t.tipo === tipo && t.fecha >= presupuesto.fechaInicio && t.fecha <= presupuesto.fechaFin)
                .forEach(t => { cats[t.categoria] = (cats[t.categoria] || 0) + t.monto; });
              const data = Object.entries(cats).map(([name, value]) => ({ name, value }));
              const total = data.reduce((s, d) => s + d.value, 0);
              return (
                <div key={tipo} style={{ ...S.card, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 800 }}>{label}</p>
                    <span style={{ fontSize: 13, fontWeight: 900, color }}>{fmt(total)}</span>
                  </div>
                  {data.length === 0 ? (
                    <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13 }}>Sin datos en el período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} dataKey="value">
                          {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cuentas agrupadas */}
          <div style={{ margin: "20px 24px 0" }}>
            {["debito", "ahorro", "efectivo"].map(tipo => {
              const grupo = getCuentasOrdenadas(cuentas.filter(c => c.tipo === tipo));
              if (grupo.length === 0) return null;
              const iconoTipo = tipo === "ahorro" ? "🏦" : tipo === "efectivo" ? "💵" : "💳";
              return (
                <div key={tipo} style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{iconoTipo} {TIPO_CUENTA_LABEL[tipo]}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                    {grupo.map(cuenta => (
                      <div key={cuenta.id} className="fade"
                        draggable
                        onDragStart={e => handleDragStartCuenta(e, cuenta.id, tipo)}
                        onDragOver={e => { e.preventDefault(); setDragOver(cuenta.id); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={e => handleDropCuenta(e, cuenta.id, tipo)}
                        style={{ ...S.card, padding: 20, background: tipo === "ahorro" ? C.vanilla : tipo === "efectivo" ? "#f0f5ee" : C.card, borderColor: dragOver === cuenta.id ? C.sky : tipo === "ahorro" ? "#d8d070" : C.border, position: "relative", paddingBottom: 40, cursor: "grab", transition: "border-color 0.15s, transform 0.15s", transform: dragOver === cuenta.id ? "scale(1.02)" : "scale(1)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 22 }}>{CUENTA_ICONS[cuenta.nombre] || (tipo === "ahorro" ? "🏦" : "💳")}</span>
                            <p style={{ fontSize: 14, fontWeight: 800 }}>{cuenta.nombre}</p>
                          </div>
                          <GripVertical size={14} color={C.muted} style={{ cursor: "grab", flexShrink: 0 }} />
                        </div>
                        <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>SALDO</p>
                        {editingId === cuenta.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)} style={{ fontSize: 16, fontWeight: 800, padding: "4px 10px" }} autoFocus />
                            <button className="icon-btn" onClick={() => saveEdit(cuenta.id)}><Check size={15}/></button>
                            <button className="icon-btn" onClick={() => setEditingId(null)}><X size={15}/></button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>{fmt(cuenta.saldo)}</p>
                            <button className="icon-btn" onClick={() => startEdit(cuenta)}><Edit2 size={13}/></button>
                          </div>
                        )}
                        {cuenta.interes_anual && (
                          <p style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginTop: 8, background: C.vanilla, borderRadius: 7, padding: "3px 8px", display: "inline-block" }}>🏦 {cuenta.interes_anual}% anual</p>
                        )}
                        <button onClick={() => handleDeleteCuenta(cuenta.id)} className="icon-btn" style={{ position: "absolute", bottom: 12, right: 12 }}><Trash2 size={13}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tarjetas crédito con visual completo */}
          {tarjetas.length > 0 && (
            <div style={{ margin: "0 24px 24px" }}>
              <p style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                💳 Tarjetas de Crédito <span style={{ fontSize: 11, color: C.rose, fontWeight: 600, letterSpacing: 0, textTransform: "none" }}>(no cuentan como dinero disponible)</span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {getTarjetasOrdenadas().map(t => (
                  <div key={t.id}
                    draggable
                    onDragStart={e => handleDragStartTarjeta(e, t.id)}
                    onDragOver={e => { e.preventDefault(); setDragOver(t.id); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDropTarjeta(e, t.id)}
                    style={{ outline: dragOver === t.id ? `2px solid ${C.sky}` : "none", borderRadius: 20, transition: "outline 0.15s, transform 0.15s", transform: dragOver === t.id ? "scale(1.02)" : "scale(1)", cursor: "grab" }}>
                    <CreditCardVisual tarjeta={t} onDelete={() => handleDeleteTarjeta(t.id)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}



      {/* ── MODAL RÁPIDO FLOTANTE para pestañas sin form propio ── */}
      {showForm && !["home","ingresos","gastos"].includes(activeTab) && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 1000, width: "min(560px, 92vw)" }}>
          <div style={{ ...S.card, padding: 22, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: form.tipo === "ingreso" ? C.sage : C.rose }}>
              {form.tipo === "ingreso" ? "💰 Nuevo ingreso" : "💸 Nuevo gasto"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
              <div><label style={S.lbl}>Categoría</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {(form.tipo === "gasto" ? catsGasto : catsIngreso).map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div><label style={S.lbl}>Cuenta</label>
                <select value={form.cuenta} onChange={e => setForm({ ...form, cuenta: e.target.value })}>
                  {cuentas.length === 0
                    ? <option disabled>Sin cuentas</option>
                    : cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre} ({fmt(c.saldo)})</option>)}
                </select></div>
              <div><label style={S.lbl}>Descripción</label>
                <input placeholder="Ej: Super del mes" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
              <div><label style={S.lbl}>Monto</label>
                <input type="number" placeholder="0.00" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></div>
              <div><label style={S.lbl}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button style={{ ...S.btnPrimary, background: form.tipo === "ingreso" ? C.sage : C.rose, borderColor: form.tipo === "ingreso" ? C.sage : C.rose }} onClick={handleAdd}>Guardar</button>
              <button style={S.btnSec} onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SYNC BADGE FIJO esquina inferior derecha ── */}
      {/* ── MODAL PAGO TARJETA ── */}
      {showPagoForm && (
        <div onClick={() => setShowPagoForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(460px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💳</div>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>Pagar tarjeta de crédito</h3>
              </div>
              <button onClick={() => setShowPagoForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: C.muted, background: C.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
              💡 Se descontará de tu cuenta y reducirá la deuda de la tarjeta.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={S.lbl}>Tarjeta a pagar</label>
                <select value={pagoForm.tarjeta} onChange={e => setPagoForm({ ...pagoForm, tarjeta: e.target.value })}>
                  {tarjetas.length === 0
                    ? <option disabled>Sin tarjetas registradas</option>
                    : tarjetas.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Pagar con cuenta</label>
                <select value={pagoForm.cuenta} onChange={e => setPagoForm({ ...pagoForm, cuenta: e.target.value })}>
                  {cuentas.length === 0
                    ? <option disabled>Sin cuentas registradas</option>
                    : cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.lbl}>Monto (MXN)</label>
                  <input type="number" placeholder="0.00" value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} autoFocus />
                </div>
                <div>
                  <label style={S.lbl}>Fecha</label>
                  <input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={S.lbl}>Descripción (opcional)</label>
                <input placeholder={`Pago ${pagoForm.tarjeta || "tarjeta"}`} value={pagoForm.descripcion} onChange={e => setPagoForm({ ...pagoForm, descripcion: e.target.value })} />
              </div>
              {pagoForm.tarjeta && pagoForm.monto && (
                <div style={{ background: "#fce8e8", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.rose, fontWeight: 600 }}>
                  Nueva deuda de {pagoForm.tarjeta}: {fmt(Math.max((tarjetas.find(t => t.nombre === pagoForm.tarjeta)?.deuda || 0) - parseFloat(pagoForm.monto || 0), 0))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center", background: C.rose, borderColor: C.rose }} onClick={handlePagoTarjeta}>Registrar pago</button>
              <button style={S.btnSec} onClick={() => setShowPagoForm(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR TRANSACCIÓN ── */}
      {showEditModal && editingTxId && (
        <div onClick={() => { setShowEditModal(false); setEditingTxId(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1150, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(500px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: editingTxData.tipo === "ingreso" ? C.honeydew : "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{editingTxData.tipo === "ingreso" ? "💰" : "💸"}</div>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>Editar {editingTxData.tipo === "ingreso" ? "ingreso" : "gasto"}</h3>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingTxId(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={S.lbl}>Monto (MXN)</label><input type="number" value={editingTxData.monto} onChange={e => setEditingTxData(d => ({ ...d, monto: e.target.value }))} autoFocus /></div>
              <div><label style={S.lbl}>Fecha</label><input type="date" value={editingTxData.fecha} onChange={e => setEditingTxData(d => ({ ...d, fecha: e.target.value }))} /></div>
              <div><label style={S.lbl}>Categoría</label>
                <select value={editingTxData.categoria} onChange={e => setEditingTxData(d => ({ ...d, categoria: e.target.value }))}>
                  {(editingTxData.tipo === "ingreso" ? catsIngreso : catsGasto).map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div><label style={S.lbl}>Cuenta</label>
                <select value={editingTxData.cuenta} onChange={e => setEditingTxData(d => ({ ...d, cuenta: e.target.value }))}>
                  {[...cuentas.map(c => c.nombre), ...tarjetas.map(t => t.nombre)].filter((v,i,a)=>a.indexOf(v)===i).map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div style={{ gridColumn: "1/-1" }}><label style={S.lbl}>Descripción</label><input value={editingTxData.descripcion} onChange={e => setEditingTxData(d => ({ ...d, descripcion: e.target.value }))} /></div>
              <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderRadius: 10, padding: "10px 14px" }}>
                <div><p style={{ fontSize: 13, fontWeight: 700 }}>Impacta presupuesto</p></div>
                <button onClick={() => setEditingTxData(d => ({ ...d, impacta_presupuesto: !d.impacta_presupuesto }))}
                  style={{ width: 42, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: editingTxData.impacta_presupuesto ? C.sage : C.border, transition: "background 0.2s", position: "relative" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: editingTxData.impacta_presupuesto ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }} onClick={handleSaveEditModal}>Guardar cambios</button>
              <button onClick={() => { setShowEditModal(false); setEditingTxId(null); handleDeleteTx(editingTxId); }} style={{ ...S.btnSec, color: C.rose, borderColor: C.rose }}>Eliminar</button>
              <button style={S.btnSec} onClick={() => { setShowEditModal(false); setEditingTxId(null); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FABs circulares — inferior izquierda ── */}
      <div style={{ position: "fixed", bottom: 24, left: 24, display: "flex", flexDirection: "row", gap: 10, zIndex: 999 }}>
        <button title="Nuevo ingreso"
          onClick={() => { setForm(f => ({ ...f, tipo: "ingreso", categoria: catsIngreso[0] || "Salario", cuenta: f.cuenta || (cuentas[0]?.nombre || "") })); setShowForm(true); }}
          style={{ width: 52, height: 52, borderRadius: "50%", background: C.sage, color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.20)", fontSize: 24, fontWeight: 900, transition: "transform 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>+</button>
        <button title="Nuevo gasto"
          onClick={() => { setForm(f => ({ ...f, tipo: "gasto", categoria: catsGasto[0] || "Comida", cuenta: f.cuenta || (cuentas[0]?.nombre || "") })); setShowForm(true); }}
          style={{ width: 52, height: 52, borderRadius: "50%", background: C.rose, color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.20)", fontSize: 24, fontWeight: 900, transition: "transform 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>−</button>
        <button title="Transferencia / Pago"
          onClick={() => setShowTransfForm(true)}
          style={{ width: 52, height: 52, borderRadius: "50%", background: C.sky, color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.20)", transition: "transform 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}><ArrowLeftRight size={20} /></button>
      </div>

      {/* ── MODAL TRANSFERENCIA / PAGO ── */}
      {showTransfForm && (
        <div onClick={() => setShowTransfForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(460px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: C.aliceBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔄</div>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>Transferencia / Pago</h3>
              </div>
              <button onClick={() => setShowTransfForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: C.muted, background: C.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 16 }}>
              💡 Mueve dinero entre cuentas o paga una tarjeta de crédito.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={S.lbl}>Saliente (origen)</label>
                <select value={transf.origen} onChange={e => setTransf(f => ({ ...f, origen: e.target.value, destino: "" }))}>
                  <option value="">— Selecciona —</option>
                  <optgroup label="Cuentas">
                    {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </optgroup>
                  <optgroup label="Tarjetas de crédito">
                    {tarjetas.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label style={S.lbl}>Entrante (destino)</label>
                <select value={transf.destino} onChange={e => setTransf(f => ({ ...f, destino: e.target.value }))}>
                  <option value="">— Selecciona —</option>
                  <optgroup label="Cuentas">
                    {cuentas.filter(c => c.nombre !== transf.origen).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </optgroup>
                  <optgroup label="Tarjetas de crédito">
                    {tarjetas.filter(t => t.nombre !== transf.origen).map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                  </optgroup>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.lbl}>Monto (MXN)</label>
                  <input type="number" placeholder="0.00" value={transf.monto} onChange={e => setTransf(f => ({ ...f, monto: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label style={S.lbl}>Fecha</label>
                  <input type="date" value={transf.fecha} onChange={e => setTransf(f => ({ ...f, fecha: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={S.lbl}>Descripción (opcional)</label>
                <input placeholder={transf.origen && transf.destino ? `${transf.origen} → ${transf.destino}` : "Ej: Pago Nu, retiro…"} value={transf.descripcion} onChange={e => setTransf(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              {transf.origen && transf.destino && (() => {
                const esTarjetaOrigen  = tarjetas.some(t => t.nombre === transf.origen);
                const esTarjetaDestino = tarjetas.some(t => t.nombre === transf.destino);
                const label = esTarjetaDestino ? "💳 Pago de tarjeta" : esTarjetaOrigen ? "💳 Gasto / retiro con tarjeta" : "🔄 Transferencia entre cuentas";
                const bg    = esTarjetaDestino ? "#fce8e8" : esTarjetaOrigen ? "#fce8e8" : C.aliceBlue;
                const color = esTarjetaDestino || esTarjetaOrigen ? C.rose : C.sky;
                return <div style={{ background: bg, borderRadius: 10, padding: "10px 14px", fontSize: 12, color, fontWeight: 600 }}>{label}</div>;
              })()}
            </div>
            {transfError && <p style={{ fontSize: 12, color: C.rose, fontWeight: 600, marginTop: 12, padding: "8px 12px", background: "#fce8e8", borderRadius: 8 }}>⚠️ {transfError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }} onClick={handleTransferencia}>Confirmar</button>
              <button style={S.btnSec} onClick={() => { setShowTransfForm(false); setTransfError(""); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CENTRAL — Nueva transacción ── */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="fade" style={{ ...S.card, padding: 28, width: "min(500px,95vw)", boxShadow: "0 16px 48px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: form.tipo === "ingreso" ? C.honeydew : "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {form.tipo === "ingreso" ? "💰" : "💸"}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>{form.tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto"}</h3>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={S.lbl}>Monto (MXN)</label>
                <input type="text" inputMode="decimal" placeholder="0.00 o 100+50" value={form.monto}
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  onBlur={e => {
                    try {
                      const val = e.target.value.trim();
                      if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(val) && /[\+\-\*\/]/.test(val)) {
                        const result = Function('"use strict"; return (' + val + ')')();
                        if (!isNaN(result) && isFinite(result)) setForm(f => ({ ...f, monto: String(parseFloat(Math.abs(result).toFixed(2))) }));
                      }
                    } catch {}
                  }}
                  autoFocus />
                {(() => {
                  try {
                    const val = form.monto.trim();
                    if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(val) && /[\+\-\*\/]/.test(val)) {
                      const result = Function('"use strict"; return (' + val + ')')();
                      if (!isNaN(result) && isFinite(result))
                        return <p style={{ fontSize: 11, color: C.sky, fontWeight: 700, marginTop: 3 }}>= {fmt(Math.abs(result))}</p>;
                    }
                  } catch {}
                  return null;
                })()}
              </div>
              <div>
                <label style={S.lbl}>Fecha</label>
                <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                  {(() => { const hoy = localDate(); const ayer = (() => { const d = new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(); return (<>
                    <button type="button" onClick={() => setForm(f => ({ ...f, fecha: hoy }))} style={{ ...S.btnSec, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: form.fecha === hoy ? C.sage : C.muted, borderColor: form.fecha === hoy ? C.sage : C.border, borderRadius: 7, flex: 1 }}>Hoy</button>
                    <button type="button" onClick={() => setForm(f => ({ ...f, fecha: ayer }))} style={{ ...S.btnSec, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: form.fecha === ayer ? C.sage : C.muted, borderColor: form.fecha === ayer ? C.sage : C.border, borderRadius: 7, flex: 1 }}>Ayer</button>
                  </>); })()}
                </div>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={S.lbl}>Categoría</label>
                  <button onClick={() => setInlineCat({ show: !inlineCat.show, context: form.tipo, val: "" })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.sky, fontWeight: 700, padding: 0 }}>+</button>
                </div>
                {inlineCat.show && inlineCat.context === form.tipo ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input placeholder="Nombre categoría" value={inlineCat.val} onChange={e => setInlineCat(s => ({ ...s, val: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleAddCatInline(form.tipo)} autoFocus style={{ flex: 1 }} />
                    <button onClick={() => handleAddCatInline(form.tipo)} style={{ ...S.btnPrimary, padding: "0 12px" }}><Check size={14}/></button>
                    <button onClick={() => setInlineCat({ show: false, context: null, val: "" })} style={{ ...S.btnSec, padding: "0 10px" }}><X size={14}/></button>
                  </div>
                ) : (
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    {(form.tipo === "gasto" ? catsGasto : catsIngreso).map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={S.lbl}>Cuenta</label>
                  <button onClick={() => setInlineCuenta(s => ({ ...s, show: !s.show }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.sky, fontWeight: 700, padding: 0 }}>+</button>
                </div>
                {inlineCuenta.show ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input placeholder="Nombre cuenta" value={inlineCuenta.val}
                      onChange={e => { const v = e.target.value; setInlineCuenta(s => ({ ...s, val: v })); }}
                      autoFocus />
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={inlineCuenta.tipo}
                        onChange={e => { const v = e.target.value; setInlineCuenta(s => ({ ...s, tipo: v })); }}
                        style={{ flex: 1 }}>
                        <option value="debito">Débito</option>
                        <option value="ahorro">Ahorro</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                      <input type="number" placeholder="Saldo" value={inlineCuenta.saldo}
                        onChange={e => { const v = e.target.value; setInlineCuenta(s => ({ ...s, saldo: v })); }}
                        style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={async () => {
                        const nombre = inlineCuenta.val.trim();
                        if (!nombre) return;
                        saving("Creando cuenta…");
                        try {
                          const saldo = parseFloat(inlineCuenta.saldo) || 0;
                          const tipo = inlineCuenta.tipo || "debito";
                          const rec = await atCreate("Cuentas", { nombre, tipo, saldo });
                          const nueva = { id: rec.id, nombre: rec.fields.nombre || nombre, tipo: rec.fields.tipo || tipo, saldo: parseFloat(rec.fields.saldo) || saldo, interes_anual: null };
                          setCuentas(prev => [...prev, nueva]);
                          setForm(f => ({ ...f, cuenta: nueva.nombre }));
                          setInlineCuenta({ show: false, val: "", tipo: "debito", saldo: "" });
                          saved();
                        } catch(e) { errAt(e); }
                      }} style={{ ...S.btnPrimary, flex: 1, justifyContent: "center" }}><Check size={14}/> Crear</button>
                      <button onClick={() => setInlineCuenta({ show: false, val: "", tipo: "debito", saldo: "" })} style={S.btnSec}><X size={14}/></button>
                    </div>
                  </div>
                ) : (
                  <select value={form.cuenta} onChange={e => setForm({ ...form, cuenta: e.target.value })}>
                    {cuentas.length === 0 && tarjetas.length === 0
                      ? <option disabled>Sin cuentas — créalas primero</option>
                      : <>
                          {cuentas.length > 0 && <optgroup label="Cuentas">
                            {cuentas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                          </optgroup>}
                          {form.tipo === "gasto" && tarjetas.length > 0 && <optgroup label="Tarjetas de crédito">
                            {tarjetas.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                          </optgroup>}
                        </>}
                  </select>
                )}
              </div>
              <div style={{ gridColumn: "1/-1" }}><label style={S.lbl}>Descripción</label>
                <input placeholder="Ej: Super del mes" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>

              <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderRadius: 10, padding: "10px 14px" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>Impacta presupuesto</p>
                  <p style={{ fontSize: 11, color: C.muted }}>Desactiva para pagos de tarjeta o transferencias</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, impacta_presupuesto: !f.impacta_presupuesto }))}
                  style={{ width: 42, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: form.impacta_presupuesto ? C.sage : C.border, transition: "background 0.2s", position: "relative" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: form.impacta_presupuesto ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
              {form.cuenta && cuentas.find(c => c.nombre === form.cuenta) && (
                <div style={{ gridColumn: "1/-1" }}>
                  <p style={{ fontSize: 11, color: C.muted }}>
                    Saldo actual de <strong>{form.cuenta}</strong>: {fmt(cuentas.find(c => c.nombre === form.cuenta)?.saldo || 0)}
                    {form.monto && form.tipo === "gasto" && (() => {
                      const nuevo = (cuentas.find(c => c.nombre === form.cuenta)?.saldo || 0) - parseFloat(form.monto || 0);
                      return <span style={{ color: nuevo < 0 ? C.rose : C.sage, fontWeight: 700 }}> → {fmt(nuevo)}{nuevo < 0 ? " ⚠️ negativo" : ""}</span>;
                    })()}
                  </p>
                </div>
              )}
            </div>
            {formError && <p style={{ fontSize: 12, color: C.rose, fontWeight: 600, marginTop: 12, padding: "8px 12px", background: "#fce8e8", borderRadius: 8 }}>⚠️ {formError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button style={{ ...S.btnPrimary, flex: 1, justifyContent: "center", background: form.tipo === "ingreso" ? C.sage : C.rose, borderColor: form.tipo === "ingreso" ? C.sage : C.rose }} onClick={handleAdd}>
                Guardar {form.tipo === "ingreso" ? "ingreso" : "gasto"}
              </button>
              <button style={S.btnSec} onClick={() => { setShowForm(false); setFormError(""); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className={syncStatus === "error" ? "sync-error" : ""} style={{ position: "fixed", bottom: 20, right: 20, display: "flex", alignItems: "center", gap: 8, zIndex: 999, background: "white", borderRadius: 12, padding: "8px 14px", boxShadow: `0 4px 20px ${syncStatus === "error" ? "rgba(239,68,68,0.18)" : "rgba(0,0,0,0.12)"}`, border: `1px solid ${syncStatus === "error" ? C.rose : syncStatus === "ok" ? C.sage : C.border}` }}>
        {syncStatus === "loading" || syncStatus === "saving"
          ? <RefreshCw size={13} color={C.sky} style={{ animation: "spin 1s linear infinite" }} />
          : syncStatus === "ok" ? <Cloud size={13} color={C.sage} />
          : syncStatus === "error" ? <CloudOff size={13} color={C.rose} />
          : <Cloud size={13} color={C.muted} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: syncStatus === "error" ? C.rose : syncStatus === "ok" ? C.sage : C.muted }}>{syncMsg || "Airtable"}</span>
        <button onClick={cargarDatos} title="Recargar" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}><RefreshCw size={13} color={C.muted} /></button>
      </div>
    </div>
  );
}
