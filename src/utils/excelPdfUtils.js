import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


const MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!iso) return "Acumulado";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function normalize(v) {
  return String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeRecord(r) {
  const campo = r.campo || r.campoReporte || r.categoria || "";
  const tipo = r.tipo || "Otros";
  const plan = r.plan || r.canal || "";
  return {
    id: r.id || crypto.randomUUID?.() || String(Date.now() + Math.random()),
    fecha: r.fechaModo === "acumulado" ? "" : (r.fecha || ""),
    tipo,
    campo,
    categoria: campo,
    cantidad: Number(r.cantidad || 0),
    plan,
    canal: plan,
    grupo: r.grupo || "",
    responsable: r.responsable || "",
    observacion: r.observacion || "",
    fechaModo: r.fechaModo || (tipo === "Levantadas" ? "acumulado" : "diario"),
    origen: r.origen || "",
    createdAt: r.createdAt || new Date().toISOString()
  };
}

function planillaFieldState(campo) {
  const c = normalize(campo);
  if (c.includes("aprob")) return "APROBADOS";
  if (c.includes("observad") && !c.includes("levant")) return "OBSERVADOS";
  if (c.includes("levant")) return "LEVANTADOS ✓";
  if (c.includes("digital")) return "DIGITALIZADOS";
  if (c.includes("enviado")) return "ENVIADOS";
  if (c.includes("respond")) return "RESPONDIDOS";
  if (c.includes("pend")) return "PENDIENTES";
  if (c.includes("regular")) return "REGULARIZACIÓN";
  if (c.includes("atencion")) return "ATENCIÓN";
  if (c.includes("coordin")) return "COORDINACIÓN";
  if (c.includes("actualiz")) return "ACTUALIZACIÓN";
  return campo.toUpperCase();
}

function normGroup(g) {
  const x = normalize(g);
  if (x.includes("segundo")) return "SEGUNDO GRUPO";
  if (x.includes("primer")) return "PRIMER GRUPO";
  return "GENERAL";
}

function normPlan(p, tipo) {
  const x = normalize(p);
  if (x.includes("onconaval")) return "ONCONAVAL";
  if (x.includes("basico")) return "PLAN BÁSICO";
  if (x.includes("whatsapp")) return "WHATSAPP";
  if (x.includes("presencial")) return "PRESENCIAL";
  if (x.includes("sistema")) return "SISTEMA INTERNO";
  if (x.includes("correo")) return "CORREO INSTITUCIONAL";
  if (tipo === "Correos") return "CORREOS";
  return "GENERAL";
}

function getPlanillaColumnsFor(recordsList, selectedFields) {
  const cols = [];
  const push = (group, plan, field) => {
    if (!cols.some(c => c.group === group && c.plan === plan && c.field === field)) {
      cols.push({ group, plan, field, key: `${group}|${plan}|${field}` });
    }
  };

  const basePolicyFields = ["Pólizas aprobadas", "Pólizas observadas", "Observaciones levantadas", "Pólizas digitalizadas"];
  const selectedPolicy = basePolicyFields.filter(f => selectedFields.includes(f));
  
  ["PRIMER GRUPO", "SEGUNDO GRUPO"].forEach(group => {
    ["PLAN BÁSICO", "ONCONAVAL"].forEach(plan => {
      selectedPolicy.forEach(field => push(group, plan, planillaFieldState(field)));
    });
  });

  if (selectedFields.some(f => normalize(f).includes("correo"))) {
    ["Correos enviados", "Correos respondidos", "Correos pendientes", "Correos de regularización"]
      .filter(f => selectedFields.includes(f))
      .forEach(f => push("COMUNICACIONES", "CORREOS", planillaFieldState(f)));
  }

  ["Atención presencial", "Coordinación interna", "Actualización de base", "Otro"]
    .filter(f => selectedFields.includes(f))
    .forEach(f => push("OTROS", "GESTIÓN", planillaFieldState(f)));

  recordsList.forEach(r => {
    if (!selectedFields.includes(r.campo)) return;
    const group = r.tipo === "Correos" ? "COMUNICACIONES" : normGroup(r.grupo);
    const plan = r.tipo === "Correos" ? "CORREOS" : normPlan(r.plan, r.tipo);
    push(group, plan, planillaFieldState(r.campo));
  });

  return cols;
}

function daysInMonth(year, monthIndexZero) {
  return new Date(year, monthIndexZero + 1, 0).getDate();
}

export function buildPlanilla(monthKey, records, selectedFields) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = `${monthKey}-01`;
  const last = `${monthKey}-${String(daysInMonth(year, month - 1)).padStart(2, "0")}`;

  const baseRecords = records.filter(r => {
    if (!selectedFields.includes(r.campo)) return false;
    if (r.tipo === "Levantadas") return true;
    return r.fecha && r.fecha >= first && r.fecha <= last;
  });

  const cols = getPlanillaColumnsFor(baseRecords, selectedFields);
  const rows = [];
  const notesByDate = {};

  for (let day = 1; day <= daysInMonth(year, month - 1); day++) {
    const iso = `${monthKey}-${String(day).padStart(2, "0")}`;
    const d = new Date(iso + "T00:00:00");
    const row = { nro: day, fecha: iso, dia: DIAS_ES[d.getDay()], total: 0, detalle: "" };
    cols.forEach(c => row[c.key] = 0);

    baseRecords.forEach(r => {
      if (r.tipo === "Levantadas") return;
      if (r.fecha !== iso) return;
      const group = r.tipo === "Correos" ? "COMUNICACIONES" : normGroup(r.grupo);
      const plan = r.tipo === "Correos" ? "CORREOS" : normPlan(r.plan, r.tipo);
      const field = planillaFieldState(r.campo);
      const key = `${group}|${plan}|${field}`;
      if (key in row) {
        row[key] += Number(r.cantidad || 0);
        row.total += Number(r.cantidad || 0);
      }
      if (r.observacion) {
        notesByDate[iso] = [...new Set([...(notesByDate[iso] || []), r.observacion])];
      }
    });

    row.detalle = (notesByDate[iso] || []).join(" / ");
    rows.push(row);
  }

  const accumulated = { nro: "", fecha: "ACUMULADO", dia: "", total: 0, detalle: "Pólizas levantadas registradas como acumulado general." };
  cols.forEach(c => accumulated[c.key] = 0);
  baseRecords.filter(r => r.tipo === "Levantadas").forEach(r => {
    const group = normGroup(r.grupo);
    const plan = normPlan(r.plan, r.tipo);
    const field = planillaFieldState(r.campo);
    const key = `${group}|${plan}|${field}`;
    if (key in accumulated) {
      accumulated[key] += Number(r.cantidad || 0);
      accumulated.total += Number(r.cantidad || 0);
    }
  });
  if (accumulated.total > 0) rows.push(accumulated);

  const totalRow = { nro: "", fecha: "TOTAL", dia: "", total: 0, detalle: "" };
  cols.forEach(c => totalRow[c.key] = rows.reduce((s, r) => s + Number(r[c.key] || 0), 0));
  totalRow.total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  rows.push(totalRow);

  return { monthKey, monthName: MESES_ES[month - 1], year, cols, rows };
}

function planillaToAoA(planilla) {
  const width = 3 + planilla.cols.length + 2;
  const empty = () => Array(width).fill("");
  const aoa = [];
  aoa.push(["GRF  ·  GENERADOR DE REPORTES FOSMAR", ...Array(width - 1).fill("")]);
  aoa.push(empty());
  aoa.push(["Departamento de Pólizas de Seguro  ·  IAFAS FOSMAR", ...Array(width - 1).fill("")]);
  aoa.push(empty());
  aoa.push(["MES ▸", "", planilla.monthName, "", "AÑO ▸", "", planilla.year, ...Array(Math.max(0, width - 7)).fill("")]);
  aoa.push(["RESPONSABLE ▸", "", "Sebastián Fernando Mesones Ugolini", ...Array(width - 3).fill("")]);
  aoa.push(empty());

  const row8 = ["", "", ""];
  const row9 = ["", "", ""];
  const row10 = ["#", "FECHA", "DÍA"];
  planilla.cols.forEach(c => {
    row8.push(c.group);
    row9.push(c.plan);
    row10.push(c.field);
  });
  row8.push("TOTAL", "DETALLE");
  row9.push("", "");
  row10.push("TOTAL DÍA", "DETALLE / OBSERVACIONES");
  aoa.push(row8);
  aoa.push(row9);
  aoa.push(row10);

  planilla.rows.forEach(r => {
    const row = [r.nro, r.fecha === "ACUMULADO" || r.fecha === "TOTAL" ? r.fecha : formatDate(r.fecha), r.dia];
    planilla.cols.forEach(c => row.push(r[c.key] || ""));
    row.push(r.total || "", r.detalle || "");
    aoa.push(row);
  });

  return aoa;
}

export function exportPlanillaExcel(monthKeys, records, selectedFields) {
  const wb = XLSX.utils.book_new();
  monthKeys.forEach(monthKey => {
    const planilla = buildPlanilla(monthKey, records, selectedFields);
    const aoa = planillaToAoA(planilla);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const width = 3 + planilla.cols.length + 2;
    ws["!cols"] = [
      { wch: 5 }, { wch: 13 }, { wch: 8 },
      ...planilla.cols.map(() => ({ wch: 14 })),
      { wch: 11 }, { wch: 42 }
    ];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: width - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: width - 1 } },
      { s: { r: 5, c: 2 }, e: { r: 5, c: Math.min(width - 1, 8) } }
    ];

    let col = 3;
    while (col < 3 + planilla.cols.length) {
      const group = planilla.cols[col - 3].group;
      let end = col;
      while (end + 1 < 3 + planilla.cols.length && planilla.cols[end + 1 - 3].group === group) end++;
      if (end > col) ws["!merges"].push({ s: { r: 7, c: col }, e: { r: 7, c: end } });
      col = end + 1;
    }
    
    col = 3;
    while (col < 3 + planilla.cols.length) {
      const group = planilla.cols[col - 3].group;
      const plan = planilla.cols[col - 3].plan;
      let end = col;
      while (end + 1 < 3 + planilla.cols.length && planilla.cols[end + 1 - 3].group === group && planilla.cols[end + 1 - 3].plan === plan) end++;
      if (end > col) ws["!merges"].push({ s: { r: 8, c: col }, e: { r: 8, c: end } });
      col = end + 1;
    }

    XLSX.utils.book_append_sheet(wb, ws, planilla.monthName.slice(0, 31));
  });
  XLSX.writeFile(wb, `reporte_fosmar_formato_excel_${todayISO()}.xlsx`);
}

export function exportPlanillaPdf(monthKeys, records, selectedFields) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  monthKeys.forEach((monthKey, idx) => {
    if (idx > 0) doc.addPage("a4", "landscape");
    const planilla = buildPlanilla(monthKey, records, selectedFields);
    const widthCols = 3 + planilla.cols.length + 2;

    doc.setFontSize(13);
    doc.text("GRF  ·  GENERADOR DE REPORTES FOSMAR", 40, 32);
    doc.setFontSize(9);
    doc.text("Departamento de Pólizas de Seguro  ·  IAFAS FOSMAR", 40, 48);
    doc.text(`MES: ${planilla.monthName}    AÑO: ${planilla.year}`, 40, 64);
    doc.text("RESPONSABLE: Sebastián Fernando Mesones Ugolini", 40, 80);

    const head1 = [
      { content: "#", rowSpan: 3 },
      { content: "FECHA", rowSpan: 3 },
      { content: "DÍA", rowSpan: 3 }
    ];
    
    let i = 0;
    while (i < planilla.cols.length) {
      const group = planilla.cols[i].group;
      let span = 1;
      while (i + span < planilla.cols.length && planilla.cols[i + span].group === group) span++;
      head1.push({ content: group, colSpan: span, styles: { halign: "center" } });
      i += span;
    }
    head1.push({ content: "TOTAL", rowSpan: 3 });
    head1.push({ content: "DETALLE", rowSpan: 3 });

    const head2 = [];
    i = 0;
    while (i < planilla.cols.length) {
      const group = planilla.cols[i].group;
      const plan = planilla.cols[i].plan;
      let span = 1;
      while (i + span < planilla.cols.length && planilla.cols[i + span].group === group && planilla.cols[i + span].plan === plan) span++;
      head2.push({ content: plan, colSpan: span, styles: { halign: "center" } });
      i += span;
    }

    const head3 = planilla.cols.map(c => c.field);

    const body = planilla.rows.map(r => [
      r.nro,
      r.fecha === "ACUMULADO" || r.fecha === "TOTAL" ? r.fecha : formatDate(r.fecha),
      r.dia,
      ...planilla.cols.map(c => r[c.key] || ""),
      r.total || "",
      r.detalle || ""
    ]);

    autoTable(doc, {
      startY: 96,
      head: [head1, head2, head3],
      body,
      theme: "grid",
      styles: {
        fontSize: widthCols > 18 ? 6.2 : 7.2,
        cellPadding: 3.2,
        overflow: "linebreak",
        valign: "middle",
        halign: "center",
        lineColor: [120, 130, 145],
        lineWidth: 0.35
      },
      headStyles: {
        fillColor: [13, 35, 66],
        textColor: 255,
        fontStyle: "bold"
      },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        1: { cellWidth: 48 },
        2: { cellWidth: 27 },
        [widthCols - 1]: { cellWidth: 130, halign: "left" }
      },
      margin: { left: 24, right: 24 }
    });
  });
  doc.save(`reporte_fosmar_formato_excel_${todayISO()}.pdf`);
}

export function exportExcel(data, filename, labels, cols) {
  const rows = data.map(r => {
    const obj = {};
    cols.forEach(c => {
      obj[labels[c]] = c === "cantidad" ? Number(r[c] || 0) : (c === "fecha" ? formatDate(r.fecha) : String(r[c] ?? ""));
    });
    return obj;
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, filename);
}

export function exportPdf(data, filename, labels, cols) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(15);
  doc.text("Reporte GRF - Generador de Reportes FOSMAR", 40, 36);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-PE")}`, 40, 54);
  
  autoTable(doc, {
    startY: 72,
    head: [cols.map(c => labels[c])],
    body: data.map(r => cols.map(c => c === "fecha" ? formatDate(r.fecha) : String(r[c] ?? ""))),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [13, 35, 66], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 }
  });
  doc.save(filename);
}

export function exportCSV(data, filename, labels, cols) {
  const rows = data.map(r => {
    const obj = {};
    cols.forEach(c => {
      obj[labels[c]] = c === "cantidad" ? Number(r[c] || 0) : String(r[c] ?? "");
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDatabaseCSV(records, filename) {
  const ws = XLSX.utils.json_to_sheet(records);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
