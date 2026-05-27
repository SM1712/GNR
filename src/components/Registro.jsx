import React, { useState, useEffect } from 'react';
import { todayISO, formatDate } from '../utils/excelPdfUtils';

const fieldsByKind = {
  "Pólizas": ["Pólizas aprobadas", "Pólizas observadas", "Pólizas revisadas"],
  "Levantadas": ["Observaciones levantadas"],
  "Digitalización": ["Pólizas digitalizadas"],
  "Correos": ["Correos enviados", "Correos respondidos", "Correos pendientes", "Correos de regularización"],
  "Otros": ["Atención presencial", "Coordinación interna", "Actualización de base", "Otro"]
};

export default function Registro({ records, onAddRecord }) {
  const [kind, setKind] = useState("Pólizas");
  const [fecha, setFecha] = useState(todayISO());
  const [cantidad, setCantidad] = useState("");
  const [campo, setCampo] = useState(fieldsByKind["Pólizas"][0]);
  const [plan, setPlan] = useState("");
  const [grupo, setGrupo] = useState("");
  const [responsable, setResponsable] = useState("Sebastián Fernando Mesones Ugolini");
  const [observacion, setObservacion] = useState("");
  
  useEffect(() => {
    setCampo(fieldsByKind[kind === "Otros" ? "Otros" : kind][0]);
  }, [kind]);

  const isAccum = kind === "Levantadas";

  const handleClear = () => {
    setCantidad("");
    setObservacion("");
    setPlan("");
    setGrupo("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAccum && !fecha) {
      alert("Por favor, selecciona una fecha válida.");
      return;
    }
    const val = Number(cantidad);
    if (isNaN(val) || val <= 0) {
      alert("Por favor, ingresa una cantidad mayor a cero.");
      return;
    }

    const newRecord = {
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      fecha: isAccum ? "" : fecha,
      tipo: kind === "Otros" ? "Otros" : kind,
      campo,
      categoria: campo,
      cantidad: val,
      plan,
      canal: plan,
      grupo,
      responsable: responsable.trim(),
      observacion: observacion.trim(),
      fechaModo: isAccum ? "acumulado" : "diario",
      origen: "Registro manual",
      createdAt: new Date().toISOString()
    };

    onAddRecord(newRecord);
    handleClear();
    alert("Registro guardado con éxito.");
  };

  const renderSideSummary = () => {
    if (isAccum) {
      const total = records
        .filter(r => r.tipo === "Levantadas")
        .reduce((sum, r) => sum + Number(r.cantidad || 0), 0);
      return (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p><span className="pill p-lev">Bolsa Acumulada</span></p>
          <h1 style={{ fontSize: '3.6rem', margin: '14px 0', color: 'var(--text)', fontWeight: 800, letterSpacing: '-0.05em' }}>{total}</h1>
          <p className="sub" style={{ margin: 0 }}>Total acumulado histórico registrado.</p>
        </div>
      );
    }

    const list = records.filter(r => r.fecha === fecha && r.tipo === (kind === "Otros" ? "Otros" : kind));
    if (!list.length) {
      return (
        <div className="empty" style={{ padding: '24px 0' }}>
          No hay registros de tipo {kind} para el {formatDate(fecha)}.
        </div>
      );
    }

    const map = {};
    list.forEach(r => {
      map[r.campo] = (map[r.campo] || 0) + Number(r.cantidad || 0);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        <p style={{ fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', fontSize: '0.84rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Totales del {formatDate(fecha)}:
        </p>
        {Object.entries(map).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}:</span>
            <b style={{ color: 'var(--text)' }}>{v} unidades</b>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="section active">
      <div className="card">
        <h2>Registro de Gestión Diaria</h2>
        <p className="sub">Define la actividad y procesa el registro. El formulario se adaptará de forma inteligente según la categoría elegida.</p>

        {/* Clean, premium segmented tab selector (No huge card buttons!) */}
        <div className="segmented-control no-print">
          <div className={`segment-item ${kind === "Pólizas" ? "active" : ""}`} onClick={() => setKind("Pólizas")}>
            Pólizas
          </div>
          <div className={`segment-item ${kind === "Levantadas" ? "active" : ""}`} onClick={() => setKind("Levantadas")}>
            Levantadas
          </div>
          <div className={`segment-item ${kind === "Digitalización" ? "active" : ""}`} onClick={() => setKind("Digitalización")}>
            Digitalizadas
          </div>
          <div className={`segment-item ${kind === "Correos" ? "active" : ""}`} onClick={() => setKind("Correos")}>
            Correos
          </div>
        </div>

        <div className="grid two">
          <form onSubmit={handleSubmit} className="card" style={{ boxShadow: 'none', background: '#fff', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Formulario de {kind}</h2>
            <p className="sub" style={{ marginBottom: '14px' }}>Completa los campos necesarios para esta actividad.</p>

            <div className="form-grid">
              <div style={{ opacity: isAccum ? 0.48 : 1 }}>
                <label htmlFor="fecha">Fecha de Actividad</label>
                <input
                  type="date"
                  id="fecha"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  disabled={isAccum}
                />
                <div className="hint">
                  {isAccum ? "No aplica para bolsa acumulada." : "Define la productividad del día."}
                </div>
              </div>

              <div>
                <label htmlFor="cantidad">Cantidad Procesada</label>
                <input
                  type="number"
                  id="cantidad"
                  min="1"
                  step="1"
                  placeholder="Ej. 15"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="campo">Estado / Campo</label>
                <select id="campo" value={campo} onChange={(e) => setCampo(e.target.value)} required>
                  {(fieldsByKind[kind] || fieldsByKind["Otros"]).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="plan">Plan de Salud / Canal</label>
                <select id="plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
                  <option value="">No aplica</option>
                  <option value="Plan Básico">Plan Básico</option>
                  <option value="Onconaval">Onconaval</option>
                  <option value="Correo institucional">Correo institucional</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Sistema interno">Sistema interno</option>
                </select>
              </div>

              <div>
                <label htmlFor="grupo">Grupo de Trabajo</label>
                <select id="grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                  <option value="">No aplica</option>
                  <option value="Primer grupo">Primer grupo</option>
                  <option value="Segundo grupo">Segundo grupo</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label htmlFor="responsable">Responsable</label>
                <input
                  type="text"
                  id="responsable"
                  placeholder="Nombre de responsable"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                />
              </div>

              <div className="full">
                <label htmlFor="observacion">Observaciones / Detalles</label>
                <textarea
                  id="observacion"
                  placeholder="Ingresa aclaraciones o comentarios importantes sobre este lote de registros..."
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="actions" style={{ marginTop: '20px' }}>
              <button className="btn-primary" type="submit">Guardar Registro</button>
              <button className="btn-light" type="button" onClick={handleClear}>Limpiar</button>
            </div>

            <div className={`notice ${isAccum ? "orange" : ""}`} style={{ fontSize: '0.78rem', padding: '10px 14px' }}>
              {isAccum
                ? "El total acumulado de observaciones levantadas se almacena en bolsa general independiente de la fecha."
                : "Las pólizas, correos y digitalizaciones ingresadas con fecha se computan en las estadísticas diarias."}
            </div>
          </form>

          <div className="card" style={{ boxShadow: 'none', background: '#fff', border: '1px solid var(--border)', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
            <h2>Resumen del Estado</h2>
            <p className="sub">Carga procesada correspondiente a la selección actual.</p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {renderSideSummary()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
