// src/components/Costos.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler, ChartDataLabels);

const sumFloats = (arr, key) => arr.reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0);
const countUnique = (arr, key) => new Set(arr.map(item => item[key])).size;
const getFirstValueFromFiltered = (arr, targetKey, defaultValue = 0) => {
    return arr.length > 0 ? (parseFloat(arr[0][targetKey]) || defaultValue) : defaultValue;
};
const formatSoles = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) { return '0.00'; }
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const getStatusCellStyle = (statusValue, darkMode, textClassGlobal) => {
    const lowerStatus = statusValue?.toLowerCase();
    if (lowerStatus === 'ganancia') { return { color: darkMode ? '#A6FFB3' : '#0A4F15', backgroundColor: darkMode ? 'rgba(75, 231, 182, 0.1)' : 'rgba(200, 247, 217, 0.5)', fontWeight: 'bold' }; }
    if (lowerStatus === 'perdida') { return { color: darkMode ? '#FFB3B3' : '#7D1A1A', backgroundColor: darkMode ? 'rgba(255, 160, 160, 0.1)' : 'rgba(253, 206, 211, 0.5)', fontWeight: 'bold' }; }
    return {color: textClassGlobal};
};
const normalizeDate = (dateString) => {
  if (!dateString) return null; const sDate = String(dateString);
  if (sDate.includes('-')) { const parts = sDate.split('-'); if (parts.length === 3 && parts[0].length === 4) return sDate; }
  const parts = sDate.split('/');
  if (parts.length === 3) { const day = parts[0].padStart(2, '0'); const month = parts[1].padStart(2, '0'); const year = parts[2]; if (year.length === 4 && month.length === 2 && day.length === 2) { return `${year}-${month}-${day}`; } }
  try { const d = new Date(sDate); if (!isNaN(d.getTime())) { return d.toISOString().split('T')[0]; } } catch (e) {}
  return null;
};
const formatDateForAxis = (dateString_YYYY_MM_DD) => {
    if (!dateString_YYYY_MM_DD || !normalizeDate(dateString_YYYY_MM_DD)) { // normalizeDate verifica el formato YYYY-MM-DD
        return dateString_YYYY_MM_DD || '';
    }
    
    // Para asegurar que se trate como fecha local y no UTC,
    // separamos las partes y creamos el objeto Date.
    // new Date(year, monthIndex, day) se interpreta como local.
    const parts = dateString_YYYY_MM_DD.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-indexados
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day); // Esto es medianoche en la zona horaria local

    // Formatear usando la zona horaria del sistema (que es lo que usualmente se quiere para ejes)
    // O especificar 'UTC' si queremos forzar la interpretación de la fecha parseada como si fuera UTC,
    // pero dado el problema, queremos que se mantenga el día local.
    const options = { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Lima' }; // Forzar Lima para consistencia
    
    let formatted = new Intl.DateTimeFormat('es-PE', options).format(date);
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(/\./g, '').replace(',', '');
    return formatted;
};

// Paleta de colores "metálicos" / fuertes
const metallicColors = {
    blue: 'rgba(0, 123, 255, 0.8)', // Bootstrap primary blue
    teal: 'rgba(32, 201, 151, 0.8)', // Bootstrap teal/success
    orange: 'rgba(253, 126, 20, 0.8)', // Bootstrap orange
    purple: 'rgba(111, 66, 193, 0.8)', // Bootstrap purple
    red: 'rgba(220, 53, 69, 0.8)', // Bootstrap danger red
    yellow: 'rgba(255, 193, 7, 0.8)', // Bootstrap warning yellow
    green: 'rgba(25, 135, 84, 0.8)', // Bootstrap success green
    cyan: 'rgba(13, 202, 240, 0.8)', // Bootstrap info cyan
    grey: 'rgba(108, 117, 125, 0.8)', // Bootstrap secondary grey
    
    blue_border: 'rgb(0, 123, 255)',
    teal_border: 'rgb(32, 201, 151)',
    orange_border: 'rgb(253, 126, 20)',
    purple_border: 'rgb(111, 66, 193)',
    red_border: 'rgb(220, 53, 69)',
    yellow_border: 'rgb(255, 193, 7)',
    green_border: 'rgb(25, 135, 84)',
    cyan_border: 'rgb(13, 202, 240)',
    grey_border: 'rgb(108, 117, 125)',
};

function Costos({ setIsAuthenticated, darkMode }) {
  const [activeTab, setActiveTab] = useState('grafico');
  const [rawData, setRawData] = useState([]); const [ganttData, setGanttData] = useState([]);
  const [filteredData, setFilteredData] = useState([]); const [filteredGanttData, setFilteredGanttData] = useState([]);
  const [loading, setLoading] = useState(true); const [loadingGantt, setLoadingGantt] = useState(true);
  const [error, setError] = useState(null); const [errorGantt, setErrorGantt] = useState(null);
  const [filters, setFilters] = useState({ descripcion_labor: '', lote: '', fecha_inicio: '', fecha_fin: '' });
  const [rankingTrabajadorSeleccionado, setRankingTrabajadorSeleccionado] = useState(null);
  const [detallePersonaFilter, setDetallePersonaFilter] = useState('');
  const [showDataLabels, setShowDataLabels] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const textClass = darkMode ? 'rgb(230, 230, 230)' : 'rgb(40, 40, 40)'; // Colores más específicos para texto de chart
  const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const cardClass = `card shadow-sm mb-4 ${darkMode ? 'bg-dark border-secondary text-light' : 'bg-light'}`;
  const inputBgClass = darkMode ? 'form-control bg-dark text-white border-secondary' : 'form-control bg-light text-dark';
  const tableClass = `table table-sm table-striped table-hover ${darkMode ? 'table-dark' : ''}`;
  const navLinkClass = (tabName) => `nav-link ${darkMode ? 'text-light' : 'text-dark'} ${activeTab === tabName ? 'active fw-bold ' + (darkMode ? 'bg-secondary' : 'bg-primary text-white') : ''}`;
  const buttonSecondaryClass = `btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-secondary'}`;

  const fetchDataFromApi = async (specificEndpoint, options = {}, isGantt = false) => {
    if (!isGantt) setLoading(true); else setLoadingGantt(true); if (!isGantt) setError(null); else setErrorGantt(null);
    try {
      const token = localStorage.getItem('token'); const headers = { 'Content-Type': 'application/json', ...options.headers }; if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`${apiBaseUrl}${specificEndpoint}`, { method: 'GET', ...options, headers });
      if (!response.ok) { if ((response.status === 401 || response.status === 403) && setIsAuthenticated) setIsAuthenticated(false); const errorData = await response.json().catch(() => ({ message: response.statusText })); throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`); }
      if (response.status === 204) return null; return await response.json();
    } catch (err) { if (!isGantt) setError(err.message); else setErrorGantt(err.message); throw err;
    } finally { if (!isGantt) setLoading(false); else setLoadingGantt(false); }
  };

  useEffect(() => {
    const initialTokenCheck = () => { if (!localStorage.getItem('token') && setIsAuthenticated) setIsAuthenticated(false); }; initialTokenCheck();
    fetchDataFromApi(`/resumen/parte-diario`).then(data => { if (data && Array.isArray(data)) { setRawData(data.map(item => ({...item, fecha_norm: normalizeDate(item.fecha)}))); } else { setRawData([]); setError(prev => prev || "Datos de Parte Diario no son un array o están vacíos."); } }).catch(err => { console.error("Error fetching parte-diario:", err)});
    fetchDataFromApi(`/resumen/gantt`, {}, true).then(data => { if (data && Array.isArray(data)) { setGanttData(data.map(item => ({...item, fecha_norm: normalizeDate(item.fecha)}))); } else { setGanttData([]); setErrorGantt(prev => prev || "Datos de Gantt no son un array o están vacíos."); } }).catch(err => { console.error("Error fetching gantt:", err)});
  }, [apiBaseUrl, setIsAuthenticated]);

  const handleFilterChange = (e) => { const { name, value } = e.target; setFilters(prev => ({ ...prev, [name]: value })); };

  useEffect(() => {
    let data = rawData.filter(item => item.fecha_norm); if (filters.descripcion_labor) { const lF = filters.descripcion_labor.toLowerCase(); data = data.filter(i => i.descripcion_labor?.toLowerCase().includes(lF) || i.cod?.toString().toLowerCase().includes(lF)); } if (filters.lote) { const lL = filters.lote.toLowerCase(); data = data.filter(i => i.lote?.toLowerCase().includes(lL)); } if (filters.fecha_inicio) { data = data.filter(i => i.fecha_norm >= filters.fecha_inicio); } if (filters.fecha_fin) { data = data.filter(i => i.fecha_norm <= filters.fecha_fin); } setFilteredData(data);
    let ganttDataFiltered = ganttData.filter(item => item.fecha_norm); if (filters.descripcion_labor) { const lF = filters.descripcion_labor.toLowerCase(); ganttDataFiltered = ganttDataFiltered.filter(i => i.labor?.toLowerCase().includes(lF) || i.cod?.toString().toLowerCase().includes(lF)); } if (filters.lote) { const lL = filters.lote.toLowerCase(); ganttDataFiltered = ganttDataFiltered.filter(i => i.lote?.toLowerCase().includes(lL)); } if (filters.fecha_inicio) { ganttDataFiltered = ganttDataFiltered.filter(i => i.fecha_norm >= filters.fecha_inicio); } if (filters.fecha_fin) { ganttDataFiltered = ganttDataFiltered.filter(i => i.fecha_norm <= filters.fecha_fin); } setFilteredGanttData(ganttDataFiltered);
  }, [rawData, ganttData, filters]);

  const statusSummary = useMemo(() => { const summary = { 'Ganancia': 0, 'Perdida': 0, 'N/D': 0 }; filteredData.forEach(item => { const status = item.productividad_ganancia || 'N/D'; if (summary[status] !== undefined) summary[status]++; else summary['N/D']++; }); return summary; }, [filteredData]);
  const pieChartDataGananciaPerdida = useMemo(() => ({ labels: Object.keys(statusSummary).filter(key => statusSummary[key] > 0), datasets: [{ data: Object.values(statusSummary).filter(value => value > 0), backgroundColor: [ metallicColors.green, metallicColors.red, metallicColors.grey ].slice(0, Object.values(statusSummary).filter(value => value > 0).length), borderColor: darkMode ? '#212529' : '#fff', borderWidth: 2, }] }), [statusSummary, darkMode]);
  const dailyStatusSummary = useMemo(() => { const daily = {}; filteredData.forEach(item => { if (!item.fecha_norm) return; if (!daily[item.fecha_norm]) daily[item.fecha_norm] = { 'Ganancia': 0, 'Perdida': 0, 'N/D': 0 }; const status = item.productividad_ganancia || 'N/D'; if (status === "Ganancia") daily[item.fecha_norm]['Ganancia']++; else if (status === "Perdida") daily[item.fecha_norm]['Perdida']++; else daily[item.fecha_norm]['N/D']++; }); const labels = Object.keys(daily).sort(); return { labels, datasets: [ { label: 'Ganancia', data: labels.map(date => daily[date]['Ganancia']), backgroundColor: metallicColors.green, borderColor: metallicColors.green_border }, { label: 'Pérdida', data: labels.map(date => daily[date]['Perdida']), backgroundColor: metallicColors.red, borderColor: metallicColors.red_border }, ] }; }, [filteredData, darkMode]);
  const latestDateForSummary = useMemo(() => { if (filters.fecha_fin) return filters.fecha_fin; if (filters.fecha_inicio) return filters.fecha_inicio; if (filteredData.length > 0) { return filteredData.reduce((max, p) => (p.fecha_norm && (!max || p.fecha_norm > max)) ? p.fecha_norm : max, null); } return null; }, [filteredData, filters.fecha_inicio, filters.fecha_fin]);
  const latestDateData = useMemo(() => { if (!latestDateForSummary) return []; return filteredData.filter(item => item.fecha_norm === latestDateForSummary); }, [filteredData, latestDateForSummary]);
  const proyeccionHoy = useMemo(() => { if (latestDateData.length === 0) return null; const tPP = sumFloats(latestDateData, 'proy_pago'); const tPTA = sumFloats(latestDateData, 'proy_term_avance1'); const eG = latestDateData.some(i => i.proyeccion_ganancia === 'Perdida') ? 'Perdida' : 'Ganancia'; return { precioProy: formatSoles(tPTA > 0 ? (tPP / tPTA) : 0), totalPlantasProy: tPTA.toFixed(0), trabajadores: countUnique(latestDateData, 'dni'), pagoProy: formatSoles(tPP), perdidaProy: formatSoles(sumFloats(latestDateData, 'proy_perdida')), estado: eG, }; }, [latestDateData]);
  const realHoy = useMemo(() => { if (latestDateData.length === 0) return null; const tPDP = sumFloats(latestDateData, 'prod_pago'); const tP = sumFloats(latestDateData, 'productividad'); const eG = latestDateData.some(i => i.productividad_ganancia === 'Perdida') ? 'Perdida' : 'Ganancia'; return { precioReal: formatSoles(tP > 0 ? (tPDP / tP) : 0), totalPlantasReal: tP.toFixed(0), trabajadores: countUnique(latestDateData, 'dni'), pagoReal: formatSoles(tPDP), perdidaReal: formatSoles(sumFloats(latestDateData, 'prod_perdida')), estado: eG, }; }, [latestDateData]);
  const proyRealMiniChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false }, datalabels: { display: false } }};
  const proyeccionMiniChartData = proyeccionHoy ? { labels: ['Pago Proy.', 'Pérdida Proy.'], datasets: [{ data: [parseFloat(String(proyeccionHoy.pagoProy).replace(/,/g, '')) || 0, parseFloat(String(proyeccionHoy.perdidaProy).replace(/,/g, '')) || 0], backgroundColor: [metallicColors.teal, metallicColors.orange]}]} : null;
  const realMiniChartData = realHoy ? { labels: ['Pago Real', 'Pérdida Real'], datasets: [{ data: [parseFloat(String(realHoy.pagoReal).replace(/,/g, '')) || 0, parseFloat(String(realHoy.perdidaReal).replace(/,/g, '')) || 0], backgroundColor: [metallicColors.blue, metallicColors.yellow]}]} : null;
  const zebraChartData = useMemo(() => { const dC = {}; filteredData.forEach(i => { if (!i.fecha_norm) return; if (!dC[i.fecha_norm]) dC[i.fecha_norm] = { gR: 0, pR: 0 }; if (i.productividad_ganancia === 'Ganancia') dC[i.fecha_norm].gR++; else if (i.productividad_ganancia === 'Perdida') dC[i.fecha_norm].pR++; }); const lbls = Object.keys(dC).sort(); const dVals = lbls.map(d => dC[d].pR > dC[d].gR ? -1 : 1); return { labels:lbls, datasets: [{ label: 'Conclusión del Día', data: dVals, backgroundColor: dVals.map(v => v === 1 ? metallicColors.green : metallicColors.red), borderColor: dVals.map(v => v === 1 ? metallicColors.green_border : metallicColors.red_border), borderWidth: 1 }] }; }, [filteredData, darkMode]);
  const laborSummary = useMemo(() => { if (!filters.descripcion_labor && !filters.lote) return null; const pO = getFirstValueFromFiltered(filteredData, 'ppt_soles', 0); const plO = getFirstValueFromFiltered(filteredData, 'plts_prod', 0); const aPS = sumFloats(filteredData, 'prod_pago'); const pA = sumFloats(filteredData, 'productividad'); const pUP = getFirstValueFromFiltered(filteredData, 'precio', 0); const pF = pO - aPS; const plF = plO - pA; const avP = plO > 0 ? (pA / plO * 100) : 0; const prA = pA > 0 ? (aPS / pA) : 0; const mRD = getFirstValueFromFiltered(filteredData, 'min', 1); const jPT = plF > 0 && mRD > 0 ? (plF / mRD) : 0; return { lote: filters.lote || "N/A", labor: filters.descripcion_labor || "N/A", avancePresupSoles: formatSoles(aPS), presupuesto: formatSoles(pO), presupuestoFaltante: formatSoles(pF), plantasObjetivo: plO.toFixed(0), plantasAvanzadas: pA.toFixed(0), avancePorcentaje: avP.toFixed(2) + '%', plantasFaltantes: plF.toFixed(0), precioPPT: formatSoles(pUP), precioActual: formatSoles(prA), deficit: formatSoles(aPS - pO), jornalesParaTerminar: jPT.toFixed(2), costoProyectadoPorGastar: formatSoles(plF * pUP), deficitProyectado: formatSoles((plF * pUP) - pF), }; }, [filteredData, filters.lote, filters.descripcion_labor]);
  const rankingTrabajadores = useMemo(() => { const wS = {}; filteredData.forEach(i => { if (!wS[i.trabajador]) { wS[i.trabajador] = { dni: i.dni, nombre: i.trabajador, totalProdGanancia: 0 }; } wS[i.trabajador].totalProdGanancia += (parseFloat(i.prod_ganancia) || 0); }); return Object.values(wS).sort((a, b) => b.totalProdGanancia - a.totalProdGanancia).slice(0, 5); }, [filteredData]);
  const detallesTrabajadorData = useMemo(() => { let dTS = filteredData; if (rankingTrabajadorSeleccionado) { dTS = dTS.filter(i => i.dni === rankingTrabajadorSeleccionado.dni); } if (detallePersonaFilter) { const lF = detallePersonaFilter.toLowerCase(); dTS = dTS.filter(i => i.trabajador?.toLowerCase().includes(lF) || i.dni?.includes(detallePersonaFilter)); } return dTS; }, [filteredData, rankingTrabajadorSeleccionado, detallePersonaFilter]);
  const detallesTableTotals = useMemo(() => ({ proy_pago: sumFloats(detallesTrabajadorData, 'proy_pago'), proy_perdida: sumFloats(detallesTrabajadorData, 'proy_perdida'), prod_pago: sumFloats(detallesTrabajadorData, 'prod_pago'), prod_perdida: sumFloats(detallesTrabajadorData, 'prod_perdida'), }), [detallesTrabajadorData]);
  const personasGanttVsRealChartData = useMemo(() => { if (filteredGanttData.length === 0 && filteredData.length === 0) return null; const dD = {}; filteredGanttData.forEach(g => { if (!g.fecha_norm) return; if (!dD[g.fecha_norm]) dD[g.fecha_norm] = { p: 0, r: 0 }; dD[g.fecha_norm].p += (parseFloat(g.personas) || 0); }); const rABD = {}; filteredData.forEach(pd => { if (!pd.fecha_norm) return; if (!rABD[pd.fecha_norm]) rABD[pd.fecha_norm] = new Set(); rABD[pd.fecha_norm].add(pd.dni); }); Object.keys(rABD).forEach(dt => { if (!dD[dt]) dD[dt] = { p: 0, r: 0 }; dD[dt].r = rABD[dt].size; }); const lbls = Object.keys(dD).sort(); if (lbls.length === 0) return null; return { labels:lbls, datasets: [ { label: 'Personas Proyectadas (Gantt)', data: lbls.map(l => dD[l].p), borderColor: metallicColors.blue_border, backgroundColor: metallicColors.blue, type: 'line', tension: 0.1, yAxisID: 'yPersonas' }, { label: 'Personas Reales (Asistencia)', data: lbls.map(l => dD[l].r), borderColor: metallicColors.teal_border, backgroundColor: metallicColors.teal, type: 'line', tension: 0.1, yAxisID: 'yPersonas' }, ] }; }, [filteredGanttData, filteredData]);
  const comparativoPersonasTableData = useMemo(() => { if (!personasGanttVsRealChartData || !personasGanttVsRealChartData.labels || personasGanttVsRealChartData.labels.length === 0) { return []; } return personasGanttVsRealChartData.labels.map((lbl, idx) => ({ fecha: lbl, proyectado: personasGanttVsRealChartData.datasets[0].data[idx] || 0, real: personasGanttVsRealChartData.datasets[1].data[idx] || 0, diferencia: (personasGanttVsRealChartData.datasets[1].data[idx] || 0) - (personasGanttVsRealChartData.datasets[0].data[idx] || 0), })); }, [personasGanttVsRealChartData]);
  const laborDurationProgress = useMemo(() => { if (!filters.descripcion_labor || !filters.lote) return null; const pD = new Set(filteredGanttData.map(g => g.fecha_norm).filter(Boolean)); const pDur = pD.size; const aWD = new Set(filteredData.map(pd => pd.fecha_norm).filter(Boolean)); const aDW = aWD.size; return { projectedDuration:pDur, actualDaysWorked:aDW, remainingDays: pDur > aDW ? pDur - aDW : 0, progressPercentage: pDur > 0 ? (aDW / pDur * 100) : 0 }; }, [filteredGanttData, filteredData, filters.descripcion_labor, filters.lote]);
  const sCurveData = useMemo(() => { if (!filters.descripcion_labor || !filters.lote) return { daily: null, cumulative: null, warning: "Seleccione una Labor y Lote para ver la Curva S." }; const tP = getFirstValueFromFiltered(filteredData, 'plts_prod', 0); if (tP === 0) return { daily: null, cumulative: null, warning: "Plantas objetivo (plts_prod) no definidas o es cero." }; const mPDPP = getFirstValueFromFiltered(filteredData, 'min', 0); let wMsg = null; if (mPDPP === 0 && filteredGanttData.some(g=>(parseFloat(g.personas)||0)>0)) { wMsg = "Alerta: 'min' de parte_diario es 0 o no hay datos. Avance proyectado será 0."; } const dV = {}; filteredGanttData.forEach(g => { if (!g.fecha_norm) return; if (!dV[g.fecha_norm]) dV[g.fecha_norm] = { pP: 0, rP: 0 }; const pG = parseFloat(g.personas) || 0; dV[g.fecha_norm].pP += pG * mPDPP; }); filteredData.forEach(pd => { if (!pd.fecha_norm) return; if (!dV[pd.fecha_norm]) dV[pd.fecha_norm] = { pP: 0, rP: 0 }; dV[pd.fecha_norm].rP += (parseFloat(pd.productividad) || 0); }); const sDts = Object.keys(dV).sort(); if (sDts.length === 0) return { daily: null, cumulative: null, warning: (wMsg || "No hay datos para Curva S.") }; let cPP = 0, cRP = 0; const dlyC = { lbls: [], p: [], r: [] }; const cumC = { lbls: [], p: [], r: [] }; sDts.forEach(dt => { const dP = dV[dt].pP; const dR = dV[dt].rP; cPP += dP; cRP += dR; dlyC.lbls.push(dt); dlyC.p.push(tP > 0 ? (dP / tP * 100) : 0); dlyC.r.push(tP > 0 ? (dR / tP * 100) : 0); cumC.lbls.push(dt); cumC.p.push(tP > 0 ? (cPP / tP * 100) : 0); cumC.r.push(tP > 0 ? (cRP / tP * 100) : 0); });
    return {
      daily: { labels: dlyC.lbls, datasets: [ { label: '% Avance Diario Proy.', data: dlyC.p, borderColor: metallicColors.blue_border, backgroundColor: metallicColors.blue, fill:true, tension: 0.1, yAxisID: 'yPercent' }, { label: '% Avance Diario Real', data: dlyC.r, borderColor: metallicColors.teal_border, backgroundColor: metallicColors.teal, fill:true, tension: 0.1, yAxisID: 'yPercent' }, ]},
      cumulative: { labels: cumC.lbls, datasets: [ { label: '% Avance Acum. Proy.', data: cumC.p, borderColor: metallicColors.orange_border, backgroundColor: metallicColors.orange, fill:true, tension: 0.1, yAxisID: 'yPercent' }, { label: '% Avance Acum. Real', data: cumC.r, borderColor: metallicColors.purple_border, backgroundColor: metallicColors.purple, fill:true, tension: 0.1, yAxisID: 'yPercent' }, ]},
      warning: wMsg
    };
  }, [filteredGanttData, filteredData, filters.descripcion_labor, filters.lote]);
  const gastoDiarioRealChartData = useMemo(() => { if (filteredData.length === 0) return null; const dG = {}; filteredData.forEach(pd => { if (!pd.fecha_norm) return; if (!dG[pd.fecha_norm]) dG[pd.fecha_norm] = 0; dG[pd.fecha_norm] += (parseFloat(pd.prod_pago) || 0); }); const lbls = Object.keys(dG).sort(); if (lbls.length === 0) return null; const data = lbls.map(date => dG[date]); return { labels:lbls, datasets: [{ label: 'Gasto Real Diario (S/)', data, backgroundColor: metallicColors.yellow, borderColor: metallicColors.yellow_border, borderWidth: 1, type: 'bar', yAxisID: 'ySoles' }] }; }, [filteredData, darkMode]);

  const commonChartOptions = (titleText, yAxisLabel, yAxisID = 'yDefault') => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: textClass, boxWidth: 12, padding: 8, font: { size: 10 } } },
      title: { display: !!titleText, text: titleText, color: textClass, font:{size:12, weight:'bold'} }, // Mostrar título solo si se proporciona
      tooltip: { backgroundColor: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)', titleColor: textClass, bodyColor: textClass, borderColor: gridColor, borderWidth:1, padding:10, boxPadding:4, titleFont:{size:12}, bodyFont:{size:10} },
      datalabels: {
        display: showDataLabels,
        backgroundColor: function(context) { return context.dataset.borderColor || (darkMode? 'rgba(80,80,80,0.7)' : 'rgba(200,200,200,0.7)'); },
        borderColor: function(context) {return context.dataset.borderColor || (darkMode? 'rgba(200,200,200,0.7)' : 'rgba(80,80,80,0.7)');},
        borderWidth: 1,
        borderRadius: 4,
        color: darkMode ? 'rgb(230,230,230)' : 'rgb(20,20,20)',
        font: { size: 9, weight: 'bold' }, padding: {top:3, bottom:2, left:4, right:4},
        anchor: 'end', align: 'top', offset:4,
        formatter: (value, context) => { 
            if (context.dataset.label?.includes('%')) return `${parseFloat(value).toFixed(1)}%`;
            if (yAxisID === 'ySoles' || context.dataset.label?.includes('(S/)')) return formatSoles(value); 
            if (yAxisID === 'yPercent') return `${parseFloat(value).toFixed(1)}%`; 
            return parseFloat(value).toFixed(context.dataset.label?.includes('Personas') ? 0 : 1);
        }
      }
    },
    scales: {
      x: { grid: {color: gridColor}, ticks: { color: textClass, autoSkip: true, maxTicksLimit: 7, font:{size:10}, callback: function(value) { return formatDateForAxis(this.getLabelForValue(value)); } } },
      [yAxisID]: { grid: {color: gridColor}, type: 'linear', display: true, position: 'left', title: { display: !!yAxisLabel, text: yAxisLabel, color: textClass, font:{size:10} }, ticks: { color: textClass, font:{size:10}, callback: (value) => { if (yAxisID === 'ySoles' || yAxisID === 'ySolesBar') return formatSoles(value); if (yAxisID === 'yPercent') return `${parseFloat(value).toFixed(0)}%`; return parseFloat(value).toFixed(0); }}}
    }
  });
  
  // Opciones específicas para el pie chart (sin ejes X/Y)
  const pieChartOptions = (titleText) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: textClass, boxWidth:12, padding:8, font:{size:10} } },
      title: { display: !!titleText, text: titleText, color: textClass, font:{size:12, weight:'bold'} },
      tooltip: { backgroundColor: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)', titleColor: textClass, bodyColor: textClass, borderColor: gridColor, borderWidth:1, padding:10, boxPadding:4 },
      datalabels: {
        display: showDataLabels,
        color: darkMode ? 'rgb(20,20,20)' : 'rgb(240,240,240)', // Color de texto que contraste con el segmento
        font: { weight: 'bold', size: 10 },
        formatter: (value, ctx) => {
            let sum = 0; let dataArr = ctx.chart.data.datasets[0].data; dataArr.map(data => { sum += data; });
            let percentage = (value*100 / sum).toFixed(1)+"%"; return percentage;
        },
      }
    }
  });


  const isLoading = loading || loadingGantt; const anyError = error || errorGantt;
  if (isLoading) return <div className="container-fluid text-center py-5"><div className={`spinner-border ${textClass}`} style={{ width: '3rem', height: '3rem' }} role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (anyError) return <div className={`container-fluid alert alert-danger mt-4 ${darkMode ? 'text-white bg-danger border-danger' : ''}`} role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>Error principal: {error || 'Error desconocido'}<br/>{errorGantt && `Error Gantt: ${errorGantt}`}</div>;

  return (
    <div className="container-fluid py-3">
      <style jsx global>{`
        .tabla-detalles-pequena td, .tabla-detalles-pequena th { font-size: 0.75rem !important; padding: 0.2rem 0.35rem !important; white-space: nowrap;}
        .tabla-resumen-gantt td, .tabla-resumen-gantt th { font-size: 0.73rem !important; padding: 0.15rem 0.25rem !important; white-space: nowrap;}
      `}</style>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"> <button className={navLinkClass('grafico')} onClick={() => setActiveTab('grafico')}> <i className="bi bi-bar-chart-line-fill me-1"></i> Gráficos y Resumen </button> </li>
        <li className="nav-item"> <button className={navLinkClass('detalles')} onClick={() => setActiveTab('detalles')}> <i className="bi bi-table me-1"></i> Detalles del Personal </button> </li>
      </ul>

      {activeTab === 'grafico' && (
        <div>
            <div className={cardClass}>
                <div className="card-body"> <h5 className="card-title mb-3">Filtros</h5> 
                  <div className="row g-3 align-items-end">
                    <div className="col-md"><label htmlFor="descripcion_labor" className="form-label form-label-sm">Labor (Nombre o Código)</label><input type="text" className={inputBgClass} id="descripcion_labor" name="descripcion_labor" value={filters.descripcion_labor} onChange={handleFilterChange} placeholder="Ej: PODA o 147"/></div>
                    <div className="col-md"><label htmlFor="lote" className="form-label form-label-sm">Lote</label><input type="text" className={inputBgClass} id="lote" name="lote" value={filters.lote} onChange={handleFilterChange} placeholder="Ej: 005"/></div>
                    <div className="col-md"><label htmlFor="fecha_inicio" className="form-label form-label-sm">Fecha Inicio</label><input type="date" className={inputBgClass} id="fecha_inicio" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange}/></div>
                    <div className="col-md"><label htmlFor="fecha_fin" className="form-label form-label-sm">Fecha Fin</label><input type="date" className={inputBgClass} id="fecha_fin" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange}/></div>
                    <div className="col-md-auto"> <button className={`${buttonSecondaryClass} w-100`} onClick={() => setShowDataLabels(!showDataLabels)} title="Mostrar/Ocultar etiquetas en gráficos"> <i className={`bi ${showDataLabels ? 'bi-tag-fill' : 'bi-tag'}`}></i> {showDataLabels ? 'Ocultar' : 'Mostrar'} Etqt. </button> </div>
                  </div>
                </div>
            </div>

            {/* SECCIÓN 1: ANÁLISIS DE PROYECCIÓN (GANTT) */}
            <div className="mt-2">
                <h4 className={textClass}><i className="bi bi-calendar3-range me-2"></i>Análisis de Proyección (Gantt)</h4>
                {(!filters.descripcion_labor || !filters.lote) && <p className={`fst-italic ${textClass} mb-2`}><small>Seleccione una Labor (Nombre o Código) y Lote para ver este análisis.</small></p>}
                <div className="row">
                    <div className="col-lg-5">
                        <div className={cardClass} style={{minHeight:'360px'}}> <div className="card-body d-flex flex-column">
                        {personasGanttVsRealChartData && personasGanttVsRealChartData.labels.length > 0 ? (
                            <div className="flex-grow-1" style={{maxHeight: '300px'}}> <Line data={personasGanttVsRealChartData} options={commonChartOptions('Personas: Proyectadas vs. Reales','Nº Personas', 'yPersonas')} /> </div>
                        ) : <p className="fst-italic text-center my-auto">No hay datos de personas o filtros no aplicados.</p>}
                        </div></div>
                    </div>
                    <div className="col-lg-3">
                         <div className={cardClass} style={{minHeight:'360px'}}> <div className="card-body"> <h6 className="card-title text-center">Resumen Diario Personas</h6>
                         {comparativoPersonasTableData.length > 0 ? (
                            <div className="table-responsive" style={{maxHeight: '280px', overflowY:'auto'}}>
                                <table className={`${tableClass} tabla-resumen-gantt w-100`}>
                                    <thead><tr><th>Fecha</th><th>Proy.</th><th>Real</th><th>Dif.</th></tr></thead>
                                    <tbody>{comparativoPersonasTableData.map(row => ( <tr key={row.fecha}>
                                        <td>{formatDateForAxis(row.fecha)}</td> <td>{row.proyectado}</td> <td>{row.real}</td>
                                        <td style={getStatusCellStyle(row.diferencia < 0 ? 'Perdida' : (row.diferencia > 0 ? 'Ganancia':''), darkMode, textClass )}>{row.diferencia !== 0 ? row.diferencia : '-'}</td>
                                    </tr>))}</tbody>
                                </table>
                            </div>
                         ) : <p className="fst-italic text-center mt-3">No hay datos.</p>}
                         </div></div>
                    </div>
                    <div className="col-lg-4">
                        <div className={cardClass} style={{minHeight:'360px'}}> <div className="card-body d-flex flex-column justify-content-center"> <h6 className="card-title">Progreso Duración Labor</h6>
                        {(laborDurationProgress && filters.descripcion_labor && filters.lote) ? (<>
                            <p className="mb-1 small"><strong>Labor:</strong> {filters.descripcion_labor} - <strong>Lote:</strong> {filters.lote}</p>
                            <hr className="my-1"/>
                            <p className="mb-1 small"><strong>Duración Proyectada (Gantt):</strong> {laborDurationProgress.projectedDuration} días</p>
                            <p className="mb-1 small"><strong>Días Reales Trabajados:</strong> {laborDurationProgress.actualDaysWorked} días</p>
                            <p className="mb-1 small"><strong>Días Proyectados Restantes:</strong> {laborDurationProgress.remainingDays} días</p>
                            {laborDurationProgress.projectedDuration > 0 && <div className="progress mt-2" style={{height: '25px', fontSize:'0.8rem'}}> <div className={`progress-bar ${darkMode? 'bg-info':'bg-primary'} progress-bar-striped progress-bar-animated`} role="progressbar" style={{width: `${laborDurationProgress.progressPercentage.toFixed(2)}%`}} aria-valuenow={laborDurationProgress.progressPercentage} aria-valuemin="0" aria-valuemax="100"> {laborDurationProgress.progressPercentage.toFixed(0)}% </div> </div> }
                        </>) : <p className="fst-italic text-center mt-3">Seleccione Labor y Lote.</p>}
                        </div></div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: RESUMEN DE LABOR */}
            {laborSummary && (
                <div className="mt-4">
                    <h4 className={textClass}><i className="bi bi-briefcase-fill me-2"></i>Resumen de Labor</h4>
                    <div className={cardClass}> <div className="card-body">
                        <h5 className="card-title">Resumen: {laborSummary.labor} (Lote: {laborSummary.lote})</h5>
                        <div className="row small">
                            <div className="col-md-6 col-lg-4 mb-2"><strong>Avance Presup. (S/):</strong> {laborSummary.avancePresupSoles}</div> <div className="col-md-6 col-lg-4 mb-2"><strong>Presupuesto (S/):</strong> {laborSummary.presupuesto}</div> <div className="col-md-6 col-lg-4 mb-2"><strong>Presup. Faltante (S/):</strong> <span className={parseFloat(String(laborSummary.presupuestoFaltante).replace(/,/g, '')) < 0 ? 'text-danger fw-bold' : ''}>{laborSummary.presupuestoFaltante}</span></div>
                            <div className="col-md-6 col-lg-3 mb-2"><strong>Plantas Objetivo:</strong> {laborSummary.plantasObjetivo}</div> <div className="col-md-6 col-lg-3 mb-2"><strong>Plantas Avanzadas:</strong> {laborSummary.plantasAvanzadas}</div> <div className="col-md-6 col-lg-3 mb-2"><strong>Avance:</strong> {laborSummary.avancePorcentaje}</div> <div className="col-md-6 col-lg-3 mb-2"><strong>Plantas Faltantes:</strong> {laborSummary.plantasFaltantes}</div>
                            <div className="col-md-6 col-lg-3 mb-2"><strong>Precio Unit. PPT (S/):</strong> {laborSummary.precioPPT}</div> <div className="col-md-6 col-lg-3 mb-2"><strong>Precio Unit. Actual (S/):</strong> {laborSummary.precioActual}</div> <div className="col-md-6 col-lg-3 mb-2"><strong>Déficit Actual (S/):</strong> <span className={parseFloat(String(laborSummary.deficit).replace(/,/g, '')) > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>{laborSummary.deficit}</span></div> <div className="col-md-6 col-lg-3 mb-2"><strong>Jornales Estimados p/ Terminar:</strong> {laborSummary.jornalesParaTerminar}</div>
                            <div className="col-md-6 col-lg-6 mb-2"><strong>Costo Proy. por Gastar (S/):</strong> {laborSummary.costoProyectadoPorGastar}</div> <div className="col-md-6 col-lg-6 mb-2"><strong>Déficit Total Proyectado (S/):</strong> <span className={parseFloat(String(laborSummary.deficitProyectado).replace(/,/g, '')) > 0 ? 'text-danger fw-bold' : 'text-success fw-bold'}>{laborSummary.deficitProyectado}</span></div>
                        </div>
                        <div className="row mt-3">
                            <div className="col-md-6"> <Bar data={{ labels: ['Gasto Real vs. Presupuesto'], datasets: [ { label: 'Gasto Real (S/)', data: [parseFloat(String(laborSummary.avancePresupSoles).replace(/,/g, ''))], backgroundColor: metallicColors.blue, borderColor: metallicColors.blue_border, borderWidth:1 }, { label: 'Presupuesto (S/)', data: [parseFloat(String(laborSummary.presupuesto).replace(/,/g, ''))], backgroundColor: metallicColors.yellow, borderColor: metallicColors.yellow_border, borderWidth:1 } ] }} options={commonChartOptions('Gasto Real vs. Presupuesto (Soles)','Soles (S/)','ySolesBar')} style={{maxHeight: '180px'}} /> </div>
                            <div className="col-md-6"> <Bar data={{ labels: ['Plantas Avanzadas vs. Objetivo'], datasets: [ { label: 'Avanzadas', data: [parseFloat(laborSummary.plantasAvanzadas)], backgroundColor: metallicColors.teal, borderColor: metallicColors.teal_border, borderWidth:1 }, { label: 'Objetivo', data: [parseFloat(laborSummary.plantasObjetivo)], backgroundColor: metallicColors.purple, borderColor: metallicColors.purple_border, borderWidth:1 } ] }} options={commonChartOptions('Avance de Plantas','Nº Plantas','yPlantasBar')} style={{maxHeight: '180px'}}/> </div>
                        </div>
                    </div> </div>
                </div>
            )}

            {/* SECCIÓN 3: FILA DE 3 GRÁFICOS (AVANCE DIARIO, GASTO DIARIO, CURVA S ACUMULADA) */}
            {(filters.descripcion_labor && filters.lote) && (
                <div className="mt-2">
                    <h4 className={textClass}><i className="bi bi-graph-up-arrow me-2"></i>Análisis Detallado de Avance y Gasto</h4>
                    {sCurveData.warning && <div className={`alert alert-warning alert-sm ${darkMode? 'text-dark bg-warning border-warning':''}`} role="alert"><small><i className="bi bi-exclamation-triangle me-1"></i>{sCurveData.warning}</small></div>}
                    <div className="row">
                        <div className="col-lg-4"> <div className={cardClass}> <div className="card-body"> {sCurveData.daily && sCurveData.daily.labels.length > 0 ? ( <div style={{maxHeight: '300px'}}> <Line data={sCurveData.daily} options={commonChartOptions('% Avance Diario','%', 'yPercent')} /> </div> ): <p className="fst-italic text-center my-auto">No hay datos de Avance Diario.</p>} </div></div> </div>
                        <div className="col-lg-4"> <div className={cardClass}> <div className="card-body"> {gastoDiarioRealChartData && gastoDiarioRealChartData.labels.length > 0 ? ( <div style={{maxHeight: '300px'}}> <Bar data={gastoDiarioRealChartData} options={commonChartOptions('Gasto Real por Día','Soles (S/)', 'ySoles')} /> </div> ): <p className="fst-italic text-center my-auto">No hay datos de Gasto Diario.</p>} </div></div> </div>
                        <div className="col-lg-4"> <div className={cardClass}> <div className="card-body"> {sCurveData.cumulative && sCurveData.cumulative.labels.length > 0 ? ( <div style={{maxHeight: '300px'}}> <Line data={sCurveData.cumulative} options={commonChartOptions('% Avance Acumulado','%', 'yPercent')} /> </div> ): <p className="fst-italic text-center my-auto">No hay datos de Avance Acumulado.</p>} </div></div> </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN 4: OTROS INDICADORES GENERALES */}
            <div className="mt-4">
                <h4 className={textClass}><i className="bi bi-pie-chart-fill me-2"></i>Otros Indicadores Generales</h4>
                <div className="row">
                    <div className="col-lg-5"> <div className={cardClass}> <div className="card-body"> {(filteredData.length > 0 && pieChartDataGananciaPerdida.datasets[0].data.length > 0 && pieChartDataGananciaPerdida.datasets[0].data.some(d=>d>0) ) ?  <div style={{maxHeight: '300px'}}><Pie data={pieChartDataGananciaPerdida} options={pieChartOptions('Resumen Gral. Productividad')} /></div> : <p className="text-center fst-italic my-auto">No hay datos.</p>} </div></div> </div>
                    <div className="col-lg-7"> <div className={cardClass}> <div className="card-body"> {(filteredData.length > 0 && dailyStatusSummary.labels.length > 0 && dailyStatusSummary.datasets.some(ds => ds.data.some(d => d > 0))) ? <div style={{maxHeight: '300px'}}><Bar data={dailyStatusSummary} options={commonChartOptions('Productividad por Día (Conteo)', 'Conteo Actividades', 'yConteo')} /></div> : <p className="text-center fst-italic my-auto">No hay datos.</p>} </div></div> </div>
                </div>
                <h5 className={`mt-4 mb-3 ${textClass}`}>Resumen del Día ({latestDateForSummary || 'N/A'})</h5>
                <div className="row">
                    <div className="col-md-6"> <div className={cardClass}><div className="card-body"> <h6 className="card-title">Proyección del Día</h6> {proyeccionHoy ? (<div className="row"><div className="col-sm-7"> <small><strong>Precio Proy:</strong> S/ {proyeccionHoy.precioProy}</small><br/><small><strong>Total Plantas (Proy):</strong> {proyeccionHoy.totalPlantasProy}</small><br/><small><strong>Trabajadores:</strong> {proyeccionHoy.trabajadores}</small><br/><small><strong>Pago Proy:</strong> S/ {proyeccionHoy.pagoProy}</small><br/><small><strong>Pérdida Proy:</strong> S/ {proyeccionHoy.perdidaProy}</small><br/><small><strong>Estado General:</strong> <span style={getStatusCellStyle(proyeccionHoy.estado, darkMode, textClass)}>{proyeccionHoy.estado}</span></small> </div><div className="col-sm-5 d-flex align-items-center justify-content-center" style={{minHeight: '120px'}}> {proyeccionMiniChartData && <Pie data={proyeccionMiniChartData} options={proyRealMiniChartOptions} />}</div></div>) : <p className="fst-italic my-auto">No hay datos de proyección.</p>} </div></div></div>
                    <div className="col-md-6"> <div className={cardClass}><div className="card-body"> <h6 className="card-title">Real del Día</h6> {realHoy ? (<div className="row"><div className="col-sm-7"> <small><strong>Precio Real:</strong> S/ {realHoy.precioReal}</small><br/><small><strong>Total Plantas (Real):</strong> {realHoy.totalPlantasReal}</small><br/><small><strong>Trabajadores:</strong> {realHoy.trabajadores}</small><br/><small><strong>Pago Real:</strong> S/ {realHoy.pagoReal}</small><br/><small><strong>Pérdida Real:</strong> S/ {realHoy.perdidaReal}</small><br/><small><strong>Estado General:</strong> <span style={getStatusCellStyle(realHoy.estado, darkMode, textClass)}>{realHoy.estado}</span></small> </div><div className="col-sm-5 d-flex align-items-center justify-content-center" style={{minHeight: '120px'}}> {realMiniChartData && <Pie data={realMiniChartData} options={proyRealMiniChartOptions} />}</div></div>) : <p className="fst-italic my-auto">No hay datos reales.</p>} </div></div></div>
                </div>
                <div className="row"> <div className="col-12"><div className={cardClass}><div className="card-body"> <h6 className="card-title text-center">Conclusión Diaria (Productividad)</h6> {zebraChartData.labels.length > 0 ? <div style={{maxHeight: '250px'}}><Bar data={zebraChartData} options={commonChartOptions('','Ganancia/Pérdida','yZebra', )} /></div> : <p className="text-center fst-italic my-auto">No hay datos.</p>} </div></div></div></div>
                <div className={cardClass}> <div className="card-body"> <h5 className="card-title">Top 5 Trabajadores (Por Suma de S/ prod_ganancia)</h5> {rankingTrabajadores.length > 0 ? ( <ul className="list-group list-group-flush"> {rankingTrabajadores.map(trab => ( <li key={trab.dni} className={`list-group-item d-flex justify-content-between align-items-center ${darkMode ? 'bg-dark text-light border-secondary' : ''}`}> <span><i className="bi bi-person-check-fill me-2 text-success"></i>{trab.nombre} (DNI: {trab.dni})</span> <div> <span className={`badge rounded-pill me-2 ${darkMode? 'bg-success-subtle text-success border border-success' : 'bg-success text-white'}`}>S/ {formatSoles(trab.totalProdGanancia)}</span> <button className={`btn btn-sm ${darkMode ? 'btn-outline-info' : 'btn-info'}`} onClick={() => { setRankingTrabajadorSeleccionado(trab); setActiveTab('detalles'); setDetallePersonaFilter('');}}> <i className="bi bi-search me-1"></i> Ver Detalles </button> </div> </li> ))} </ul> ) : <p className="fst-italic my-auto">No hay datos para el ranking.</p>} </div></div>
            </div>
        </div>
      )}

      {activeTab === 'detalles' && (
        <div className={cardClass}> <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap"> <h5 className="card-title mb-2 me-3"> Detalles del Personal {rankingTrabajadorSeleccionado && ` (Seleccionado: ${rankingTrabajadorSeleccionado.nombre} - ${rankingTrabajadorSeleccionado.dni})`} </h5> <div className="d-flex align-items-center flex-grow-1" style={{maxWidth: '400px'}}> <input type="text" className={`${inputBgClass} form-control-sm me-2 flex-grow-1`} placeholder="Filtrar DNI o nombre..." value={detallePersonaFilter} onChange={(e) => { setDetallePersonaFilter(e.target.value); if(rankingTrabajadorSeleccionado && e.target.value.length > 0) setRankingTrabajadorSeleccionado(null);}} /> {rankingTrabajadorSeleccionado && ( <button className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-secondary'}`} onClick={() => setRankingTrabajadorSeleccionado(null)}> <i className="bi bi-x-circle me-1"></i> Limpiar </button> )} </div> </div>
            <p className="card-subtitle mb-2 text-muted small"> Filtros activos (Gráficos): Labor: {filters.descripcion_labor || 'Todos'}, Lote: {filters.lote || 'Todos'}, Fechas: {filters.fecha_inicio || 'Inicio'} al {filters.fecha_fin || 'Fin'} </p>
            {detallesTrabajadorData.length > 0 ? (
              <div className="table-responsive" style={{maxHeight: '600px', overflowY: 'auto'}}>
                <table className={`${tableClass} tabla-detalles-pequena`}>
                  <thead> <tr> <th>Fecha</th><th>DNI</th><th>Trabajador</th><th>Min</th><th>Max</th><th>Product.</th><th>Hrs. Trab.</th><th>Avc1</th><th>Hrs. Avc1</th> <th>Proy.T.Avc1</th><th style={{minWidth:'90px'}}>Proy. Estado</th><th>Proy. Pago</th><th>Proy. Pérdida</th> <th>Prod. Ganancia</th><th>Prod. Pago</th><th>Prod. Pérdida</th><th style={{minWidth:'90px'}}>Prod. Estado</th> </tr></thead>
                  <tbody>{detallesTrabajadorData.map((item, index) => ( <tr key={(item.parte_diario || 'gantt_item') + (item.dni||`idx-${index}`) + (item.cod || index) + (item.hora||index) + item.labor + item.fecha_norm }> <td>{item.fecha_norm || item.fecha}</td><td>{item.dni}</td><td>{item.trabajador}</td><td>{item.min}</td><td>{item.max}</td> <td>{item.productividad}</td><td>{item.horas_trabajadas}</td><td>{item.avance1}</td><td>{(parseFloat(item.horas_avance1) || 0).toFixed(2)}</td> <td>{(parseFloat(item.proy_term_avance1) || 0).toFixed(2)}</td> <td style={getStatusCellStyle(item.proyeccion_ganancia, darkMode, textClass)}>{item.proyeccion_ganancia}</td> <td>{formatSoles(item.proy_pago)}</td><td>{formatSoles(item.proy_perdida)}</td> <td>{formatSoles(item.prod_ganancia)}</td><td>{formatSoles(item.prod_pago)}</td><td>{formatSoles(item.prod_perdida)}</td> <td style={getStatusCellStyle(item.productividad_ganancia, darkMode, textClass)}>{item.productividad_ganancia}</td> </tr>))}</tbody>
                  <tfoot> <tr style={{borderTop: `2px solid ${darkMode ? '#555' : '#ccc'}`, backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}> <td colSpan="11" className="text-end fw-bold pt-2 pb-2">TOTALES:</td> <td className="fw-bold pt-2 pb-2">{formatSoles(detallesTableTotals.proy_pago)}</td> <td className="fw-bold pt-2 pb-2">{formatSoles(detallesTableTotals.proy_perdida)}</td> <td className="fw-bold pt-2 pb-2"></td> <td className="fw-bold pt-2 pb-2">{formatSoles(detallesTableTotals.prod_pago)}</td> <td className="fw-bold pt-2 pb-2">{formatSoles(detallesTableTotals.prod_perdida)}</td> <td className="pt-2 pb-2"></td> </tr></tfoot>
                </table>
              </div>
            ) : <p className="fst-italic">No hay datos detallados para mostrar con los filtros y selección actual.</p>}
          </div></div>
      )}
    </div>
  );
}
export default Costos;