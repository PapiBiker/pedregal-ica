import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement, TimeScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import 'chartjs-plugin-trendline';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'chartjs-adapter-date-fns';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, ChartDataLabels, LineElement, PointElement, TimeScale);
import ChartjsPluginTrendline from 'chartjs-plugin-trendline';
ChartJS.register(ChartjsPluginTrendline);
ChartJS.defaults.set('_adapters', { _date: { locale: es } });

const normalizeDate = (dateString) => {
  if (!dateString) return null;
  const sDate = String(dateString).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) {
    const parts = sDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) return sDate;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sDate)) {
    const parts = sDate.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    const yearN = parseInt(year, 10);
    const monthN = parseInt(month, 10);
    const dayN = parseInt(day, 10);
    if (yearN > 1900 && yearN < 2100 && monthN >= 1 && monthN <= 12 && dayN >= 1 && dayN <= 31) return `${year}-${month}-${day}`;
  }
  try {
    const d = new Date(sDate);
    if (d instanceof Date && !isNaN(d.valueOf())) {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      if (year > 1900 && year < 2100) return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return null;
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const extractLaborDetails = (laborString) => {
  if (!laborString) return { code: null, description: null };
  const strLabor = String(laborString).trim();
  const match = strLabor.match(/^(\d{3,}) - (.+)$/);
  if (match) return { code: match[1], description: match[2].trim() };
  return { code: strLabor, description: strLabor };
};

function Home({ setIsAuthenticated, darkMode }) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [showWelcomeToast, setShowWelcomeToast] = useState(true);
  const [ganttRawData, setGanttRawData] = useState([]);
  const [parteDiarioRawData, setParteDiarioRawData] = useState([]);
  const [filteredAndSortedData, setFilteredAndSortedData] = useState([]);
  const [loadingGantt, setLoadingGantt] = useState(true);
  const [loadingParteDiario, setLoadingParteDiario] = useState(true);
  const [errorGantt, setErrorGantt] = useState(null);
  const [errorParteDiario, setErrorParteDiario] = useState(null);
  const [filters, setFilters] = useState({ fecha_inicio: '', fecha_fin: '', labor: '', lote: '', responsable: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_norm', direction: 'descending' });
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showDataLabels, setShowDataLabels] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const textClassGlobal = darkMode ? 'rgb(230, 230, 230)' : 'rgb(40, 40, 40)';
  const secondaryTextGlobal = darkMode ? 'text-white-50' : 'text-muted';
  const gridColorGlobal = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const cardBgGlobal = darkMode ? '#1c1c1c' : '#ffffff'; // Más oscuro para dark, blanco para light
  const cardClass = `card shadow-sm mb-4 ${darkMode ? 'bg-dark-apple border-dark-subtle text-light' : 'bg-light-apple border-light-subtle'}`;
  const inputBgClass = darkMode ? 'form-control form-control-sm bg-dark-apple text-white border-secondary' : 'form-control form-control-sm bg-light-apple text-dark';
  const buttonSecondaryClass = `btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-secondary'}`;

  const loading = loadingGantt || loadingParteDiario;
  const error = errorGantt || errorParteDiario;

  const metallicColors = useMemo(() => ({
    green: darkMode ? 'rgba(50, 205, 50, 0.9)' : 'rgba(25, 135, 84, 0.9)',
    red: darkMode ? 'rgba(255, 99, 71, 0.9)' : 'rgba(220, 53, 69, 0.9)',
    blue: darkMode ? 'rgba(100, 149, 237, 0.9)' : 'rgba(13, 110, 253, 0.8)',
    teal: darkMode ? 'rgba(0, 206, 209, 0.9)' : 'rgba(32, 201, 151, 0.8)',
    yellow: darkMode ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 193, 7, 0.8)',
    orange: darkMode ? 'rgba(255, 165, 0, 0.9)' : 'rgba(253, 126, 20, 0.8)',
    purple: darkMode ? 'rgba(186, 85, 211, 0.9)' : 'rgba(111, 66, 193, 0.8)',
    gray: darkMode ? 'rgba(169, 169, 169, 0.9)' : 'rgba(108, 117, 125, 0.8)',
  }), [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && setIsAuthenticated) setIsAuthenticated(false);
    setNombre(localStorage.getItem('nombre') || 'Usuario');
    setRol(localStorage.getItem('rol') || 'N/A');
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 2);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 2);
    setFilters(prevFilters => ({
      ...prevFilters,
      fecha_inicio: startDate.toISOString().split('T')[0],
      fecha_fin: endDate.toISOString().split('T')[0]
    }));
  }, [setIsAuthenticated]);

  useEffect(() => {
    const fetchData = async (urlPath, setData, setError, setLoading, dataProcessor) => {
      if (!filters.fecha_inicio || !filters.fecha_fin) return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const url = `${apiBaseUrl}${urlPath}?fecha_inicio=${filters.fecha_inicio}&fecha_fin=${filters.fecha_fin}`;
        const response = await fetch(url, { headers });
        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && setIsAuthenticated) setIsAuthenticated(false);
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
        }
        const data = await response.json();
        if (data && Array.isArray(data)) setData(data.map(dataProcessor));
        else { setData([]); setError("Los datos recibidos no son un array o están vacíos."); }
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    fetchData('/resumen/gantt/por-rango-fechas', setGanttRawData, setErrorGantt, setLoadingGantt, item => ({
      ...item, fecha_norm: normalizeDate(item.fecha), personas: parseFloat(item.personas) || 0,
    }));
    fetchData('/resumen/parte-diario/por-rango-fechas', setParteDiarioRawData, setErrorParteDiario, setLoadingParteDiario, item => ({
      ...item, fecha_norm: normalizeDate(item.fecha),
    }));
  }, [apiBaseUrl, filters.fecha_inicio, filters.fecha_fin, setIsAuthenticated]);

  const uniqueLabores = useMemo(() => {
    const laboresMap = new Map();
    ganttRawData.forEach(item => {
      const cod = String(item.cod || '');
      const labor = String(item.labor || '');
      if (cod && labor) laboresMap.set(cod, { cod: cod, descripcion_labor: labor, displayLabel: labor });
    });
    parteDiarioRawData.forEach(item => {
      const { code: extractedCode, description: extractedDescription } = extractLaborDetails(item.descripcion_labor);
      if (extractedCode && extractedDescription) {
        if (!laboresMap.has(extractedCode)) laboresMap.set(extractedCode, { cod: extractedCode, descripcion_labor: extractedDescription, displayLabel: extractedDescription });
      } else if (item.descripcion_labor) {
        const fullDesc = String(item.descripcion_labor).trim();
        if (!laboresMap.has(fullDesc)) laboresMap.set(fullDesc, { cod: fullDesc, descripcion_labor: fullDesc, displayLabel: fullDesc });
      }
    });
    return Array.from(laboresMap.values()).sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
  }, [ganttRawData, parteDiarioRawData]);

  const getFilteredDataForNextLevel = (currentData, currentFilters, laborOptions) => {
    let data = [...currentData];
    const startDate = currentFilters.fecha_inicio ? startOfDay(parseISO(currentFilters.fecha_inicio)) : null;
    const endDate = currentFilters.fecha_fin ? endOfDay(parseISO(currentFilters.fecha_fin)) : null;

    if (startDate && endDate) {
      data = data.filter(item => {
        const itemDate = parseISO(item.fecha_norm);
        return isValid(itemDate) && itemDate >= startDate && itemDate <= endDate;
      });
    }

    if (currentFilters.labor) {
      const selectedCodeOrDescKey = currentFilters.labor;
      const selectedLaborOption = laborOptions.find(l => l.cod === selectedCodeOrDescKey);
      const filterLaborDescriptionLower = (selectedLaborOption ? selectedLaborOption.descripcion_labor : selectedCodeOrDescKey || '').toLowerCase();

      data = data.filter(item => {
        const itemGanttCod = String(item.cod || '');
        const itemGanttLaborDesc = String(item.labor || '').toLowerCase();
        const itemParteDiarioDescRaw = String(item.descripcion_labor || '');
        const { code: itemParteDiarioExtractedCode, description: itemParteDiarioExtractedDescription } = extractLaborDetails(itemParteDiarioDescRaw);
        const itemParteDiarioDescLower = String(itemParteDiarioExtractedDescription || '').toLowerCase();

        const codeMatches = (itemGanttCod === selectedCodeOrDescKey) || (itemParteDiarioExtractedCode === selectedCodeOrDescKey);
        const descriptionMatches = (filterLaborDescriptionLower && itemGanttLaborDesc === filterLaborDescriptionLower) || (filterLaborDescriptionLower && itemParteDiarioDescLower === filterLaborDescriptionLower);
        const rawDescriptionCodeMatch = itemParteDiarioDescRaw.startsWith(`${selectedCodeOrDescKey} -`);
        return codeMatches || descriptionMatches || rawDescriptionCodeMatch;
      });
    }

    if (currentFilters.lote) data = data.filter(item => String(item.lote || '') === String(currentFilters.lote || ''));
    if (currentFilters.responsable) data = data.filter(item => String(item.responsable || '') === String(currentFilters.responsable || ''));
    return data;
  };

  useEffect(() => {
    let dataToFilterAndSort = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);
    if (sortConfig.key) {
      dataToFilterAndSort.sort((a, b) => {
        let valA = a[sortConfig.key]; let valB = b[sortConfig.key]; const numA = parseFloat(valA); const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) { valA = numA; valB = numB; } else { valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase(); }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1; return 0;
      });
    }
    setFilteredAndSortedData(dataToFilterAndSort);
  }, [ganttRawData, filters, sortConfig, uniqueLabores]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
  };

  const uniqueLotes = useMemo(() => {
    const ganttLotes = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);
    const parteDiarioLotes = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    const combinedLotes = new Set();
    ganttLotes.forEach(item => item.lote && combinedLotes.add(item.lote));
    parteDiarioLotes.forEach(item => item.lote && combinedLotes.add(item.lote));
    return [...combinedLotes].sort();
  }, [ganttRawData, parteDiarioRawData, filters, uniqueLabores]);

  const uniqueResponsables = useMemo(() => {
    const data = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);
    return [...new Set(data.map(item => item.responsable).filter(Boolean))].sort();
  }, [ganttRawData, filters, uniqueLabores]);

  const totalPersonnelSummary = useMemo(() => filteredAndSortedData.reduce((sum, item) => sum + item.personas, 0), [filteredAndSortedData]);

  const personnelByJefeCampoChartData = useMemo(() => {
    const summary = {}; const uniquePersonnelPerDay = {};
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    filteredData.forEach(item => {
      if (!item.fecha_norm || !item.dni || !item.jefe_campo) return;
      const key = `${item.fecha_norm}-${item.dni}`;
      if (!uniquePersonnelPerDay[key]) uniquePersonnelPerDay[key] = { jefe_campo: item.jefe_campo };
    });
    Object.values(uniquePersonnelPerDay).forEach(entry => {
      const jefeCampo = entry.jefe_campo;
      summary[jefeCampo] = (summary[jefeCampo] || 0) + 1;
    });
    const sortedEntries = Object.entries(summary).sort(([, a], [, b]) => b - a);
    const labels = sortedEntries.map(([jefeCampo,]) => jefeCampo);
    const data = sortedEntries.map(([, count]) => count);
    return { labels, datasets: [{ type: 'bar', label: 'Personas Únicas', backgroundColor: metallicColors.blue, data: data }] };
  }, [parteDiarioRawData, filters, uniqueLabores, metallicColors]);

  const personnelByFundoChartData = useMemo(() => {
    const summary = {}; const uniquePersonnelPerDayFundo = {};
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    filteredData.forEach(item => {
      if (!item.fecha_norm || !item.dni || !item.fundo) return;
      const key = `${item.fecha_norm}-${item.dni}`;
      if (!uniquePersonnelPerDayFundo[key]) uniquePersonnelPerDayFundo[key] = { fundo: item.fundo };
    });
    const fundoCounts = {};
    Object.values(uniquePersonnelPerDayFundo).forEach(entry => {
      const fundo = entry.fundo;
      fundoCounts[fundo] = (fundoCounts[fundo] || 0) + 1;
    });
    const sortedEntries = Object.entries(fundoCounts).sort(([, a], [, b]) => b - a);
    const labels = sortedEntries.map(([fundo,]) => fundo);
    const data = sortedEntries.map(([, count]) => count);
    return { labels, datasets: [{ type: 'bar', label: 'Personas Únicas', backgroundColor: metallicColors.purple, data: data }] };
  }, [parteDiarioRawData, filters, uniqueLabores, metallicColors]);

  const personnelByLoteLabor = useMemo(() => {
    const loteLaborMap = {}; const loteTotals = {};
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    filteredData.forEach(item => {
      if (!item.lote || !item.descripcion_labor || !item.dni) return;
      if (!loteLaborMap[item.lote]) loteLaborMap[item.lote] = {};
      loteLaborMap[item.lote][item.descripcion_labor] = (loteLaborMap[item.lote][item.descripcion_labor] || 0) + 1;
      if (!loteTotals[item.lote]) loteTotals[item.lote] = new Set();
      loteTotals[item.lote].add(item.dni);
    });

    const uniqueLaborsAcrossAllLotes = [...new Set(filteredData.map(item => item.descripcion_labor).filter(Boolean))].sort();
    const sortedLotesWithTotals = Object.keys(loteTotals).map(lote => ({ lote, total: loteTotals[lote].size })).sort((a, b) => b.total - a.total).slice(0, 5);
    const sortedLotes = sortedLotesWithTotals.map(item => item.lote);

    const colors = [
      metallicColors.green, metallicColors.blue, metallicColors.purple,
      metallicColors.teal, metallicColors.orange, metallicColors.red,
      metallicColors.yellow, metallicColors.gray,
      darkMode ? 'rgba(200, 200, 200, 0.8)' : 'rgba(206, 212, 218, 0.8)',
    ];
    let colorIndex = 0;

    const datasets = uniqueLaborsAcrossAllLotes.map(laborName => {
      const data = sortedLotes.map(lote => loteLaborMap[lote]?.[laborName] || 0);
      const backgroundColor = colors[colorIndex % colors.length];
      colorIndex++;
      return { label: laborName, data: data, backgroundColor: backgroundColor };
    });

    datasets.push({
      label: 'Total Lote', data: sortedLotesWithTotals.map(item => item.total),
      backgroundColor: 'rgba(0,0,0,0)', borderColor: 'rgba(0,0,0,0)',
      hoverBackgroundColor: 'rgba(0,0,0,0)', hoverBorderColor: 'rgba(0,0,0,0)',
      datalabels: {
        align: 'end', anchor: 'end', offset: 4, color: textClassGlobal, font: { weight: 'bold', size: 9 },
        formatter: (value) => value > 0 ? value : '',
        display: (context) => showDataLabels && context.dataset.label === 'Total Lote',
        backgroundColor: 'transparent', borderRadius: 4, padding: 4
      },
      stack: 'total_labels', order: 0,
    });
    return { labels: sortedLotes, datasets: datasets };
  }, [parteDiarioRawData, showDataLabels, filters, uniqueLabores, metallicColors, textClassGlobal, darkMode]);

  const combinedGanttAttendanceData = useMemo(() => {
    const dailyData = {}; const todayFormatted = getTodayDate(); const todayAsDate = parseISO(todayFormatted);
    const startDate = filters.fecha_inicio ? startOfDay(parseISO(filters.fecha_inicio)) : null;
    const endDate = filters.fecha_fin ? endOfDay(parseISO(filters.fecha_fin)) : null;

    const filteredGantt = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);
    const filteredParteDiario = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);

    filteredGantt.forEach(item => {
      const dateKey = item.fecha_norm;
      if (!dailyData[dateKey]) dailyData[dateKey] = { gantt: 0, attendance: 0 };
      dailyData[dateKey].gantt += item.personas;
    });

    const uniqueDniPerDay = {};
    filteredParteDiario.forEach(item => {
      const dateKey = item.fecha_norm;
      if (!item.fecha_norm || !item.dni) return;
      if (!uniqueDniPerDay[dateKey]) uniqueDniPerDay[dateKey] = new Set();
      uniqueDniPerDay[dateKey].add(item.dni);
    });

    Object.keys(uniqueDniPerDay).forEach(date => {
      if (!dailyData[date]) dailyData[date] = { gantt: 0, attendance: 0 };
      dailyData[date].attendance = uniqueDniPerDay[date].size;
    });

    const allDatesInRange = [];
    if (startDate && endDate) {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        allDatesInRange.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const sortedDates = [...new Set(allDatesInRange.concat(Object.keys(dailyData)))].sort((a, b) => {
      const dateA = parseISO(a);
      const dateB = parseISO(b);
      return dateA.getTime() - dateB.getTime();
    });

    const labels = sortedDates;
    const ganttPersonnel = sortedDates.map(date => dailyData[date]?.gantt || 0);
    const attendancePersonnel = sortedDates.map(date => dailyData[date]?.attendance || 0);

    const trendlineDataPoints = [];
    labels.forEach((dateString, index) => {
      const date = parseISO(dateString);
      if (date <= todayAsDate) {
        trendlineDataPoints.push({ x: dateString, y: attendancePersonnel[index] });
      } else {
        trendlineDataPoints.push({ x: dateString, y: null });
      }
    });

    return {
      labels,
      datasets: [
        { type: 'bar', label: 'Personas Pedidas (Gantt)', backgroundColor: metallicColors.blue, data: ganttPersonnel, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'Personas Asistentes (Real)', borderColor: metallicColors.green.replace('0.9', '0.6'), backgroundColor: 'rgba(0,0,0,0)', borderWidth: 2, pointRadius: 4, pointBackgroundColor: metallicColors.green.replace('0.9', '0.6'), data: attendancePersonnel, yAxisID: 'y', order: 1, tension: 0.3, },
        {
          type: 'line', label: 'Tendencia de Asistencia', borderColor: metallicColors.yellow, backgroundColor: 'rgba(0,0,0,0)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, data: trendlineDataPoints,
          trendlineLinear: { style: metallicColors.yellow, lineStyle: 'dotted', width: 2, projection: true },
          fill: false, yAxisID: 'y', order: 0,
        }
      ],
    };
  }, [ganttRawData, parteDiarioRawData, filters, uniqueLabores, metallicColors]);

  const dailyActualAttendanceData = useMemo(() => {
    const dailyCounts = {};
    const startDate = filters.fecha_inicio ? startOfDay(parseISO(filters.fecha_inicio)) : null;
    const endDate = filters.fecha_fin ? endOfDay(parseISO(filters.fecha_fin)) : null;
    const filteredParteDiario = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    filteredParteDiario.forEach(item => {
      if (item.fecha_norm && item.dni) {
        const dateKey = item.fecha_norm;
        if (!dailyCounts[dateKey]) dailyCounts[dateKey] = new Set();
        dailyCounts[dateKey].add(item.dni);
      }
    });
    const allDatesInRange = [];
    if (startDate && endDate) {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        allDatesInRange.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    const sortedDates = [...new Set(allDatesInRange.concat(Object.keys(dailyCounts)))].sort((a, b) => {
      const dateA = parseISO(a);
      const dateB = parseISO(b);
      return dateA.getTime() - dateB.getTime();
    });
    const labels = sortedDates;
    const data = sortedDates.map(date => dailyCounts[date]?.size || 0);
    return { labels, datasets: [{ type: 'bar', label: 'Asistencia Diaria (Real)', backgroundColor: metallicColors.teal, data: data }] };
  }, [parteDiarioRawData, filters, uniqueLabores, metallicColors]);

  const stackedBarOptions = (title, yAxisLabel) => ({
    responsive: true, maintainAspectRatio: false, aspectRatio: 1.8,
    plugins: {
      legend: { display: false },
      title: { display: !!title, text: title, color: textClassGlobal, font: { size: 11, weight: 'bold' } },
      datalabels: {
        display: (context) => context.dataset.label === 'Total Lote' && showDataLabels,
        anchor: 'end', align: 'top', offset: 4, color: textClassGlobal,
        font: { weight: 'bold', size: 9 }, formatter: (value) => value > 0 ? value : '',
        backgroundColor: (context) => darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
        borderRadius: 4, padding: 4
      }
    },
    scales: {
      x: { ticks: { color: textClassGlobal, font: { size: 8 } }, grid: { color: gridColorGlobal, borderColor: gridColorGlobal }, stacked: true },
      y: { ticks: { color: textClassGlobal, font: { size: 9 } }, grid: { color: gridColorGlobal, borderColor: gridColorGlobal }, title: { display: !!yAxisLabel, text: yAxisLabel, color: textClassGlobal, font: { size: 9 } }, stacked: true }
    }
  });

  const top5LaborsActualData = useMemo(() => {
    const laborCounts = {}; const laborLotes = {};
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    filteredData.forEach(item => {
      if (item.descripcion_labor && item.dni && item.lote) {
        const { description: extractedDescription } = extractLaborDetails(item.descripcion_labor);
        const laborName = extractedDescription || item.descripcion_labor;
        if (!laborCounts[laborName]) { laborCounts[laborName] = new Set(); laborLotes[laborName] = {}; }
        laborCounts[laborName].add(item.dni);
        if (!laborLotes[laborName][item.lote]) laborLotes[laborName][item.lote] = new Set();
        laborLotes[laborName][item.lote].add(item.dni);
      }
    });
    const sortedLabors = Object.entries(laborCounts).map(([labor, dnis]) => ({ labor, count: dnis.size })).sort((a, b) => b.count - a.count).slice(0, 5);
    const labels = sortedLabors.map(item => item.labor);
    const data = sortedLabors.map(item => item.count);
    const tooltipCallbacks = {
      callbacks: {
        label: function (context) {
          const labor = context.label; const lotes = laborLotes[labor];
          if (!lotes) return ['Sin datos'];
          const lines = [`Lotes para ${labor}:`];
          Object.entries(lotes).sort(([, a], [, b]) => b.size - a.size).forEach(([lote, dnis]) => { lines.push(`- ${lote}: ${dnis.size} personas`); });
          return lines;
        }
      }
    };
    return { labels, datasets: [{ type: 'bar', label: 'Personas Únicas', backgroundColor: metallicColors.orange, data: data, tooltipCallbacks: tooltipCallbacks }] };
  }, [parteDiarioRawData, filters, uniqueLabores, metallicColors]);

  const top5LotesComparisonData = useMemo(() => {
    const loteData = {};
    const filteredGanttData = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);
    const filteredParteDiarioData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    filteredGanttData.forEach(item => {
      if (item.lote) {
        if (!loteData[item.lote]) loteData[item.lote] = { gantt: 0, actual: new Set() };
        loteData[item.lote].gantt += item.personas;
      }
    });
    filteredParteDiarioData.forEach(item => {
      if (item.lote && item.dni) {
        if (!loteData[item.lote]) loteData[item.lote] = { gantt: 0, actual: new Set() };
        loteData[item.lote].actual.add(item.dni);
      }
    });
    const combinedLotes = Object.entries(loteData).map(([lote, data]) => ({ lote, gantt: data.gantt, actual: data.actual.size })).sort((a, b) => (b.gantt + b.actual) - (a.gantt + a.actual)).slice(0, 5);
    const labels = combinedLotes.map(item => item.lote);
    const ganttData = combinedLotes.map(item => item.gantt);
    const actualData = combinedLotes.map(item => item.actual);
    return {
      labels,
      datasets: [
        { type: 'bar', label: 'Pedidas (Gantt)', backgroundColor: metallicColors.blue, data: ganttData, order: 2, categoryPercentage: 0.6, barPercentage: 0.8 },
        { type: 'bar', label: 'Asistentes (Real)', backgroundColor: metallicColors.green, data: actualData, order: 1, categoryPercentage: 0.6, barPercentage: 0.8 }
      ]
    };
  }, [ganttRawData, parteDiarioRawData, filters, uniqueLabores, metallicColors]);

  const newChartsCommonOptions = (title, yAxisLabel, customOptions = {}) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: customOptions.showLegend !== undefined ? customOptions.showLegend : true, position: customOptions.legendPosition || 'top', labels: { color: textClassGlobal, boxWidth: 10, padding: 8, font: { size: 9 } } },
      title: { display: !!title, text: title, color: textClassGlobal, font: { size: 11, weight: 'bold' } },
      datalabels: {
        display: showDataLabels, anchor: 'end', align: 'top', color: textClassGlobal,
        font: { weight: 'bold', size: 9 }, formatter: (value) => value > 0 ? value : '',
        offset: customOptions.datalabelsOffset || 4,
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: textClassGlobal, bodyColor: textClassGlobal,
        borderColor: gridColorGlobal, borderWidth: 1, padding: 10, boxPadding: 4,
        callbacks: customOptions.tooltipCallbacks
      }
    },
    scales: {
      x: {
        ticks: { color: textClassGlobal, font: { size: 9 } }, grid: { color: gridColorGlobal, borderColor: gridColorGlobal },
        type: customOptions.timeScale ? 'time' : 'category',
        time: customOptions.timeScale ? { unit: 'day', tooltipFormat: 'dd MMM CCCC', displayFormats: { day: 'EEE dd/MM' }, parser: 'yyyy-MM-dd', min: filters.fecha_inicio && isValid(parseISO(filters.fecha_inicio)) ? filters.fecha_inicio : undefined, max: filters.fecha_fin && isValid(parseISO(filters.fecha_fin)) ? filters.fecha_fin : undefined, } : undefined,
        adapters: customOptions.timeScale ? { date: { locale: es } } : undefined,
      },
      y: {
        ticks: { color: textClassGlobal, font: { size: 9 } }, grid: { color: gridColorGlobal, borderColor: gridColorGlobal },
        title: { display: !!yAxisLabel, text: yAxisLabel, color: textClassGlobal, font: { size: 9 } },
        beginAtZero: true, suggestedMax: customOptions.suggestedYMax,
      }
    },
    ...customOptions?.nativeOptions
  });

  const combinedChartOptions = (titleText) => ({
    responsive: true, maintainAspectRatio: false, height: 350,
    plugins: {
      legend: { position: 'top', labels: { color: textClassGlobal, boxWidth: 10, padding: 8, font: { size: 9 } }, },
      title: { display: !!titleText, text: titleText, color: textClassGlobal, font: { size: 11, weight: 'bold' }, },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: textClassGlobal, bodyColor: textClassGlobal,
        borderColor: gridColorGlobal, borderWidth: 1, padding: 10, boxPadding: 4,
      },
      datalabels: {
        display: (context) => showDataLabels && context.dataset.data[context.dataIndex] > 0,
        color: (context) => {
          const dataset = context.dataset;
          const colorMatch = (dataset.backgroundColor || dataset.borderColor)?.match(/\d+/g);
          if (colorMatch) {
            const r = parseInt(colorMatch[0]), g = parseInt(colorMatch[1]), b = parseInt(colorMatch[2]);
            return ((r * 299 + g * 587 + b * 114) / 1000 > 125) ? 'rgb(20,20,20)' : 'rgb(240,240,240)';
          }
          return textClassGlobal;
        },
        font: { weight: 'bold', size: 9 }, formatter: (value) => value > 0 ? value : '',
        backgroundColor: (context) => (context.dataset.backgroundColor || context.dataset.borderColor)?.replace('0.9', '0.7') || 'rgba(0,0,0,0.7)',
        borderRadius: 4, padding: 4,
        anchor: 'end', align: 'top', offset: (context) => context.dataset.type === 'bar' ? 4 : 8,
      },
    },
    scales: {
      x: {
        type: 'time', time: { unit: 'day', tooltipFormat: 'dd MMM CCCC', displayFormats: { day: 'EEE dd/MM' }, parser: 'yyyy-MM-dd', min: filters.fecha_inicio && isValid(parseISO(filters.fecha_inicio)) ? filters.fecha_inicio : undefined, max: filters.fecha_fin && isValid(parseISO(filters.fecha_fin)) ? filters.fecha_fin : undefined, },
        adapters: { date: { locale: es } },
        ticks: { color: textClassGlobal, font: { size: 10 }, maxRotation: 45, minRotation: 45, },
        grid: { color: gridColorGlobal, borderColor: gridColorGlobal },
      },
      y: { ticks: { color: textClassGlobal, font: { size: 9 } }, grid: { color: gridColorGlobal, borderColor: gridColorGlobal }, title: { display: true, text: 'Nº de Personas', color: textClassGlobal, font: { size: 9 } }, beginAtZero: true, },
    },
  });

  const top5LotesComparisonTooltipCallbacks = useMemo(() => {
    return {
      callbacks: {
        title: (context) => `Lote: ${context[0].label}`,
        label: function (context) {
          const datasetLabel = context.dataset.label;
          const value = context.parsed.y;
          const lote = context.label;
          let lines = [`${datasetLabel}: ${value} personas`];
          if (datasetLabel === 'Asistentes (Real)') {
            const laborCountsForLote = {}; const uniqueDnisForLaborLote = {};
            const relevantParteDiarioData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores).filter(item => item.lote === lote && item.dni);
            relevantParteDiarioData.forEach(item => {
              const { description: extractedDescription } = extractLaborDetails(item.descripcion_labor);
              const laborName = extractedDescription || item.descripcion_labor;
              if (!uniqueDnisForLaborLote[laborName]) uniqueDnisForLaborLote[laborName] = new Set();
              uniqueDnisForLaborLote[laborName].add(item.dni);
            });
            Object.keys(uniqueDnisForLaborLote).forEach(laborName => { laborCountsForLote[laborName] = uniqueDnisForLaborLote[laborName].size; });
            const sortedLabors = Object.entries(laborCountsForLote).sort(([, countA], [, countB]) => countB - countA);
            const top5Labors = sortedLabors.slice(0, 5);
            const otherLaborsSum = sortedLabors.slice(5).reduce((sum, [, count]) => sum + count, 0);
            lines.push('', 'Detalle de Labores (Asistencia Real):');
            if (top5Labors.length > 0) {
              top5Labors.forEach(([labor, count]) => { lines.push(`- ${labor}: ${count} personas`); });
              if (otherLaborsSum > 0) lines.push(`- Otras Labores: ${otherLaborsSum} personas`);
            } else { lines.push('- Sin labores registradas para este lote en el período.'); }
          }
          return lines;
        }
      }
    };
  }, [parteDiarioRawData, filters, uniqueLabores]);

  const complianceData = useMemo(() => {
    const filteredParteDiarioForCompliance = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    const totalAsistentes = new Set(filteredParteDiarioForCompliance.map(item => item.dni)).size;
    const totalPedidos = totalPersonnelSummary;
    let percentage = 0;
    if (totalPedidos > 0) { percentage = (totalAsistentes / totalPedidos) * 100; } else if (totalAsistentes > 0) { percentage = 100; }
    const complianceSegment = Math.min(percentage, 100);
    const remainingSegment = 100 - complianceSegment;
    const backgroundColor = [];
    if (percentage >= 90) { backgroundColor.push(metallicColors.green); } else if (percentage >= 70) { backgroundColor.push(metallicColors.yellow); } else { backgroundColor.push(metallicColors.red); }
    backgroundColor.push(darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');
    return { percentage: percentage.toFixed(1), labels: ['Cumplimiento', 'Restante'], datasets: [{ data: [complianceSegment, remainingSegment], backgroundColor: backgroundColor, borderColor: darkMode ? '#1c1c1c' : '#fff', borderWidth: 1, }], totalAsistentes: totalAsistentes, totalPedidos: totalPedidos };
  }, [totalPersonnelSummary, parteDiarioRawData, filters, uniqueLabores, darkMode, metallicColors]);

  const exportToExcel = () => {
    const dataToExport = filteredAndSortedData.map(item => ({
      'FECHA': item.fecha_norm, 'CODIGO LABOR': item.cod, 'LABOR': item.labor, 'RESPONSABLE': item.responsable, 'LOTE': item.lote, 'TURNO': item.turno, 'TRABAJO': item.trabajo, 'PRECIO': item.precio, 'PRODUCCION': item.prod, 'PROD. MIN': item.min, 'PROD. MAX': item.max, 'PERSONAS': item.personas, 'SEMANA': item.semana,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AsistenciaGantt");
    XLSX.writeFile(workbook, "AsistenciaGantt.xlsx");
  };

  const formattedFechaInicio = filters.fecha_inicio ? format(parseISO(filters.fecha_inicio), 'dd/MM/yyyy') : '';
  const formattedFechaFin = filters.fecha_fin ? format(parseISO(filters.fecha_fin), 'dd/MM/yyyy') : '';

  if (loading) return <div className="container-fluid text-center py-5"><div className={`spinner-border ${textClassGlobal}`} style={{ width: '3rem', height: '3rem' }} role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (error) return <div className={`container-fluid alert alert-danger mt-4 ${darkMode ? 'text-white bg-danger border-danger' : ''}`} role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>Error: {error}</div>;

  return (
    <Fragment>
      <style>{`
        .bg-dark-apple { background-color: #1c1c1c !important; }
        .bg-light-apple { background-color: #ffffff !important; }
        .border-dark-subtle { border-color: rgba(255, 255, 255, 0.15) !important; }
        .border-light-subtle { border-color: rgba(0, 0, 0, 0.1) !important; }
        .form-control.bg-dark-apple, .form-select.bg-dark-apple { border-color: rgba(255, 255, 255, 0.2) !important; }
        .form-control.bg-light-apple, .form-select.bg-light-apple { border-color: rgba(0, 0, 0, 0.2) !important; }
        .toast.bg-dark-custom { background-color: #282828 !important; border-color: #444 !important; }
        .toast.bg-light-custom { background-color: #f0f0f0 !important; border-color: #ccc !important; }
      `}</style>

      <div aria-live="polite" aria-atomic="true" className="position-relative">
        <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
          {showWelcomeToast && (
            <div className={`toast align-items-center ${darkMode ? 'text-white bg-dark-custom border-secondary' : 'text-dark bg-light-custom border-primary'}`} role="alert" aria-live="assertive" aria-atomic="true" >
              <div className="d-flex">
                <div className="toast-body">
                  ¡Hola, <strong>{nombre}</strong>! Bienvenido/a de nuevo. Tu rol es: <strong>{rol}</strong>.
                </div>
                <button type="button" className={`btn-close me-2 m-auto ${darkMode ? 'btn-close-white' : ''}`} data-bs-dismiss="toast" aria-label="Cerrar" onClick={() => setShowWelcomeToast(false)}></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <h1 className={`${textClassGlobal} h3 fw-semibold`}>Bienvenido, {nombre} | Asistencia de {formattedFechaInicio} a {formattedFechaFin}</h1>
        <div className="d-flex align-items-center">
          <button className={`${buttonSecondaryClass} me-2 border-0`} onClick={() => setShowDataLabels(!showDataLabels)} title="Mostrar/Ocultar etiquetas en gráficos"> <i className={`bi ${showDataLabels ? 'bi-tag-fill' : 'bi-tag'}`}></i> {showDataLabels ? 'Ocultar' : 'Mostrar'} Etqt. </button>
          <button className={`${buttonSecondaryClass} border-0`} onClick={exportToExcel} disabled={filteredAndSortedData.length === 0}> <i className="bi bi-file-earmark-excel-fill me-2"></i>Exportar </button>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-lg-8 col-md-12">
          <div className={cardClass}>
            <div className="card-body">
              <h5 className="card-title mb-3 fw-bold">Filtros</h5>
              <div className="row g-2">
                <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Fecha Inicio:</label> <input type="date" name="fecha_inicio" className={inputBgClass} value={filters.fecha_inicio} onChange={handleFilterChange} /> </div>
                <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Fecha Fin:</label> <input type="date" name="fecha_fin" className={inputBgClass} value={filters.fecha_fin} onChange={handleFilterChange} /> </div>
                <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Lote:</label> <select name="lote" className={inputBgClass} value={filters.lote} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueLotes.map(l => <option key={l} value={l}>{l}</option>)} </select> </div>
                <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Labor:</label> <select name="labor" className={inputBgClass} value={filters.labor} onChange={handleFilterChange}> <option value="">Todas</option> {uniqueLabores.map(l => <option key={l.cod} value={l.cod}>{l.displayLabel}</option>)} </select> </div>
                <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Responsable (Gantt):</label> <select name="responsable" className={inputBgClass} value={filters.responsable} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueResponsables.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 col-md-12 mt-3 mt-lg-0">
          <div className={`${cardClass} h-100 d-flex flex-column`}>
            <div className="card-body d-flex flex-column justify-content-center align-items-center position-relative">
              <h5 className="card-title text-center mb-3 fw-bold" style={{ fontSize: '1rem' }}>Cumplimiento de Asistencia</h5>
              {(complianceData.totalAsistentes || complianceData.totalPedidos) > 0 ? (
                <div style={{ position: 'relative', width: '100%', maxWidth: '250px', height: '150px' }}>
                  <Pie
                    data={complianceData}
                    options={{
                      responsive: true, maintainAspectRatio: false, circumference: 180, rotation: -90, cutout: '70%',
                      plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
                      animation: { animateRotate: true, animateScale: true },
                    }}
                    key="compliance-gauge-chart"
                  />
                  <div className="position-absolute top-50 start-50 translate-middle" style={{ textAlign: 'center', marginTop: '20px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: textClassGlobal }}>{complianceData.percentage}%</span>
                    <p className={secondaryTextGlobal} style={{ fontSize: '0.75rem', marginBottom: 0 }}>{complianceData.totalAsistentes} de {complianceData.totalPedidos} personas</p>
                  </div>
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos para el tacómetro.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-lg-4 col-md-6 mb-3 mb-md-0">
          <div className={`${cardClass} h-100`}>
            <div className="card-header border-0 pb-0 bg-transparent"><h6 className="mb-0 fw-bold">Asistencia por Jefe de Campo (Real)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {personnelByJefeCampoChartData.labels.length > 0 && personnelByJefeCampoChartData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ maxHeight: '350px' }}>
                  <Bar data={personnelByJefeCampoChartData} options={newChartsCommonOptions('Asistencia por Jefe de Campo (Real)', 'Nº Personas', { showLegend: false, datalabelsOffset: 8, suggestedYMax: Math.max(...personnelByJefeCampoChartData.datasets[0].data) * 1.2 })} key="jefe-campo-chart" />
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos de asistencia por Jefe de Campo.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-6 mb-3 mb-md-0">
          <div className={`${cardClass} h-100`}>
            <div className="card-header border-0 pb-0 bg-transparent"><h6 className="mb-0 fw-bold">Asistencia por Fundo (Real)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {personnelByFundoChartData.labels.length > 0 && personnelByFundoChartData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ maxHeight: '350px' }}>
                  <Bar data={personnelByFundoChartData} options={newChartsCommonOptions('Asistencia por Fundo (Real)', 'Nº Personas', { showLegend: false, datalabelsOffset: 8, suggestedYMax: Math.max(...personnelByFundoChartData.datasets[0].data) * 1.2 })} key="fundo-chart" />
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos de asistencia por Fundo.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-12">
          <div className={`${cardClass} h-100`}>
            <div className="card-header border-0 pb-0 bg-transparent"><h6 className="mb-0 fw-bold">Asistencia por Lote y Labor (Top 5 Lotes)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {(personnelByLoteLabor.labels.length > 0 && personnelByLoteLabor.datasets.some(ds => ds.data.some(d => d > 0))) ? <div style={{ maxHeight: '450px' }}> <Bar data={personnelByLoteLabor} options={stackedBarOptions('Asistencia por Lote y Labor (Top 5 Lotes)', 'Nº Personas')} key="bar-lote-labor-chart" /> </div> : <p className="text-center fst-italic my-auto">No hay datos para el gráfico de Asistencia por Lote y Labor.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-12">
          <div className={`${cardClass} h-100`}>
            <div className="card-header border-0 pb-0 bg-transparent"><h6 className="mb-0 fw-bold">Análisis Comparativo: Personas Pedidas (Gantt) vs. Personas Asistentes (Real) por Día</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {combinedGanttAttendanceData.labels.length > 0 && combinedGanttAttendanceData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ height: '350px' }}>
                  <Bar data={combinedGanttAttendanceData} options={combinedChartOptions('Personas Pedidas vs. Asistentes por Día')} key="combined-gantt-attendance-chart" />
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos para el gráfico comparativo de Gantt y Asistencia.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-lg-4 col-md-6 mb-3 mb-md-0">
          <div className={`${cardClass} h-100`}>
            <div className="card-header border-0 pb-0 bg-transparent"><h6 className="mb-0 fw-bold">Asistencia Diaria (Real)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {dailyActualAttendanceData.labels.length > 0 && dailyActualAttendanceData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ height: '250px' }}>
                  <Bar data={dailyActualAttendanceData} options={newChartsCommonOptions('Asistencia Diaria (Real)', 'Nº Personas', { timeScale: true, showLegend: false, datalabelsOffset: 8, suggestedYMax: Math.max(...dailyActualAttendanceData.datasets[0].data) * 1.2 })} key="daily-attendance-chart" />
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos para este gráfico.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-6 mb-3 mb-md-0">
          <div className={`${cardClass} h-100`}>
            <div className="card-header border-0 pb-0 bg-transparent"><h6 className="mb-0 fw-bold">Top 5 Labores (Asistencia Real)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {top5LaborsActualData.labels.length > 0 && top5LaborsActualData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ height: '250px' }}>
                  <Bar
                    data={top5LaborsActualData}
                    options={{
                      ...newChartsCommonOptions('Top 5 Labores (Real)', 'Nº Personas', { showLegend: false, datalabelsOffset: 8, suggestedYMax: Math.max(...top5LaborsActualData.datasets[0].data) * 1.2 }),
                      plugins: {
                        tooltip: top5LaborsActualData.datasets[0].tooltipCallbacks
                      }
                    }}
                    key="top5-labors-actual-chart"
                  />
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos para este gráfico.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4 col-md-12">
          <div className={`${cardClass} h-100`}>
            <div className="card-header border-0 pb-0 bg-transparent"><h6 className="mb-0 fw-bold">Top 5 Lotes: Pedidas (Gantt) vs Asistentes (Real)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {top5LotesComparisonData.labels.length > 0 && top5LotesComparisonData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ height: '250px' }}>
                  <Bar data={top5LotesComparisonData} options={newChartsCommonOptions('Top 5 Lotes: Pedidas vs Asistentes', 'Nº Personas', { datalabelsOffset: 8, suggestedYMax: Math.max(...top5LotesComparisonData.datasets[0].data.concat(top5LotesComparisonData.datasets[1].data)) * 1.2, tooltipCallbacks: top5LotesComparisonTooltipCallbacks.callbacks })} key="top5-lotes-comparison-chart-new" />
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos para este gráfico.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default Home;