// src/components/SupervisionIngreso.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const sumFloats = (arr, key) => arr.reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0);
const normalizeDate = (dateString) => {
  if (!dateString) return null; const sDate = String(dateString).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) { const parts = sDate.split('-'); const year = parseInt(parts[0],10); const month = parseInt(parts[1],10); const day = parseInt(parts[2],10); if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >=1 && day <=31) { return sDate; } }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sDate)) { const parts = sDate.split('/'); const day = parts[0].padStart(2, '0'); const month = parts[1].padStart(2, '0'); const year = parts[2]; const yearN = parseInt(year,10); const monthN = parseInt(month,10); const dayN = parseInt(day,10); if (yearN > 1900 && yearN < 2100 && monthN >= 1 && monthN <= 12 && dayN >=1 && dayN <=31) { return `${year}-${month}-${day}`; } }
  try { const d = new Date(sDate); if (d instanceof Date && !isNaN(d.valueOf())) { const year = d.getFullYear(); const month = (d.getMonth() + 1).toString().padStart(2, '0'); const day = d.getDate().toString().padStart(2, '0'); if (year > 1900 && year < 2100) { return `${year}-${month}-${day}`; } } } catch (e) {}
  return null;
};
const getTodayDateString = () => { const today = new Date(); const year = today.getFullYear(); const month = (today.getMonth() + 1).toString().padStart(2, '0'); const day = today.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; };

const metallicColors = {
    green: 'rgba(25, 135, 84, 0.9)', red: 'rgba(220, 53, 69, 0.9)',
    blue: 'rgba(13, 110, 253, 0.8)', teal: 'rgba(32, 201, 151, 0.8)',
    orange: 'rgba(253, 126, 20, 0.8)', yellow: 'rgba(255, 193, 7, 0.8)',
    comment_bg_dark: 'rgba(255, 224, 130, 0.2)', comment_text_dark: '#FFC107',
    comment_bg_light: 'rgba(255, 243, 205, 0.7)', comment_text_light: '#856404',
    filter_active_bg_dark: 'rgba(25, 135, 84, 0.2)', filter_active_text_dark: '#A3E9A4',
    filter_active_bg_light: 'rgba(200, 247, 217, 0.7)', filter_active_text_light: '#0A4F15',
    green_text_dark: '#28A745', green_text_light: '#28A745',
    red_text_dark: '#DC3545', red_text_light: '#DC3545',
};

const getStatusCellStyle = (statusValue, darkMode, textClassGlobal) => {
    const lowerStatus = statusValue?.toLowerCase();
    if (lowerStatus === 'cumple' || lowerStatus === 'ganancia') { return { color: darkMode ? metallicColors.green_text_light : metallicColors.green_text_dark, backgroundColor: darkMode ? 'rgba(40, 167, 69, 0.2)' : 'rgba(200, 247, 217, 0.6)', fontWeight: 'bold' }; }
    if (lowerStatus === 'no cumple' || lowerStatus === 'perdida') { return { color: darkMode ? metallicColors.red_text_light : metallicColors.red_text_dark, backgroundColor: darkMode ? 'rgba(220, 53, 69, 0.2)' : 'rgba(253, 206, 211, 0.6)', fontWeight: 'bold' }; }
    return {color: textClassGlobal};
};
const isTimeBeforeThreshold = (baseTimeStr, checkTimeStr, hoursOffset = 3) => {
    if (!baseTimeStr || !checkTimeStr) return false;
    try {
        const [baseH, baseM] = baseTimeStr.split(':').map(Number); const [checkH, checkM] = checkTimeStr.split(':').map(Number);
        const baseTotalMinutes = baseH * 60 + baseM; const checkTotalMinutes = checkH * 60 + checkM;
        const thresholdMinutes = baseTotalMinutes + hoursOffset * 60;
        return checkTotalMinutes < thresholdMinutes;
    } catch (e) { return false; }
};

function SupervisionIngreso({ setIsAuthenticated, darkMode }) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [rawData, setRawData] = useState([]);
  const [processedAndFilteredData, setProcessedAndFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ fundo: '', jefe_campo: '', lote: '', labor: '', encargado: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'hora', direction: 'ascending' });
  const [showDataLabels, setShowDataLabels] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const textClassGlobal = darkMode ? 'rgb(230, 230, 230)' : 'rgb(40, 40, 40)';
  const gridColorGlobal = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
  const cardBgGlobal = darkMode ? '#212529' : '#f8f9fa';
  const cardClass = `card shadow-sm mb-4 ${darkMode ? 'bg-dark border-secondary text-light' : 'bg-light'}`;
  const inputBgClass = (isActiveFilter = false) => `${darkMode ? 'form-control form-control-sm bg-dark text-white border-secondary' : 'form-control form-control-sm bg-light text-dark'} ${isActiveFilter ? (darkMode ? 'filter-active-dark' : 'filter-active-light') : ''}`;
  const tableClass = `table table-sm table-striped table-hover ${darkMode ? 'table-dark' : ''}`;
  const buttonSecondaryClass = `btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-secondary'}`;

  useEffect(() => { /* Fetch Data */
    const fetchDataForDate = async (fecha) => { if (!fecha) return; setLoading(true); setError(null); try { const token = localStorage.getItem('token'); const headers = { 'Content-Type': 'application/json' }; if (token) headers['Authorization'] = `Bearer ${token}`; const response = await fetch(`${apiBaseUrl}/resumen/parte-diario/por-fecha?fecha=${fecha}`, { headers }); if (!response.ok) { if ((response.status === 401 || response.status === 403) && setIsAuthenticated) setIsAuthenticated(false); const errorData = await response.json().catch(() => ({ message: response.statusText })); throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);} const data = await response.json(); if (data && Array.isArray(data)) { setRawData(data.map(item => ({...item, fecha_norm: normalizeDate(item.fecha)}))); } else { setRawData([]); setError("No se encontraron datos o formato incorrecto."); } } catch (err) { setError(err.message); setRawData([]); } finally { setLoading(false); } };
    if (typeof setIsAuthenticated === 'function') { const initialTokenCheck = () => { if (!localStorage.getItem('token')) setIsAuthenticated(false); }; initialTokenCheck(); fetchDataForDate(selectedDate); } else { setLoading(false); setError("Error de autenticación no configurado."); }
  }, [apiBaseUrl, selectedDate, setIsAuthenticated]);

  useEffect(() => { /* Process and Filter Data */
    let processed = rawData.map(item => { const min = parseFloat(item.min) || 0; const minHrCalculado = (min * 0.7) / 8; const horasAvance1 = parseFloat(item.horas_avance1) || 0; const avance1 = parseFloat(item.avance1) || 0; const prodHoraAvance = horasAvance1 > 0 ? avance1 / horasAvance1 : 0; const estadoAvance1 = prodHoraAvance >= minHrCalculado ? "CUMPLE" : "NO CUMPLE"; const horaAvance1EsTemprano = isTimeBeforeThreshold(item.hora, item.hora_avance1, 3); return { ...item, minHrCalculado, prodHoraAvance, estadoAvance1, horaAvance1EsTemprano }; });
    
    // Aplicar filtros en cascada al momento de mostrar/procesar
    if (filters.fundo) processed = processed.filter(item => item.fundo === filters.fundo);
    if (filters.jefe_campo) processed = processed.filter(item => item.jefe_campo === filters.jefe_campo);
    if (filters.lote) processed = processed.filter(item => item.lote === filters.lote);
    if (filters.labor) processed = processed.filter(item => item.labor?.toString() === filters.labor); 
    if (filters.encargado) processed = processed.filter(item => item.encargado === filters.encargado);
    
    if (sortConfig.key) { processed.sort((a, b) => { let valA = a[sortConfig.key]; let valB = b[sortConfig.key]; const numA = parseFloat(valA); const numB = parseFloat(valB); if (!isNaN(numA) && !isNaN(numB)) { valA = numA; valB = numB; } else { valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase(); } if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; }); }
    setProcessedAndFilteredData(processed);
  }, [rawData, filters, sortConfig]);

  const handleSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
  const getSortIndicator = (key) => { if (sortConfig.key === key) { return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up ms-1"></i> : <i className="bi bi-sort-down ms-1"></i>; } return <i className="bi bi-arrow-down-up ms-1 opacity-25"></i>; };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, [name]: value };

      if (name === 'fundo') {
        newFilters.jefe_campo = '';
        newFilters.lote = '';
        newFilters.labor = '';
        newFilters.encargado = '';
      } else if (name === 'jefe_campo') {
        newFilters.lote = '';
        newFilters.labor = '';
        newFilters.encargado = '';
      } else if (name === 'lote') {
        newFilters.labor = '';
        newFilters.encargado = '';
      } else if (name === 'labor') {
        newFilters.encargado = '';
      }
      return newFilters;
    });
  };
  
  const getFilteredDataForNextLevel = (currentData, currentFilters) => {
    let data = [...currentData];
    if (currentFilters.fundo) {
        data = data.filter(item => item.fundo === currentFilters.fundo);
    }
    if (currentFilters.jefe_campo) {
        data = data.filter(item => item.jefe_campo === currentFilters.jefe_campo);
    }
    if (currentFilters.lote) {
        data = data.filter(item => item.lote === currentFilters.lote);
    }
    if (currentFilters.labor) {
        data = data.filter(item => item.labor?.toString() === currentFilters.labor);
    }
    return data;
  };

  const uniqueFundos = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, {});
    return [...new Set(data.map(item => item.fundo).filter(Boolean))].sort();
  }, [rawData]);

  const uniqueJefesCampo = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fundo: filters.fundo });
    return [...new Set(data.map(item => item.jefe_campo).filter(Boolean))].sort();
  }, [rawData, filters.fundo]);

  const uniqueLotes = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fundo: filters.fundo, jefe_campo: filters.jefe_campo });
    return [...new Set(data.map(item => item.lote).filter(Boolean))].sort();
  }, [rawData, filters.fundo, filters.jefe_campo]);

  const uniqueLabores = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fundo: filters.fundo, jefe_campo: filters.jefe_campo, lote: filters.lote });
    const map = new Map();
    data.forEach(item => {
        if (item.labor !== null && typeof item.labor !== 'undefined' && item.descripcion_labor) {
            map.set(item.labor.toString(), item.descripcion_labor);
        }
    });
    return Array.from(map.entries())
                 .map(([codigoLabor, desc]) => ({ cod: codigoLabor, desc }))
                 .sort((a, b) => a.desc.localeCompare(b.desc));
  }, [rawData, filters.fundo, filters.jefe_campo, filters.lote]);

  const uniqueEncargados = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fundo: filters.fundo, jefe_campo: filters.jefe_campo, lote: filters.lote, labor: filters.labor });
    return [...new Set(data.map(item => item.encargado).filter(Boolean))].sort();
  }, [rawData, filters.fundo, filters.jefe_campo, filters.lote, filters.labor]);


  const resumenIngresoPorAsistente = useMemo(() => {
  const resumen = {};
  processedAndFilteredData.forEach(item => {
    if (!item.encargado) return;

    if (!resumen[item.encargado]) {
      resumen[item.encargado] = {
        registros: 0,
        primeraHoraAvance1: null,
        earliestShiftStart: item.hora,
        trabajadoresConAvance: new Set(),
        trabajadoresConHoras: new Set(),
        trabajadoresConProductividad: new Set(),
        totalAvance1: 0,
        laborDescripcion: item.descripcion_labor || 'N/A',
        celular: item.celular || 'N/A', // Nuevo campo
      };
    }

    resumen[item.encargado].registros++;

    if (item.hora_avance1 && (!resumen[item.encargado].primeraHoraAvance1 || item.hora_avance1 < resumen[item.encargado].primeraHoraAvance1)) {
      resumen[item.encargado].primeraHoraAvance1 = item.hora_avance1;
    }

    if (item.hora < resumen[item.encargado].earliestShiftStart) {
      resumen[item.encargado].earliestShiftStart = item.hora;
    }

    if ((parseFloat(item.avance1) || 0) > 0) {
      resumen[item.encargado].trabajadoresConAvance.add(item.dni);
      resumen[item.encargado].totalAvance1 += parseFloat(item.avance1) || 0;
    }

    if ((parseFloat(item.horas_trabajadas) || 0) > 0) {
      resumen[item.encargado].trabajadoresConHoras.add(item.dni);
    }

    if ((parseFloat(item.productividad) || 0) > 0) {
      resumen[item.encargado].trabajadoresConProductividad.add(item.dni);
    }
  });

  return Object.entries(resumen).map(([encargado, data]) => ({
    encargado,
    registros: data.registros,
    laborDescripcion: data.laborDescripcion,
    horaAvance1: data.primeraHoraAvance1 || 'N/A',
    horaAvance1EsTemprano: data.primeraHoraAvance1
      ? isTimeBeforeThreshold(data.earliestShiftStart, data.primeraHoraAvance1, 3)
      : false,
    trabajadoresConAvance: data.trabajadoresConAvance.size,
    trabajadoresConHoras: data.trabajadoresConHoras.size,
    trabajadoresConProductividad: data.trabajadoresConProductividad.size,
    avancePromedioPorTrabajador: data.trabajadoresConAvance.size > 0
      ? data.totalAvance1 / data.trabajadoresConAvance.size
      : 0,
    totalAvance1: data.totalAvance1,
    celular: data.celular, // Nuevo campo
  })).sort((a, b) => b.registros - a.registros);
}, [processedAndFilteredData]);

  const asistenteStatsChartData = useMemo(() => {
    const dataByAsistente = {};
    processedAndFilteredData.forEach(item => {
        if (!item.encargado) return;
        if (!dataByAsistente[item.encargado]) {
            dataByAsistente[item.encargado] = { totalTrabajadores: new Set(), conAvance1: new Set(), conProductividad: new Set() };
        }
        dataByAsistente[item.encargado].totalTrabajadores.add(item.dni);
        if ((parseFloat(item.avance1) || 0) > 0) dataByAsistente[item.encargado].conAvance1.add(item.dni);
        if (parseFloat(item.productividad) > 0) dataByAsistente[item.encargado].conProductividad.add(item.dni);
    });

    const sortedAsistenteNames = Object.keys(dataByAsistente).sort();
    const labels = sortedAsistenteNames.map(name => name.split(" ")[0]);

    const totalTrabajadoresData = sortedAsistenteNames.map(name => dataByAsistente[name].totalTrabajadores.size);
    const conAvance1Data = sortedAsistenteNames.map(name => dataByAsistente[name].conAvance1.size);
    const conProductividadData = sortedAsistenteNames.map(name => dataByAsistente[name].conProductividad.size);

    return {
        labels,
        datasets: [
            { label: 'Total Trabajadores', data: totalTrabajadoresData, backgroundColor: metallicColors.blue },
            { label: 'Con Avance1', data: conAvance1Data, backgroundColor: metallicColors.teal },
            { label: 'Con Productividad', data: conProductividadData, backgroundColor: metallicColors.orange },
        ]
    };
  }, [processedAndFilteredData]);

  const resumenDiaSeleccionado = useMemo(() => ({
    totalRegistros: processedAndFilteredData.length,
    asistentesActivos: uniqueEncargados.filter(e => processedAndFilteredData.some(fd => fd.encargado === e)).length,
    laboresRegistradas: uniqueLabores.filter(l => processedAndFilteredData.some(fd => fd.labor?.toString() === l.cod)).length,
    totalAvanceGeneral: sumFloats(processedAndFilteredData, 'avance1'),
    totalHorasTrabajadasGeneral: sumFloats(processedAndFilteredData, 'horas_trabajadas'),
  }), [processedAndFilteredData, uniqueEncargados, uniqueLabores]);
  
  const commonChartOptions = (titleText, yAxisLabel = '', customOpts = {}) => ({ 
    responsive: true, maintainAspectRatio:false, 
    plugins: { 
        legend: { display: customOpts.showLegend !== undefined ? customOpts.showLegend : true, position: customOpts.legendPosition || 'top', labels:{color:textClassGlobal, boxWidth:10, padding:8, font:{size:9} } }, 
        title: { display: true, text: titleText, color:textClassGlobal, font:{size:11, weight:'bold'} }, 
        datalabels: { display: showDataLabels, anchor:'end', align:'top', color:textClassGlobal, font:{weight:'bold', size:9}, formatter:(value)=> Math.round(value) } 
    }, 
    scales: { 
        x:{ ticks:{color:textClassGlobal, font:{size:9}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal}, ...customOpts.xScale }, 
        y:{ ticks:{color:textClassGlobal, font:{size:9}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal}, title: {display: !!yAxisLabel, text:yAxisLabel, color:textClassGlobal, font:{size:9}}, ...customOpts.yScale } 
    }, ...customOpts.nativeOptions
  });
  const groupedBarOptions = (title, yAxisLabel) => commonChartOptions(title, yAxisLabel, { nativeOptions: { scales: { x: { stacked: false }, y: { stacked: false } } } });


  if (loading) return <div className="container-fluid text-center py-5"><div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (error && rawData.length === 0) return <div className={`container-fluid alert alert-info mt-4 ${darkMode ? 'text-white bg-info-subtle border-info-subtle' : ''}`} role="alert"><i className="bi bi-info-circle-fill me-2"></i>{error} para la fecha {selectedDate}. Intente con otra fecha.</div>;

  return (
    <div className="container-fluid py-3">
      <style jsx global>{`
        .tabla-supervision th {
          cursor: pointer;
          white-space: normal !important; /* Permitir el ajuste de texto */
          word-break: break-word !important; /* Asegurar que las palabras largas se rompan */
          vertical-align: middle;
          text-align: center;
          position: sticky;
          top: 0;
          z-index: 1;
          background-color: ${cardBgGlobal};
          border: 1px solid ${gridColorGlobal};
          font-size: 0.75rem !important; /* Aumentar ligeramente el tamaño de la fuente para mejor legibilidad */
          padding: 0.2rem 0.15rem !important; /* Ajustar el relleno */
          line-height: 1.2; /* Altura de línea más ajustada para dos líneas */
          /* max-height: 3rem;  ELIMINADO: Esta propiedad estaba forzando el texto a una letra por línea */
          /* overflow: hidden; ELIMINADO: Esta propiedad ocultaría el texto que se desborda */
        }
        .tabla-supervision th.subheader-main {
          font-size: 0.8rem !important; /* Ligeramente más grande para los subencabezados principales */
          font-weight: bold;
          background-color: ${darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'} !important;
        }
        .tabla-supervision td {
          font-size: 0.7rem !important; /* Ajustar para consistencia */
          padding: 0.2rem 0.2rem !important; /* Ajustar el relleno */
          white-space: nowrap; /* Mantener el contenido de la celda en una línea a menos que se ajuste explícitamente */
          border: 1px solid ${gridColorGlobal};
          vertical-align: middle;
        }
        /* Clase específica para los encabezados de la tabla de resumen donde el texto se "chanca" */
        .tabla-supervision .th-wrap-auto {
            min-width: 50px; /* Asegura un ancho mínimo para que el texto pueda ajustarse */
            word-wrap: break-word; /* Otra propiedad para asegurar el ajuste de palabras */
            white-space: normal !important; /* Override any nowrap from td */
        }

        .tabla-supervision .text-numeric { text-align: center; }
        .tabla-supervision .hora-temprana { color: ${metallicColors.red} !important; background-color: ${darkMode ? 'rgba(220,53,69,0.15)' : 'rgba(255,200,200,0.4)'} !important; font-weight: bold; }
        .tabla-supervision .comentario-highlight { background-color: ${darkMode ? metallicColors.comment_bg_dark : metallicColors.comment_bg_light}; color: ${darkMode ? metallicColors.comment_text_dark : metallicColors.comment_text_light}; font-weight: bold; }
        .filter-active-dark { background-color: ${metallicColors.filter_active_bg_dark} !important; color: ${metallicColors.filter_active_text_dark} !important; border-color: ${metallicColors.green} !important;}
        .filter-active-light { background-color: ${metallicColors.filter_active_bg_light} !important; color: ${metallicColors.filter_active_text_light} !important; border-color: ${metallicColors.green} !important;}
      `}</style>
      
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h1 className={`${textClassGlobal} h3`}>Supervisión de Ingreso de Partes</h1>
        <div className="d-flex align-items-center mt-2 mt-md-0">
          <label htmlFor="selectedDateMonitor" className="form-label form-label-sm me-2 mb-0">Fecha de Supervisión:</label>
          <input type="date" id="selectedDateMonitor" name="selectedDate" className={inputBgClass()} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{maxWidth:'180px'}}/>
        </div>
      </div>

      <div className={cardClass}> <div className="card-body"> <h5 className="card-title mb-3">Filtros para Detalle</h5>
          <div className="row g-2">
            {/* Fundo */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Fundo:</label> <select name="fundo" className={inputBgClass(!!filters.fundo)} value={filters.fundo} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueFundos.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
            {/* Jefe de Campo (depende de Fundo) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Jefe de Campo:</label> <select name="jefe_campo" className={inputBgClass(!!filters.jefe_campo)} value={filters.jefe_campo} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueJefesCampo.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
            {/* Lote (depende de Fundo y Jefe de Campo) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Lote:</label> <select name="lote" className={inputBgClass(!!filters.lote)} value={filters.lote} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueLotes.map(l => <option key={l} value={l}>{l}</option>)} </select> </div>
            {/* Labor (depende de Fundo, Jefe de Campo y Lote) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Labor:</label> <select name="labor" className={inputBgClass(!!filters.labor)} value={filters.labor} onChange={handleFilterChange}> <option value="">Todas</option> {uniqueLabores.map(l => <option key={l.cod} value={l.cod}>{l.desc} ({l.cod})</option>)} </select> </div>
            {/* Asistente (depende de Fundo, Jefe de Campo, Lote y Labor) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Asistente:</label> <select name="encargado" className={inputBgClass(!!filters.encargado)} value={filters.encargado} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueEncargados.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
          </div>
      </div></div>

      <div className="row mb-4">
        {/* Primera tabla ocupa toda la fila */}
        <div className="col-12 mb-3">
          <div className={cardClass}>
            <div className="card-header">
              <h6 className="mb-0">Vistazo General por Asistente (Fecha: {selectedDate})</h6>
            </div>
            <div className="card-body table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className={`${tableClass} tabla-supervision`}>
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Asistente</th>
                    <th style={{ width: '15%' }}>Celular</th> {/* Nuevo encabezado */}
                    <th style={{ width: '20%' }}>Labor</th>
                    <th className="text-numeric" style={{ width: '10%' }}>Regs.</th>
                    <th style={{ width: '10%' }}>1ra Hr. Avc</th>
                    <th className="text-numeric" style={{ width: '10%' }}>Trab. Avc</th>
                    <th className="text-numeric" style={{ width: '10%' }}>Trab. Hrs</th>
                    <th className="text-numeric" style={{ width: '10%' }}>Trab. Prod</th>
                    <th className="text-numeric" style={{ width: '15%' }}>Avc Prom</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenIngresoPorAsistente.map(r => (
                    <tr key={r.encargado}>
                      <td>{r.encargado}</td>
                      <td>{r.celular || 'N/A'}</td> {/* Nuevo campo */}
                      <td>{r.laborDescripcion || 'N/A'}</td>
                      <td className="text-numeric">{r.registros}</td>
                      <td className={r.horaAvance1EsTemprano ? 'hora-temprana' : ''}>{r.horaAvance1}</td>
                      <td className="text-numeric">{r.trabajadoresConAvance}</td>
                      <td className="text-numeric">{r.trabajadoresConHoras}</td>
                      <td className="text-numeric">{r.trabajadoresConProductividad}</td>
                      <td className="text-numeric">{r.avancePromedioPorTrabajador.toFixed(1)}</td>
                    </tr>
                  ))}
                  {resumenIngresoPorAsistente.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center fst-italic">Sin registros de asistentes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gráfico y Resumen del Día en una fila */}
        <div className="row">
          <div className="col-lg-9 col-md-12 mb-3">
            <div className={`${cardClass} h-100`}>
              <div className="card-body">
                <h6 className="card-title" style={{ fontSize: '0.85rem' }}>Actividad por Asistente</h6>
                <div style={{ height: '260px' }}>
                  {asistenteStatsChartData.labels && asistenteStatsChartData.labels.length > 0 ? (
                    <Bar
                      data={asistenteStatsChartData}
                      options={groupedBarOptions('Actividad por Asistente', 'Cantidad')}
                    />
                  ) : (
                    <p className="text-center fst-italic my-auto">No hay datos para el gráfico.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-12">
            <div className={`${cardClass} h-100`}>
              <div className="card-body">
                <h6 className="card-title" style={{ fontSize: '0.85rem' }}>Resumen del Día ({selectedDate})</h6>
                <ul className="list-unstyled mb-0" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                  <li><strong>Registros:</strong> {resumenDiaSeleccionado.totalRegistros}</li>
                  <li><strong>Activos:</strong> {resumenDiaSeleccionado.asistentesActivos}</li>
                  <li><strong>Labores:</strong> {resumenDiaSeleccionado.laboresRegistradas}</li>
                  <li><strong>Avance:</strong> {resumenDiaSeleccionado.totalAvanceGeneral.toFixed(0)}</li>
                  <li><strong>Horas:</strong> {resumenDiaSeleccionado.totalHorasTrabajadasGeneral.toFixed(2)}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      <div className={`${cardClass} mb-4`}>
        <div className="card-header"><h5 className="card-title mb-0">Detalle de Ingresos (Fecha: {selectedDate})</h5></div>
        <div className="card-body table-responsive" style={{maxHeight: '600px', overflowY:'auto'}}>
          <table className={`${tableClass} tabla-supervision`}>
            <thead>
              <tr>
                <th rowSpan="2" onClick={() => handleSort('fecha_norm')} title="Fecha">Fecha {getSortIndicator('fecha_norm')}</th>
                <th rowSpan="2" onClick={() => handleSort('hora')} title="Hora Registro">Hora Reg. {getSortIndicator('hora')}</th>
                <th rowSpan="2" onClick={() => handleSort('encargado')} title="Asistente">Asistente {getSortIndicator('encargado')}</th>
                <th rowSpan="2" onClick={() => handleSort('dni')} title="DNI">DNI {getSortIndicator('dni')}</th>
                <th rowSpan="2" onClick={() => handleSort('trabajador')} title="Trabajador">Trabajador {getSortIndicator('trabajador')}</th>
                <th rowSpan="2" onClick={() => handleSort('lote')} title="Lote">Lote {getSortIndicator('lote')}</th>
                <th colSpan="4" className="text-center subheader-main">PARÁMETROS / OBJETIVOS</th>
                <th colSpan="5" className="text-center subheader-main">SEGUIMIENTO AVANCE 1</th>
                <th colSpan="4" className="text-center subheader-main">PRODUCTIVIDAD GENERAL (REAL)</th>
                <th colSpan="3" className="text-center subheader-main">PROYECCIONES CLAVE</th>
                <th rowSpan="2" onClick={() => handleSort('comentario')} title="Comentario">Comentario {getSortIndicator('comentario')}</th>
              </tr>
              <tr>
                <th className="th-wrap-auto" onClick={() => handleSort('min')} title="Mínimo Objetivo Diario">Min. Obj. {getSortIndicator('min')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('max')} title="Máximo Objetivo Diario">Max. Obj. {getSortIndicator('max')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('precio')} title="Precio (si aplica)">Precio {getSortIndicator('precio')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('minHrCalculado')} title="Min Prod/Hora Calculado ((Min*0.7)/8)">Min/Hr Calc. {getSortIndicator('minHrCalculado')}</th>
                
                <th className="th-wrap-auto" onClick={() => handleSort('avance1')} title="Avance 1 (Unidades)">Avance 1 {getSortIndicator('avance1')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('horas_avance1')} title="Horas para Avance 1">Hrs. Avc. 1 {getSortIndicator('horas_avance1')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('hora_avance1')} title="Hora de registro Avance 1">Hora Avc. 1 {getSortIndicator('hora_avance1')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('prodHoraAvance')} title="Productividad por Hora (Avance1 / Hrs.Avc1)">Prod/Hr Avc. {getSortIndicator('prodHoraAvance')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('estadoAvance1')} title="Estado de Avance 1 (vs Min/Hr Calc.)">Estado Avc. {getSortIndicator('estadoAvance1')}</th>
                
                <th className="th-wrap-auto" onClick={() => handleSort('horas_trabajadas')} title="Horas Trabajadas Totales">Hrs. Total {getSortIndicator('horas_trabajadas')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('productividad')} title="Productividad Total Registrada">Prod. Total {getSortIndicator('productividad')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('produc_real_xhora')} title="Productividad Real por Hora General">Prod/Hr Real {getSortIndicator('produc_real_xhora')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('productividad_ganancia')} title="Estado Productividad General">Est. Prod. {getSortIndicator('productividad_ganancia')}</th>
                
                <th className="th-wrap-auto" onClick={() => handleSort('proyeccion_x_hora_prom')} title="Productividad/Hora Promedio Proyectada">P/Hr Prom. Proy. {getSortIndicator('proyeccion_x_hora_prom')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('proy_term_avance1')} title="Avance Término del Día Proyectado">Avc. Proy. Fin Día {getSortIndicator('proy_term_avance1')}</th>
                <th className="th-wrap-auto" onClick={() => handleSort('proyeccion_final')} title="Estado Final Proyectado">Est. Final Proy. {getSortIndicator('proyeccion_final')}</th>
              </tr>
            </thead>
            <tbody>
              {processedAndFilteredData.map((item, index) => (
                <tr key={item.parte_diario ? `${item.parte_diario}-${item.dni}-${index}` : `${item.id || index}-${item.dni}-${item.labor}-${item.lote}`}>
                  <td>{item.fecha_norm}</td><td>{item.hora}</td><td>{item.encargado}</td><td>{item.dni}</td><td>{item.trabajador}</td><td>{item.lote}</td>
                  <td className="text-numeric">{item.min}</td><td className="text-numeric">{item.max}</td><td className="text-numeric">{item.precio !== null ? item.precio : '-'}</td><td className="text-numeric">{item.minHrCalculado.toFixed(2)}</td>
                  <td className="text-numeric">{parseFloat(item.avance1) || 0}</td><td className="text-numeric">{(parseFloat(item.horas_avance1) || 0).toFixed(2)}</td><td className={item.horaAvance1EsTemprano ? 'hora-temprana text-numeric' : 'text-numeric'}>{item.hora_avance1}</td><td className="text-numeric">{item.prodHoraAvance.toFixed(2)}</td><td style={getStatusCellStyle(item.estadoAvance1, darkMode, textClassGlobal)}>{item.estadoAvance1}</td>
                  <td className="text-numeric">{(parseFloat(item.horas_trabajadas)||0).toFixed(2)}</td><td className="text-numeric">{item.productividad}</td><td className="text-numeric">{(parseFloat(item.produc_real_xhora)||0).toFixed(2)}</td><td style={getStatusCellStyle(item.productividad_ganancia, darkMode, textClassGlobal)}>{item.productividad_ganancia}</td>
                  <td className="text-numeric">{(parseFloat(item.proyeccion_x_hora_prom)||0).toFixed(2)}</td><td className="text-numeric">{(parseFloat(item.proy_term_avance1)||0).toFixed(2)}</td><td style={getStatusCellStyle(item.proyeccion_final, darkMode, textClassGlobal)}>{item.proyeccion_final}</td>
                  <td style={item.comentario ? {backgroundColor: darkMode ? metallicColors.comment_bg_dark : metallicColors.comment_bg_light, color: darkMode ? metallicColors.comment_text_dark : metallicColors.comment_text_light, fontWeight:'bold'} : {}}>{item.comentario}</td>
                </tr>
              ))}
              {processedAndFilteredData.length === 0 && ( <tr><td colSpan="21" className="text-center fst-italic">No hay datos para mostrar con los filtros y fecha actual.</td></tr> )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SupervisionIngreso;