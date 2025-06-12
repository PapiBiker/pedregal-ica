// src/components/Personal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

// --- HELPER FUNCTIONS ---
const sumFloats = (arr, key) => arr.reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0);
const getFirstValueFromFiltered = (arr, targetKey, defaultValue = 0) => {
    return arr.length > 0 ? (parseFloat(arr[0][targetKey]) || defaultValue) : defaultValue;
};
const formatSoles = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) { return '0.00'; }
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStatusCellStyle = (statusValue, darkMode, textClassGlobal) => {
    const lowerStatus = statusValue?.toLowerCase();
    if (lowerStatus === 'cumple') { return { color: darkMode ? '#A6FFB3' : '#0A4F15', backgroundColor: darkMode ? 'rgba(75, 231, 182, 0.1)' : 'rgba(200, 247, 217, 0.5)', fontWeight: 'bold' }; }
    if (lowerStatus === 'no cumple') { return { color: darkMode ? '#FFB3B3' : '#7D1A1A', backgroundColor: darkMode ? 'rgba(255, 160, 160, 0.1)' : 'rgba(253, 206, 211, 0.5)', fontWeight: 'bold' }; }
    return {color: textClassGlobal};
};
const normalizeDate = (dateString) => {
  if (!dateString) return null; const sDate = String(dateString).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) { const parts = sDate.split('-'); const year = parseInt(parts[0],10); const month = parseInt(parts[1],10); const day = parseInt(parts[2],10); if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >=1 && day <=31) { return sDate; } }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sDate)) { const parts = sDate.split('/'); const day = parts[0].padStart(2, '0'); const month = parts[1].padStart(2, '0'); const year = parts[2]; const yearN = parseInt(year,10); const monthN = parseInt(month,10); const dayN = parseInt(day,10); if (yearN > 1900 && yearN < 2100 && monthN >= 1 && monthN <= 12 && dayN >=1 && dayN <=31) { return `${year}-${month}-${day}`; } }
  try { const d = new Date(sDate); if (d instanceof Date && !isNaN(d.valueOf())) { const year = d.getFullYear(); const month = (d.getMonth() + 1).toString().padStart(2, '0'); const day = d.getDate().toString().padStart(2, '0'); if (year > 1900 && year < 2100) { return `${year}-${month}-${day}`; } } } catch (e) {}
  return null;
};
const formatDateForAxis = (dateString_YYYY_MM_DD) => {
    if (!dateString_YYYY_MM_DD || !normalizeDate(dateString_YYYY_MM_DD)) return dateString_YYYY_MM_DD || '';
    const dateParts = dateString_YYYY_MM_DD.split('-'); const date = new Date(Date.UTC(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])));
    const options = { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Lima' }; let formatted = new Intl.DateTimeFormat('es-PE', options).format(date);
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(/\./g, '').replace(',', ''); return formatted;
};
const metallicColors = {
    green: 'rgba(25, 135, 84, 0.9)', red: 'rgba(220, 53, 69, 0.9)',
    green_bg: 'rgba(25, 135, 84, 0.15)', red_bg: 'rgba(220, 53, 69, 0.15)',
    green_text_dark: '#198754', red_text_dark: '#DC3545',
    green_text_light: '#A3E9A4', red_text_light: '#FFB3B3',
    blue: 'rgba(13, 110, 253, 0.8)', teal: 'rgba(32, 201, 151, 0.8)',
    highlight_bg_dark: 'rgba(13, 110, 253, 0.2)', highlight_bg_light: 'rgba(13, 110, 253, 0.1)',
    yellow: 'rgba(255, 193, 7, 0.8)', orange: 'rgba(253, 126, 20, 0.8)', purple: 'rgba(111, 66, 193, 0.8)'
};

function Personal({ setIsAuthenticated, darkMode }) {
  const [rawData, setRawData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [filteredAndSortedData, setFilteredAndSortedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError, ] = useState(null);
  const [filters, setFilters] = useState({
    fecha: getTodayDate(), 
    jefe_campo: '',
    lote: '',
    labor: '', // CAMBIO: Usaremos 'labor' como clave de filtro para el código de labor
    encargado: '',
    estadoCalculado: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_norm', direction: 'descending' });
  const [sortConfigAsistente, setSortConfigAsistente] = useState({ key: 'encargado', direction: 'ascending'});
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showDataLabels, setShowDataLabels] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const textClassGlobal = darkMode ? 'rgb(230, 230, 230)' : 'rgb(40, 40, 40)';
  const gridColorGlobal = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
  const cardBgGlobal = darkMode ? '#212529' : '#f8f9fa';
  const cardClass = `card shadow-sm mb-4 ${darkMode ? 'bg-dark border-secondary text-light' : 'bg-light'}`;
  const inputBgClass = darkMode ? 'form-control form-control-sm bg-dark text-white border-secondary' : 'form-control form-control-sm bg-light text-dark';
  const tableClass = `table table-sm table-striped table-hover ${darkMode ? 'table-dark' : ''}`;
  const buttonSecondaryClass = `btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-secondary'}`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `${apiBaseUrl}/resumen/parte-diario/por-fecha?fecha=${filters.fecha}`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && setIsAuthenticated) {
            setIsAuthenticated(false);
          }
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data)) {
          setRawData(data.map(item => ({
            ...item,
            fecha_norm: normalizeDate(item.fecha),
          })));
        } else {
          setRawData([]);
          setError("Los datos recibidos no son un array o están vacíos.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl, filters.fecha, setIsAuthenticated]);

  useEffect(() => {
    const dataWithCalculations = rawData.map(item => {
      const horasAvance1 = parseFloat(item.horas_avance1) || 0; const avance1 = parseFloat(item.avance1) || 0;
      const prodHoraEjec = horasAvance1 > 0 ? avance1 / horasAvance1 : 0;
      const prodHoraProy = parseFloat(item.proyeccion_x_hora_prom) || 0;
      const estadoCalculado = prodHoraEjec >= prodHoraProy ? "CUMPLE" : "NO CUMPLE";
      return { ...item, prodHoraEjec, estadoCalculado };
    });
    setProcessedData(dataWithCalculations);
  }, [rawData]);

  useEffect(() => {
    let dataToFilterAndSort = [...processedData];
    // El filtro de fecha ya se aplica en la llamada a la API, pero lo mantenemos por si rawData cambia.
    if (filters.fecha) { dataToFilterAndSort = dataToFilterAndSort.filter(item => item.fecha_norm === filters.fecha); }
    if (filters.jefe_campo) { dataToFilterAndSort = dataToFilterAndSort.filter(item => item.jefe_campo === filters.jefe_campo); }
    if (filters.lote) { dataToFilterAndSort = dataToFilterAndSort.filter(item => item.lote === filters.lote); }
    // CAMBIO: Ahora filtra por `item.labor` (el código numérico de la labor)
    if (filters.labor) { dataToFilterAndSort = dataToFilterAndSort.filter(item => item.labor?.toString() === filters.labor); }
    if (filters.encargado) { dataToFilterAndSort = dataToFilterAndSort.filter(item => item.encargado === filters.encargado); }
    if (filters.estadoCalculado) { dataToFilterAndSort = dataToFilterAndSort.filter(item => item.estadoCalculado === filters.estadoCalculado); }
    
    if (sortConfig.key) {
      dataToFilterAndSort.sort((a, b) => {
        let valA = a[sortConfig.key]; let valB = b[sortConfig.key]; const numA = parseFloat(valA); const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) { valA = numA; valB = numB; } else { valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase(); }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1; return 0;
      });
    }
    setFilteredAndSortedData(dataToFilterAndSort);
  }, [processedData, filters, sortConfig]);

  const handleSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
  const getSortIndicator = (key) => { if (sortConfig.key === key) { return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up ms-1"></i> : <i className="bi bi-sort-down ms-1"></i>; } return <i className="bi bi-arrow-down-up ms-1 opacity-25"></i>; };
  const handleSortAsistente = (key) => { let direction = 'ascending'; if (sortConfigAsistente.key === key && sortConfigAsistente.direction === 'ascending') { direction = 'descending'; } setSortConfigAsistente({ key, direction }); };
  const getSortIndicatorAsistente = (key) => { if (sortConfigAsistente.key === key) { return sortConfigAsistente.direction === 'ascending' ? <i className="bi bi-sort-up ms-1"></i> : <i className="bi bi-sort-down ms-1"></i>; } return <i className="bi bi-arrow-down-up ms-1 opacity-25"></i>; };
  
  // CAMBIO: handleFilterChange ahora maneja el reseteo de filtros descendentes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, [name]: value };

      // Reseteo de filtros descendentes
      if (name === 'fecha') { // Si cambia la fecha, se resetean todos los filtros subsiguientes
        newFilters.jefe_campo = '';
        newFilters.lote = '';
        newFilters.labor = '';
        newFilters.encargado = '';
        newFilters.estadoCalculado = '';
      } else if (name === 'jefe_campo') {
        newFilters.lote = '';
        newFilters.labor = '';
        newFilters.encargado = '';
      } else if (name === 'lote') {
        newFilters.labor = '';
        newFilters.encargado = '';
      } else if (name === 'labor') { // Si cambia la labor, se resetea el encargado
        newFilters.encargado = '';
      }
      return newFilters;
    });
  };

  // --- Generación de opciones para filtros en cascada ---
  const getFilteredDataForNextLevel = (currentData, currentFilters) => {
    let data = [...currentData];
    if (currentFilters.fecha) { // El filtro de fecha ya se aplica en la API, pero lo incluimos para consistencia.
        data = data.filter(item => item.fecha_norm === currentFilters.fecha);
    }
    if (currentFilters.jefe_campo) {
        data = data.filter(item => item.jefe_campo === currentFilters.jefe_campo);
    }
    if (currentFilters.lote) {
        data = data.filter(item => item.lote === currentFilters.lote);
    }
    if (currentFilters.labor) { // CAMBIO: Usa item.labor para filtrar
        data = data.filter(item => item.labor?.toString() === currentFilters.labor);
    }
    return data;
  };

  // Opciones para Jefe de Campo (depende de rawData y filters.fecha)
  const uniqueJefesCampo = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha });
    return [...new Set(data.map(item => item.jefe_campo).filter(Boolean))].sort();
  }, [rawData, filters.fecha]);

  // Opciones para Lote (depende de rawData, filters.fecha, filters.jefe_campo)
  const uniqueLotes = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha, jefe_campo: filters.jefe_campo });
    return [...new Set(data.map(item => item.lote).filter(Boolean))].sort();
  }, [rawData, filters.fecha, filters.jefe_campo]);
  
  // Opciones para Labor (depende de rawData, filters.fecha, filters.jefe_campo, filters.lote)
  const uniqueLabores = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha, jefe_campo: filters.jefe_campo, lote: filters.lote });
    const laboresMap = new Map();
    data.forEach(item => {
        // Usa item.labor para la clave y item.descripcion_labor para la descripción
        if (item.labor !== null && typeof item.labor !== 'undefined' && item.descripcion_labor) {
            laboresMap.set(item.labor.toString(), item.descripcion_labor);
        }
    });
    // El objeto devuelto tendrá { cod: (string de item.labor), descripcion_labor: item.descripcion_labor }
    return Array.from(laboresMap.entries())
                 .map(([codigoLabor, descLabor]) => ({ cod: codigoLabor, descripcion_labor: descLabor }))
                 .sort((a, b) => a.descripcion_labor.localeCompare(b.descripcion_labor));
  }, [rawData, filters.fecha, filters.jefe_campo, filters.lote]);

  // Opciones para Encargado (depende de rawData, filters.fecha, filters.jefe_campo, filters.lote, filters.labor)
  const uniqueEncargados = useMemo(() => {
    const data = getFilteredDataForNextLevel(rawData, { fecha: filters.fecha, jefe_campo: filters.jefe_campo, lote: filters.lote, labor: filters.labor }); // CAMBIO: Usa filters.labor
    return [...new Set(data.map(item => item.encargado).filter(Boolean))].sort();
  }, [rawData, filters.fecha, filters.jefe_campo, filters.lote, filters.labor]);


  const estadoSummary = useMemo(() => { const summary = { 'CUMPLE': 0, 'NO CUMPLE': 0 }; filteredAndSortedData.forEach(item => { if (item.estadoCalculado === "CUMPLE") summary['CUMPLE']++; else if (item.estadoCalculado === "NO CUMPLE") summary['NO CUMPLE']++; }); return summary; }, [filteredAndSortedData]);
  
  const pieChartEstadoData = useMemo(() => ({ 
    labels: ['Cumple', 'No Cumple'], 
    datasets: [{ 
      data: [estadoSummary['CUMPLE'], estadoSummary['NO CUMPLE']], 
      backgroundColor: [metallicColors.green, metallicColors.red], 
      borderColor: darkMode ? '#212529' : '#fff', 
      borderWidth: 2, 
    }] 
  }), [estadoSummary, darkMode]);

  const stackedBarEstadoPorAsistenteData = useMemo(() => {
    const porAsistente = {};
    filteredAndSortedData.forEach(item => {
        if (!item.encargado) return;
        if (!porAsistente[item.encargado]) {
            porAsistente[item.encargado] = { 'CUMPLE': 0, 'NO CUMPLE': 0 };
        }
        porAsistente[item.encargado][item.estadoCalculado]++;
    });

    const sortedAsistenteNames = Object.keys(porAsistente).sort();
    const labels = sortedAsistenteNames.map(name => name.split(' ')[0]);

    const cumpleData = sortedAsistenteNames.map(asistente => porAsistente[asistente]['CUMPLE']);
    const noCumpleData = sortedAsistenteNames.map(asistente => porAsistente[asistente]['NO CUMPLE']);

    return {
        labels,
        datasets: [
            { label: 'Cumple', data: cumpleData, backgroundColor: metallicColors.green },
            { label: 'No Cumple', data: noCumpleData, backgroundColor: metallicColors.red },
        ]
    };
  }, [filteredAndSortedData]);
  
  const commonChartOptions = (title, yAxisLabel = '', customOptions = {}) => ({
    responsive: true, maintainAspectRatio:false, indexAxis: 'x',
    plugins: {
        legend: { display: customOptions.showLegend !== undefined ? customOptions.showLegend : true, position: customOptions.legendPosition || 'top', labels:{color:textClassGlobal, boxWidth:10, padding:8, font:{size:9} } },
        title: { display: !!title, text: title, color:textClassGlobal, font:{size:11, weight:'bold'} },
        datalabels: { display: showDataLabels, anchor:'end', align:'top', color:textClassGlobal, font:{weight:'bold', size:9}, formatter:(value)=>value }
    },
    scales: { x:{ ticks:{color:textClassGlobal, font:{size:9}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal} }, y:{ ticks:{color:textClassGlobal, font:{size:9}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal}, title: {display: !!yAxisLabel, text:yAxisLabel, color:textClassGlobal, font:{size:9}} } },
    ...customOptions?.nativeOptions
  });
  const pieChartOptions = (titleText) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right', // Move legend to the right
        labels: {
          color: textClassGlobal,
          boxWidth: 10,
          padding: 8,
          font: { size: 9 },
        },
      },
      title: {
        display: !!titleText,
        text: titleText,
        color: textClassGlobal,
        font: { size: 11, weight: 'bold' },
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: textClassGlobal,
        bodyColor: textClassGlobal,
        borderColor: gridColorGlobal,
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
      datalabels: {
        display: true,
        color: (context) => {
          const bgColor = context.dataset.backgroundColor[context.dataIndex];
          if (!bgColor) return 'rgb(240,240,240)';
          const brightness = (bgColor.r * 299 + bgColor.g * 587 + bgColor.b * 114) / 1000;
          return brightness > 125 ? 'rgb(20,20,20)' : 'rgb(240,240,240)';
        },
        font: { weight: 'bold', size: 10 },
        formatter: (value, ctx) => {
          let sum = 0;
          let dataArr = ctx.chart.data.datasets[0].data;
          dataArr.forEach((data) => {
            sum += data;
          });
          let percentage = sum > 0 ? ((value * 100) / sum).toFixed(1) + '%' : '0.0%';
          return `${value} (${percentage})`;
        },
      },
    },
  });
  const stackedBarOptions = (title, yAxisLabel) => ({ ...commonChartOptions(title, yAxisLabel, {legendPosition:'bottom', showLegend:true}), scales: { ...commonChartOptions(title, yAxisLabel).scales, x: {...commonChartOptions(title, yAxisLabel).scales.x, stacked:true, ticks:{...commonChartOptions(title,yAxisLabel).scales.x.ticks, font:{size:8}}}, y: {...commonChartOptions(title, yAxisLabel).scales.y, stacked:true} } });
  
  const resumenPorAsistente = useMemo(() => {
    const porAsistente = {}; filteredAndSortedData.forEach(item => { if (!item.encargado) return; if (!porAsistente[item.encargado]) porAsistente[item.encargado] = { 'CUMPLE': 0, 'NO CUMPLE': 0, total: 0, prodHoraEjecValues: [] }; porAsistente[item.encargado][item.estadoCalculado]++; porAsistente[item.encargado].total++; if(typeof item.prodHoraEjec === 'number' && !isNaN(item.prodHoraEjec)) { porAsistente[item.encargado].prodHoraEjecValues.push(item.prodHoraEjec); } });
    let result = Object.entries(porAsistente).map(([encargado, data]) => ({ encargado, cumple: data['CUMPLE'], noCumple: data['NO CUMPLE'], total: data.total, minProdHora: data.prodHoraEjecValues.length > 0 ? Math.min(...data.prodHoraEjecValues) : 0, maxProdHora: data.prodHoraEjecValues.length > 0 ? Math.max(...data.prodHoraEjecValues) : 0, }));
    if (sortConfigAsistente.key) { result.sort((a,b) => { let valA = a[sortConfigAsistente.key]; let valB = b[sortConfigAsistente.key]; if(typeof valA === 'string') valA = valA.toLowerCase(); if(typeof valB === 'string') valB = valB.toLowerCase(); if (valA < valB) return sortConfigAsistente.direction === 'ascending' ? -1 : 1; if (valA > valB) return sortConfigAsistente.direction === 'ascending' ? 1 : -1; return 0; }); }
    return result;
  }, [filteredAndSortedData, sortConfigAsistente]);

  const rankingProdHoraEjec = useMemo(() => { const dataConProd = filteredAndSortedData.filter(item => typeof item.prodHoraEjec === 'number' && !isNaN(item.prodHoraEjec) && item.prodHoraEjec > 0); const sortedByProd = [...dataConProd].sort((a, b) => b.prodHoraEjec - a.prodHoraEjec); return { mejores: sortedByProd.slice(0, 5), peores: [...dataConProd].sort((a,b) => a.prodHoraEjec - b.prodHoraEjec).slice(0,5) }; }, [filteredAndSortedData]);
  const exportToExcel = () => { const dataToExport = filteredAndSortedData.map(item => ({ 'FECHA': item.fecha_norm, 'ASISTENTE (Encargado)': item.encargado, 'JEFE DE CAMPO': item.jefe_campo, 'TRABAJADOR': item.trabajador, 'DNI': item.dni, 'MIN': item.min, 'MAX': item.max, 'HRS. TRAB.': (parseFloat(item.horas_avance1) || 0).toFixed(2), 'PLANTAS TRAB.': item.avance1, 'PROD/HR PROY': (parseFloat(item.proyeccion_x_hora_prom) || 0).toFixed(2), 'PROD/HR EJEC': item.prodHoraEjec.toFixed(2), 'ESTADO': item.estadoCalculado, 'COMENTARIO': item.comentario || '', 'LABOR': item.descripcion_labor, 'LOTE': item.lote, })); const worksheet = XLSX.utils.json_to_sheet(dataToExport); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "ProductividadPersonal"); XLSX.writeFile(workbook, "ProductividadPersonal.xlsx"); };
  const displayedData = useMemo(() => { if (rowsPerPage === 'Todas') return filteredAndSortedData; return filteredAndSortedData.slice(0, parseInt(rowsPerPage, 10)); }, [filteredAndSortedData, rowsPerPage]);

  if (loading) return <div className="container-fluid text-center py-5"><div className={`spinner-border ${textClassGlobal}`} style={{ width: '3rem', height: '3rem' }} role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (error) return <div className={`container-fluid alert alert-danger mt-4 ${darkMode ? 'text-white bg-danger border-danger' : ''}`} role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>Error: {error}</div>;

  return (
    <div className="container-fluid py-3">
      <style jsx global>{`
        .tabla-personal th { 
          cursor: pointer; white-space: normal !important; word-break: break-word !important; 
          vertical-align: middle; text-align: center; 
          position: sticky; top: 0; z-index: 1; 
          background-color: ${cardBgGlobal}; 
          border-right: 1px solid ${gridColorGlobal}; 
          border-bottom: 2px solid ${gridColorGlobal};
        }
        .tabla-personal td { 
          font-size: 0.70rem !important; 
          padding: 0.2rem 0.25rem !important; 
          white-space: nowrap; 
          border-right: 1px solid ${gridColorGlobal};
        }
        .tabla-personal tr th:first-child, .tabla-personal tr td:first-child { border-left: 1px solid ${gridColorGlobal};} 
        .tabla-personal tr th:last-child, .tabla-personal tr td:last-child { border-right: 1px solid ${gridColorGlobal}; }
        .tabla-personal .text-numeric { text-align: center; }
        .estado-cumple { background-color: ${darkMode ? metallicColors.green_bg : 'rgba(25, 135, 84, 0.15)'} !important; color: ${darkMode ? metallicColors.green_text_light : metallicColors.green_text_dark} !important; font-weight: bold; }
        .estado-no-cumple { background-color: ${darkMode ? metallicColors.red_bg : 'rgba(220, 53, 69, 0.15)'} !important; color: ${darkMode ? metallicColors.red_text_light : metallicColors.red_text_dark} !important; font-weight: bold; }
        .prod-ejec-highlight { background-color: ${darkMode ? metallicColors.highlight_bg_dark : metallicColors.highlight_bg_light} !important; font-weight: bold; }
        .table-responsive-custom-height { max-height: ${rowsPerPage === 'Todas' ? 'none' : '450px'}; overflow-y: auto; }
        .persona-card-mobile { font-size: 0.75rem; }
        .persona-card-mobile .card-title { font-size: 0.9rem; margin-bottom: 0.5rem; }
        .persona-card-mobile .card-text { margin-bottom: 0.2rem; font-size: 0.7rem; }
        .persona-card-mobile .card-text strong { min-width: 110px; display: inline-block; }
      `}</style>
      <style>
{`
  .tabla-personal th {
    cursor: pointer;
    white-space: normal !important;
    word-break: break-word !important;
    vertical-align: middle;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: ${cardBgGlobal};
    border-right: 1px solid ${gridColorGlobal};
    border-bottom: 2px solid ${gridColorGlobal};
  }
`}
</style>
      
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h1 className={`${textClassGlobal} h3`}>Reporte de Productividad del Personal</h1>
        <div className="d-flex align-items-center">
            <button className={`${buttonSecondaryClass} me-2`} onClick={() => setShowDataLabels(!showDataLabels)} title="Mostrar/Ocultar etiquetas en gráficos"> <i className={`bi ${showDataLabels ? 'bi-tag-fill' : 'bi-tag'}`}></i> {showDataLabels ? 'Ocultar' : 'Mostrar'} Etqt. </button>
            <button className={buttonSecondaryClass} onClick={exportToExcel} disabled={filteredAndSortedData.length === 0}> <i className="bi bi-file-earmark-excel-fill me-2"></i>Exportar </button>
        </div>
      </div>

      <div className={cardClass}> <div className="card-body"> <h5 className="card-title mb-3">Filtros</h5>
          <div className="row g-2">
            {/* Filtro por Fecha (ya es el primer nivel, pero se resetea todo al cambiarlo) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Fecha:</label> <input type="date" name="fecha" className={inputBgClass} value={filters.fecha} onChange={handleFilterChange} /> </div>
            {/* Jefe de Campo (depende de Fecha) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Jefe de Campo:</label> <select name="jefe_campo" className={inputBgClass} value={filters.jefe_campo} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueJefesCampo.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
            {/* Lote (depende de Fecha y Jefe de Campo) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Lote:</label> <select name="lote" className={inputBgClass} value={filters.lote} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueLotes.map(l => <option key={l} value={l}>{l}</option>)} </select> </div>
            {/* Labor (depende de Fecha, Jefe de Campo y Lote) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Labor:</label> <select name="labor" className={inputBgClass} value={filters.labor} onChange={handleFilterChange}> <option value="">Todas</option> {uniqueLabores.map(l => <option key={l.cod} value={l.cod}>{l.descripcion_labor} ({l.cod})</option>)} </select> </div>
            {/* Asistente (depende de Fecha, Jefe de Campo, Lote y Labor) */}
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Asistente:</label> <select name="encargado" className={inputBgClass} value={filters.encargado} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueEncargados.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
            <div className="col-lg col-md-4 col-sm-6"> <label className="form-label form-label-sm">Estado:</label> <select name="estadoCalculado" className={inputBgClass} value={filters.estadoCalculado} onChange={handleFilterChange}> <option value="">Todos</option> <option value="CUMPLE">Cumple</option> <option value="NO CUMPLE">No Cumple</option> </select> </div>
          </div>
      </div></div>
      
      <div className="row mb-3">
          <div className="col-lg-3 col-md-6"> <div className={`${cardClass} h-100`}> <div className="card-body">
            <h6 className="card-title" style={{fontSize:'0.9rem'}}>Resumen Cumplimiento</h6>
            <p className={textClassGlobal} style={{fontSize:'0.8rem', marginBottom:'0.25rem'}}>Total Registros: {filteredAndSortedData.length}</p>
            <p className="text-success mb-1" style={{fontSize:'0.8rem'}}><strong>Cumple:</strong> {estadoSummary['CUMPLE']} ({filteredAndSortedData.length > 0 ? (estadoSummary['CUMPLE']/filteredAndSortedData.length*100).toFixed(1) : 0}%)</p>
            <p className="text-danger mb-0" style={{fontSize:'0.8rem'}}><strong>No Cumple:</strong> {estadoSummary['NO CUMPLE']} ({filteredAndSortedData.length > 0 ? (estadoSummary['NO CUMPLE']/filteredAndSortedData.length*100).toFixed(1) : 0}%)</p>
          </div></div></div>
          <div className="col-lg-5 col-md-6"> <div className={`${cardClass} h-100`}> <div className="card-body d-flex flex-column justify-content-center">
            { (filteredAndSortedData.length > 0 && (estadoSummary['CUMPLE'] > 0 || estadoSummary['NO CUMPLE'] > 0)) ? <div style={{maxHeight:'200px'}}> <Bar data={stackedBarEstadoPorAsistenteData} options={stackedBarOptions('Cumplimiento por Asistente', 'Nº Registros')} /> </div> : <p className="text-center fst-italic my-auto">No hay datos para el gráfico.</p> }
          </div></div></div>
          <div className="col-lg-4 col-md-12 mt-3 mt-lg-0"> <div className={`${cardClass} h-100`}> <div className="card-body d-flex flex-column justify-content-center">
            { (filteredAndSortedData.length > 0 && (estadoSummary['CUMPLE'] > 0 || estadoSummary['NO CUMPLE'] > 0)) ? <div style={{maxHeight:'300px'}}> <Pie data={pieChartEstadoData} options={pieChartOptions('Distribución de Estado')} /> </div> : <p className="text-center fst-italic my-auto">No hay datos para el gráfico.</p> }
          </div></div></div>
      </div>

      <div className="row mb-3">
        <div className="col-lg-6 mb-3 mb-lg-0">
            <div className={cardClass}> <div className="card-header"><h6 className="mb-0">Resumen por Asistente (Encargado)</h6></div>
                <div className="card-body table-responsive" style={{maxHeight: 'calc(220px + 220px + 1.5rem)', overflowY:'auto'}}>
                    <table className={`${tableClass} tabla-personal`}>
                        <thead><tr>
                            <th onClick={() => handleSortAsistente('encargado')}>Asistente {getSortIndicatorAsistente('encargado')}</th>
                            <th onClick={() => handleSortAsistente('total')} className="text-numeric">Total Reg. {getSortIndicatorAsistente('total')}</th>
                            <th onClick={() => handleSortAsistente('cumple')} className="text-numeric">Cumple {getSortIndicatorAsistente('cumple')}</th>
                            <th onClick={() => handleSortAsistente('noCumple')} className="text-numeric">No Cumple {getSortIndicatorAsistente('noCumple')}</th>
                            <th onClick={() => handleSortAsistente('minProdHora')} className="text-numeric">Min Prod/Hr {getSortIndicatorAsistente('minProdHora')}</th>
                            <th onClick={() => handleSortAsistente('maxProdHora')} className="text-numeric">Max Prod/Hr {getSortIndicatorAsistente('maxProdHora')}</th>
                        </tr></thead>
                        <tbody>
                            {resumenPorAsistente.map(a => ( <tr key={a.encargado}>
                                <td>{a.encargado}</td> <td className="text-numeric">{a.total}</td>
                                <td className="text-success text-numeric">{a.cumple}</td> <td className="text-danger text-numeric">{a.noCumple}</td>
                                <td className="text-numeric">{a.minProdHora.toFixed(2)}</td> <td className="text-numeric">{a.maxProdHora.toFixed(2)}</td>
                            </tr> ))}
                            {resumenPorAsistente.length === 0 && <tr><td colSpan="6" className="text-center fst-italic">N/A</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div className="col-lg-6">
            <div className={cardClass}> <div className="card-header"><h6 className="mb-0">Top 5 Altos (PROD/HORA EJEC)</h6></div>
                <div className="card-body table-responsive" style={{maxHeight: '220px', overflowY:'auto'}}>
                    <table className={`${tableClass} tabla-personal`}><thead><tr><th>#</th><th>Trabajador</th><th>DNI</th><th className="text-numeric">PROD/HR EJEC</th></tr></thead>
                    <tbody>{rankingProdHoraEjec.mejores.map((t, idx) => ( <tr key={t.dni + '-mejor' + idx}><td>{idx+1}</td><td>{t.trabajador}</td><td>{t.dni}</td><td className="text-numeric">{t.prodHoraEjec.toFixed(2)}</td></tr> ))} {rankingProdHoraEjec.mejores.length === 0 && <tr><td colSpan="4" className="text-center fst-italic">N/A</td></tr>}</tbody>
                    </table>
                </div>
            </div>
            <div className={`${cardClass} mt-3`}> <div className="card-header"><h6 className="mb-0">Top 5 Bajos (PROD/HORA EJEC)</h6></div>
                <div className="card-body table-responsive" style={{maxHeight: '220px', overflowY:'auto'}}>
                    <table className={`${tableClass} tabla-personal`}><thead><tr><th>#</th><th>Trabajador</th><th>DNI</th><th className="text-numeric">PROD/HR EJEC</th></tr></thead>
                    <tbody>{rankingProdHoraEjec.peores.map((t, idx) => ( <tr key={t.dni + '-peor' + idx}><td>{idx+1}</td><td>{t.trabajador}</td><td>{t.dni}</td><td className="text-numeric">{t.prodHoraEjec.toFixed(2)}</td></tr> ))} {rankingProdHoraEjec.peores.length === 0 && <tr><td colSpan="4" className="text-center fst-italic">N/A</td></tr>}</tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>

      <div className={`${cardClass} mb-4`}>
        <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Detalle de Productividad del Personal</h5>
            <div> <label htmlFor="rowsPerPage" className="form-label form-label-sm me-2 mb-0 align-middle">Filas:</label>
                <select id="rowsPerPage" name="rowsPerPage" className={inputBgClass} style={{width:'auto', display:'inline-block'}} value={rowsPerPage} onChange={(e) => setRowsPerPage(e.target.value)}>
                    <option value="10">10</option> <option value="25">25</option> <option value="50">50</option> <option value="100">100</option> <option value="Todas">Todas</option>
                </select>
            </div>
        </div>
        <div className="card-body table-responsive table-responsive-custom-height d-none d-md-block">
          <table className={`${tableClass} tabla-personal`}>
            <thead> <tr>
                <th onClick={() => handleSort('fecha_norm')}>FECHA {getSortIndicator('fecha_norm')}</th>
                <th onClick={() => handleSort('encargado')}>ASISTENTE {getSortIndicator('encargado')}</th>
                <th onClick={() => handleSort('trabajador')}>TRABAJADOR {getSortIndicator('trabajador')}</th>
                <th onClick={() => handleSort('min')} className="text-numeric">MIN {getSortIndicator('min')}</th>
                <th onClick={() => handleSort('max')} className="text-numeric">MAX {getSortIndicator('max')}</th>
                <th onClick={() => handleSort('horas_avance1')} className="text-numeric">HRS. TRAB. {getSortIndicator('horas_avance1')}</th>
                <th onClick={() => handleSort('avance1')} className="text-numeric">PLANTAS TRAB. {getSortIndicator('avance1')}</th>
                <th onClick={() => handleSort('proyeccion_x_hora_prom')} className="text-numeric">PROD/HR PROY {getSortIndicator('proyeccion_x_hora_prom')}</th>
                <th onClick={() => handleSort('prodHoraEjec')} className="prod-ejec-highlight text-numeric">PROD/HR EJEC {getSortIndicator('prodHoraEjec')}</th>
                <th onClick={() => handleSort('estadoCalculado')}>ESTADO {getSortIndicator('estadoCalculado')}</th>
                <th onClick={() => handleSort('comentario')}>COMENTARIO {getSortIndicator('comentario')}</th>
            </tr></thead>
            <tbody>
              {displayedData.map((item, index) => (
                <tr key={item.id ? `${item.id}-${index}` : `${item.parte_diario}-${item.dni}-${index}-${item.labor}-${item.lote}`}>
                  <td>{item.fecha_norm}</td>
                  <td>{item.encargado}</td>
                  <td>{item.trabajador}</td>
                  <td className="text-numeric">{item.min}</td>
                  <td className="text-numeric">{item.max}</td>
                  <td className="text-numeric">{(parseFloat(item.horas_avance1) || 0).toFixed(2)}</td>
                  <td className="text-numeric">{parseFloat(item.avance1) || 0}</td>
                  <td className="text-numeric">{(parseFloat(item.proyeccion_x_hora_prom) || 0).toFixed(2)}</td>
                  <td className="prod-ejec-highlight text-numeric">{item.prodHoraEjec.toFixed(2)}</td>
                  <td style={getStatusCellStyle(item.estadoCalculado, darkMode, textClassGlobal)}>{item.estadoCalculado}</td>
                  <td>{item.comentario}</td>
                </tr>
              ))}
              {displayedData.length === 0 && (
                <tr>
                  <td colSpan="11" className="text-center fst-italic">No hay datos para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="d-md-none px-2">
            {displayedData.map((item, index) => (
                <div key={`card-${item.id || index}-${item.dni}-${item.labor}`} className={`${cardClass} mb-2 persona-card-mobile`}>
                    <div className="card-body py-2 px-3">
                        <h6 className={`${textClassGlobal} card-title mb-1`}>{item.trabajador} <span className="text-muted small">({item.dni})</span></h6>
                        <p className="card-text"><strong>Fecha:</strong> {item.fecha_norm}</p>
                        <p className="card-text"><strong>Asistente:</strong> {item.encargado || 'N/A'}</p>
                        <p className="card-text"><strong>Jefe C.:</strong> {item.jefe_campo || 'N/A'}</p>
                        <p className="card-text"><strong>Labor:</strong> {item.descripcion_labor || 'N/A'} ({item.labor || 'N/A'})</p>
                        <p className="card-text"><strong>Lote:</strong> {item.lote || 'N/A'}</p>
                        <hr className="my-1"/>
                        <p className="card-text"><strong>Min/Max:</strong> {item.min !== null ? item.min : '-'}/{item.max !== null ? item.max : '-'}</p>
                        <p className="card-text"><strong>Hrs. Trab.:</strong> {(parseFloat(item.horas_avance1) || 0).toFixed(2)}</p>
                        <p className="card-text"><strong>Plantas Trab.:</strong> {parseFloat(item.avance1) || 0}</p>
                        <p className="card-text"><strong>Prod/Hr Proy:</strong> {(parseFloat(item.proyeccion_x_hora_prom) || 0).toFixed(2)}</p>
                        <p className="card-text"><strong>Prod/Hr Ejec:</strong> <span className="prod-ejec-highlight">{item.prodHoraEjec.toFixed(2)}</span></p>
                        <p className="card-text mb-0"><strong>Estado:</strong> <span style={getStatusCellStyle(item.estadoCalculado, darkMode, textClassGlobal)}>{item.estadoCalculado}</span></p>
                        {item.comentario && <p className="card-text mt-1 fst-italic"><small><strong>Comentario:</strong> {item.comentario}</small></p>}
                    </div>
                </div>
            ))}
            {displayedData.length === 0 && <p className="text-center fst-italic">No hay datos para mostrar.</p>}
        </div>

      </div>
    </div>
  );
}
export default Personal;