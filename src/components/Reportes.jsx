import React, { useState, useRef, useEffect } from 'react';
import {
  todayISO,
  formatDate,
  normalize,
  buildPlanilla,
  exportPlanillaExcel,
  exportPlanillaPdf,
  exportExcel,
  exportPdf
} from '../utils/excelPdfUtils';

const REPORT_FIELDS = [
  "Pólizas aprobadas",
  "Pólizas observadas",
  "Pólizas revisadas",
  "Observaciones levantadas",
  "Pólizas digitalizadas",
  "Correos enviados",
  "Correos respondidos",
  "Correos pendientes",
  "Correos de regularización",
  "Atención presencial",
  "Coordinación interna",
  "Actualización de base",
  "Otro"
];

const COLUMNS = [
  { key: "fecha", label: "Fecha" },
  { key: "tipo", label: "Tipo" },
  { key: "campo", label: "Campo" },
  { key: "cantidad", label: "Cantidad" },
  { key: "plan", label: "Plan/canal" },
  { key: "grupo", label: "Grupo" },
  { key: "responsable", label: "Responsable" },
  { key: "observacion", label: "Observaciones" }
];

const DEFAULT_PRESETS = [
  { id: "polizas", name: "Pólizas", fields: ["Pólizas aprobadas", "Pólizas observadas", "Pólizas revisadas"] },
  { id: "correos", name: "Correos", fields: ["Correos enviados", "Correos respondidos", "Correos pendientes", "Correos de regularización"] },
  { id: "digitalizados", name: "Digitalización", fields: ["Pólizas digitalizadas"] },
  { id: "levantadas", name: "Levantadas", fields: ["Observaciones levantadas"] }
];

export default function Reportes({ records }) {
  const [reportFrom, setReportFrom] = useState(todayISO().slice(0, 7) + "-01");
  const [reportTo, setReportTo] = useState(todayISO());
  const [reportMode, setReportMode] = useState("planilla");
  const [reportOrder, setReportOrder] = useState("fecha");
  const [selectedFields, setSelectedFields] = useState(REPORT_FIELDS);
  const [selectedCols, setSelectedCols] = useState(COLUMNS.map(c => c.key));
  const [exportOpen, setExportOpen] = useState(false);
  
  // Accordion collapsible states
  const [fieldsExpanded, setFieldsExpanded] = useState(true); // default expanded for easy onboarding
  const [colsExpanded, setColsExpanded] = useState(false);

  // Dynamic user presets state (persistent in localStorage!)
  const [presets, setPresets] = useState(() => {
    const saved = localStorage.getItem("grf_report_presets");
    return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
  });

  // Modal / popup states for configuring filters
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null); // active preset being created or edited
  const [editingName, setEditingName] = useState("");
  const [editingFields, setEditingFields] = useState([]);

  const dropdownRef = useRef(null);

  // Save presets to localStorage when modified
  useEffect(() => {
    localStorage.setItem("grf_report_presets", JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Preset editor initialization
  const startEditPreset = (preset) => {
    setEditingPreset(preset);
    setEditingName(preset.name);
    setEditingFields(preset.fields);
  };

  const handleCreatePreset = () => {
    const newPreset = {
      id: "preset-" + Date.now(),
      name: "Nuevo filtro",
      fields: []
    };
    startEditPreset(newPreset);
  };

  const handleSavePreset = () => {
    if (!editingName.trim()) {
      alert("Por favor, ingresa un nombre para el filtro rápido.");
      return;
    }
    const updatedPreset = {
      ...editingPreset,
      name: editingName.trim(),
      fields: editingFields
    };

    if (presets.some(p => p.id === updatedPreset.id)) {
      setPresets(presets.map(p => p.id === updatedPreset.id ? updatedPreset : p));
    } else {
      setPresets([...presets, updatedPreset]);
    }
    setEditingPreset(null);
  };

  const handleDeletePreset = (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente este filtro rápido?")) {
      setPresets(presets.filter(p => p.id !== id));
      setEditingPreset(null);
    }
  };

  const toggleEditingField = (field) => {
    if (editingFields.includes(field)) {
      setEditingFields(editingFields.filter(f => f !== field));
    } else {
      setEditingFields([...editingFields, field]);
    }
  };

  const handleFieldToggle = (field) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleColToggle = (colKey) => {
    if (selectedCols.includes(colKey)) {
      setSelectedCols(selectedCols.filter(c => c !== colKey));
    } else {
      setSelectedCols([...selectedCols, colKey]);
    }
  };

  const handleExportExcel = () => {
    if (reportMode === "planilla") {
      exportPlanillaExcel(selectedMonthKeys(), records, selectedFields);
    } else {
      const data = getAggregatedData();
      const labels = Object.fromEntries(COLUMNS.map(c => [c.key, c.label]));
      exportExcel(data, `reporte_grf_${todayISO()}.xlsx`, labels, selectedCols);
    }
  };

  const handleExportPdf = () => {
    if (reportMode === "planilla") {
      exportPlanillaPdf(selectedMonthKeys(), records, selectedFields);
    } else {
      const data = getAggregatedData();
      const labels = Object.fromEntries(COLUMNS.map(c => [c.key, c.label]));
      exportPdf(data, `reporte_grf_${todayISO()}.pdf`, labels, selectedCols);
    }
  };

  const selectedMonthKeys = () => {
    const base = reportFrom || reportTo || todayISO();
    const start = new Date((reportFrom || base.slice(0, 7) + "-01") + "T00:00:00");
    const endIso = reportTo || reportFrom || base;
    const end = new Date(endIso + "T00:00:00");
    const keys = [];
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (d <= endMonth) {
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return keys.length ? keys : [todayISO().slice(0, 7)];
  };

  const reportBaseRecords = () => {
    let list = records.filter(r => {
      const dateOk = r.tipo === "Levantadas" || (!reportFrom || r.fecha >= reportFrom) && (!reportTo || r.fecha <= reportTo);
      return selectedFields.includes(r.campo) && dateOk;
    });

    list.sort((a, b) => {
      if (reportOrder === "cantidad") return Number(b.cantidad || 0) - Number(a.cantidad || 0);
      if (reportOrder === "tipo") return a.tipo.localeCompare(b.tipo) || a.campo.localeCompare(b.campo);
      if (reportOrder === "campo") return a.campo.localeCompare(b.campo);
      return (a.fecha || "9999").localeCompare(b.fecha || "9999");
    });
    return list;
  };

  const getAggregatedData = () => {
    const base = reportBaseRecords();
    if (reportMode === "detalle") return base;

    const map = new Map();
    base.forEach(r => {
      const periodo = reportMode === "diario"
        ? (r.fecha || "Acumulado")
        : reportMode === "mensual"
          ? (r.fecha ? r.fecha.slice(0, 7) : "Acumulado")
          : "Acumulado";
      const key = `${periodo}|${r.tipo}|${r.campo}|${r.plan || ""}|${r.grupo || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          fecha: periodo,
          tipo: r.tipo,
          campo: r.campo,
          cantidad: 0,
          plan: r.plan || "",
          grupo: r.grupo || "",
          responsable: r.responsable || "-",
          observacion: r.observacion || "-"
        });
      }
      map.get(key).cantidad += Number(r.cantidad || 0);
    });
    return Array.from(map.values());
  };

  const renderPlanillaHeaders = (planilla) => {
    const head1 = [
      <th key="nro" rowSpan={3} className="planilla-head">#</th>,
      <th key="fecha" rowSpan={3} className="planilla-head">FECHA</th>,
      <th key="dia" rowSpan={3} className="planilla-head">DÍA</th>
    ];

    let i = 0;
    const groupsList = [];
    while (i < planilla.cols.length) {
      const group = planilla.cols[i].group;
      let span = 1;
      while (i + span < planilla.cols.length && planilla.cols[i + span].group === group) span++;
      groupsList.push({ name: group, span });
      i += span;
    }

    groupsList.forEach((g, idx) => {
      head1.push(
        <th key={`g-${idx}`} colSpan={g.span} className="planilla-head sub-plan">
          {g.name}
        </th>
      );
    });

    head1.push(<th key="total" rowSpan={3} className="planilla-head total-col">TOTAL DÍA</th>);
    head1.push(<th key="detalle" rowSpan={3} className="planilla-head obs-col">DETALLE / OBSERVACIONES</th>);

    const head2 = [];
    i = 0;
    const plansList = [];
    while (i < planilla.cols.length) {
      const group = planilla.cols[i].group;
      const plan = planilla.cols[i].plan;
      let span = 1;
      while (i + span < planilla.cols.length && planilla.cols[i + span].group === group && planilla.cols[i + span].plan === plan) span++;
      plansList.push({ name: plan, span, group });
      i += span;
    }

    plansList.forEach((p, idx) => {
      let pClass = "planilla-head";
      const normName = normalize(p.name);
      if (normName.includes("basico")) pClass += " plan-basico";
      else if (normName.includes("onconaval")) pClass += " plan-onconaval";

      head2.push(
        <th key={`p-${idx}`} colSpan={p.span} className={pClass}>
          {p.name}
        </th>
      );
    });

    const head3 = planilla.cols.map((c, idx) => {
      let fClass = "planilla-head";
      const name = normalize(c.field);
      if (name.includes("aprob")) fClass += " field-aprobado";
      else if (name.includes("observad")) fClass += " field-observado";
      else if (name.includes("levant")) fClass += " field-levantado";
      else if (name.includes("digital")) fClass += " field-digitalizado";

      return (
        <th key={`f-${idx}`} className={fClass}>
          {c.field}
        </th>
      );
    });

    return (
      <thead>
        <tr>{head1}</tr>
        <tr>{head2}</tr>
        <tr>{head3}</tr>
      </thead>
    );
  };

  const handlePreviewPreset = (presetFields) => {
    setSelectedFields(presetFields);
  };

  const renderPreview = () => {
    if (reportMode === "planilla") {
      const firstMonthKey = selectedMonthKeys()[0];
      const planilla = buildPlanilla(firstMonthKey, records, selectedFields);
      
      return (
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <h2>Vista Previa del Reporte</h2>
          <p className="sub">
            Formato: {planilla.monthName} {planilla.year} ({planilla.rows.length} filas, {planilla.cols.length} columnas).
          </p>
          <div className="table-wrap">
            <table>
              {renderPlanillaHeaders(planilla)}
              <tbody>
                {planilla.rows.map((row, idx) => {
                  let rClass = "";
                  if (row.fecha === "TOTAL") rClass = "planilla-row-total";
                  else if (row.fecha === "ACUMULADO") rClass = "planilla-row-accum";

                  return (
                    <tr key={idx} className={rClass}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.nro}</td>
                      <td>{row.fecha === "ACUMULADO" || row.fecha === "TOTAL" ? row.fecha : formatDate(row.fecha)}</td>
                      <td style={{ textAlign: 'center' }}>{row.dia}</td>
                      {planilla.cols.map(c => (
                        <td key={c.key} className="planilla-cell-num">
                          {row[c.key] || ""}
                        </td>
                      ))}
                      <td className="planilla-cell-num" style={{ color: 'var(--text)', background: '#f8fafc' }}>
                        <b>{row.total || ""}</b>
                      </td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '300px', wordBreak: 'break-word', textAlign: 'left', color: 'var(--text-muted)' }}>
                        {row.detalle || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const data = getAggregatedData();
    const labels = Object.fromEntries(COLUMNS.map(c => [c.key, c.label]));

    return (
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <h2>Vista Previa del Reporte</h2>
        <p className="sub">{data.length} fila(s) de reporte calculada(s).</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {selectedCols.map(c => (
                  <th key={c}>{labels[c]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((r, idx) => (
                  <tr key={idx}>
                    {selectedCols.map(c => (
                      <td key={c}>
                        {c === "fecha" ? (
                          formatDate(r.fecha)
                        ) : c === "cantidad" ? (
                          <b>{r.cantidad}</b>
                        ) : (
                          r[c] || "-"
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={selectedCols.length || 1} className="empty">
                    No hay información disponible con los criterios de reporte seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="section active">
      <div className="report-layout">
        <div className="card no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* STEP 1: Basic settings (Always open) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Configuración de Reporte
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label htmlFor="reportFrom" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Desde</label>
                <input 
                  type="date" 
                  id="reportFrom" 
                  value={reportFrom} 
                  onChange={(e) => setReportFrom(e.target.value)} 
                  style={{ padding: '8px 10px', fontSize: '0.82rem', width: '100%' }}
                />
              </div>
              <div>
                <label htmlFor="reportTo" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Hasta</label>
                <input 
                  type="date" 
                  id="reportTo" 
                  value={reportTo} 
                  onChange={(e) => setReportTo(e.target.value)} 
                  style={{ padding: '8px 10px', fontSize: '0.82rem', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '6px' }}>
              <label htmlFor="reportMode" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Formato</label>
              <select 
                id="reportMode" 
                value={reportMode} 
                onChange={(e) => setReportMode(e.target.value)}
                style={{ padding: '8px 10px', fontSize: '0.84rem', width: '100%' }}
              >
                <option value="planilla">Planilla Mensual FOSMAR</option>
                <option value="detalle">Listado Detallado</option>
                <option value="diario">Resumen por Día</option>
                <option value="mensual">Resumen por Mes</option>
                <option value="acumulado">Acumulado General</option>
              </select>
            </div>

            {reportMode !== "planilla" && (
              <div style={{ marginTop: '6px' }}>
                <label htmlFor="reportOrder" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Criterio de Orden</label>
                <select 
                  id="reportOrder" 
                  value={reportOrder} 
                  onChange={(e) => setReportOrder(e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '0.84rem', width: '100%' }}
                >
                  <option value="fecha">Por Fecha</option>
                  <option value="tipo">Por Tipo de Actividad</option>
                  <option value="campo">Por Estado / Campo</option>
                  <option value="cantidad">Por Cantidad</option>
                </select>
              </div>
            )}
          </div>

          {/* STEP 2: Activity fields collapsible accordion */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div 
              onClick={() => setFieldsExpanded(!fieldsExpanded)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Filtrar por Campos
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                {selectedFields.length === REPORT_FIELDS.length 
                  ? "Todos" 
                  : `${selectedFields.length} seleccionados`} {fieldsExpanded ? "▲" : "▼"}
              </span>
            </div>

            {fieldsExpanded && (
              <div style={{ marginTop: '12px', animation: 'dropdownIn 0.2s ease-out' }}>
                
                {/* Dynamically configured presets row with Configurer Popup Trigger! */}
                <div className="preset-row" style={{ marginBottom: '10px' }}>
                  <button className="preset" onClick={() => handlePreviewPreset(REPORT_FIELDS)} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>Todo</button>
                  {presets.map(p => (
                    <button key={p.id} className="preset" onClick={() => handlePreviewPreset(p.fields)} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                      {p.name}
                    </button>
                  ))}
                  <button className="preset" onClick={() => handlePreviewPreset([])} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>Limpiar</button>
                  
                  {/* Popup configuration button! */}
                  <button 
                    className="preset" 
                    onClick={() => setModalOpen(true)}
                    style={{ padding: '4px 8px', fontSize: '0.72rem', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold' }}
                  >
                    Configurar...
                  </button>
                </div>

                <div className="check-grid" style={{ gridTemplateColumns: '1fr', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px' }}>
                  {REPORT_FIELDS.map(f => (
                    <label className="check-item" key={f} style={{ border: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(f)}
                        onChange={() => handleFieldToggle(f)}
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: 550 }}>{f}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Visible columns collapsible accordion (only if not planilla) */}
          {reportMode !== "planilla" && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div 
                onClick={() => setColsExpanded(!colsExpanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  Columnas de la Tabla
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                  {selectedCols.length} visibles {colsExpanded ? "▲" : "▼"}
                </span>
              </div>

              {colsExpanded && (
                <div style={{ marginTop: '12px', animation: 'dropdownIn 0.2s ease-out' }}>
                  <div className="check-grid" style={{ gridTemplateColumns: '1fr', maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px' }}>
                    {COLUMNS.map(c => (
                      <label className="check-item" key={c.key} style={{ border: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                        <input
                          type="checkbox"
                          checked={selectedCols.includes(c.key)}
                          onChange={() => handleColToggle(c.key)}
                        />
                        <span style={{ fontSize: '0.78rem', fontWeight: 550 }}>{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Action splits */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Exportar Reporte
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={handleExportExcel} style={{ padding: '10px' }}>
                Excel (.xlsx)
              </button>
              <button type="button" className="btn-primary" onClick={handleExportPdf} style={{ padding: '10px' }}>
                PDF (.pdf)
              </button>
            </div>
          </div>
        </div>

        {renderPreview()}
      </div>

      {/* POPUP MODAL: Quick filter preset configurations (Filtros Rápidos) */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Configurar Filtros Rápidos</h3>
              <button className="modal-close" onClick={() => { setModalOpen(false); setEditingPreset(null); }}>✕</button>
            </div>

            {editingPreset === null ? (
              // Mode A: Presets list view
              <>
                <p className="sub" style={{ margin: 0 }}>Define los atajos para filtrar rápidamente las categorías desde la barra del constructor.</p>
                <div className="preset-list">
                  {presets.map(p => (
                    <div key={p.id} style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{p.name}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {p.fields.length} campos asignados
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-light" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => startEditPreset(p)}>
                          Editar
                        </button>
                        <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => handleDeletePreset(p.id)}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleCreatePreset}>
                    Nuevo filtro rápido
                  </button>
                  <button className="btn-light" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              // Mode B: Preset editor view
              <>
                <p className="sub" style={{ margin: 0 }}>Configura el nombre y selecciona qué campos pertenecerán a este filtro rápido.</p>
                <div className="preset-editor-item">
                  <div>
                    <label htmlFor="presetName" style={{ marginBottom: '6px', fontSize: '0.72rem' }}>Nombre del filtro</label>
                    <input 
                      type="text" 
                      id="presetName" 
                      value={editingName} 
                      onChange={(e) => setEditingName(e.target.value)} 
                      placeholder="Ej. Mis Pólizas"
                      style={{ width: '100%', padding: '8px 12px' }}
                    />
                  </div>
                  
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ marginBottom: '6px', fontSize: '0.72rem' }}>Campos a incluir en el atajo</label>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', background: '#fff' }}>
                      {REPORT_FIELDS.map(f => (
                        <label className="check-item" key={f} style={{ border: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                          <input
                            type="checkbox"
                            checked={editingFields.includes(f)}
                            onChange={() => toggleEditingField(f)}
                          />
                          <span style={{ fontSize: '0.76rem', fontWeight: 550 }}>{f}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleSavePreset}>
                    Guardar
                  </button>
                  <button className="btn-light" style={{ flex: 1 }} onClick={() => setEditingPreset(null)}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
