// src/Home.jsx
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


ChartJS.defaults.set('_adapters', {
  _date: {
    locale: es
  }
});


// --- HELPER FUNCTIONS ---
const normalizeDate = (dateString) => {
  if (!dateString) return null;
  const sDate = String(dateString).trim();
  // Check YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(sDate)) {
    const parts = sDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return sDate;
    }
  }
  // Check DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sDate)) {
    const parts = sDate.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    const yearN = parseInt(year, 10);
    const monthN = parseInt(month, 10);
    const dayN = parseInt(day, 10);
    if (yearN > 1900 && yearN < 2100 && monthN >= 1 && monthN <= 12 && dayN >= 1 && dayN <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  // Try to parse as a generic date
  try {
    const d = new Date(sDate);
    if (d instanceof Date && !isNaN(d.valueOf())) {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      if (year > 1900 && year < 2100) { // Basic year range check
        return `${year}-${month}-${day}`;
      }
    }
  } catch (e) {
    // console.error("Error parsing date:", sDate, e);
  }
  return null;
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatDateForAxis = (dateString_YYYY_MM_DD) => {
    if (!dateString_YYYY_MM_DD || !normalizeDate(dateString_YYYY_MM_DD)) return dateString_YYYY_MM_DD || '';
    const date = parseISO(dateString_YYYY_MM_DD);
    return format(date, 'EEE dd/MM', { locale: es });
};

const metallicColors = {
    green: 'rgba(25, 135, 84, 0.9)', red: 'rgba(220, 53, 69, 0.9)',
    green_bg: 'rgba(25, 135, 84, 0.15)', red_bg: 'rgba(220, 53, 69, 0.15)',
    green_text_dark: '#198754', red_text_dark: '#DC3545',
    green_text_light: '#A3E9A4', red_text_light: '#FFB3B3',
    blue: 'rgba(13, 110, 253, 0.8)', teal: 'rgba(32, 201, 151, 0.8)',
    highlight_bg_dark: 'rgba(13, 110, 253, 0.2)', highlight_bg_light: 'rgba(13, 110, 253, 0.1)',
    yellow: 'rgba(255, 193, 7, 0.8)', orange: 'rgba(253, 126, 20, 0.8)', purple: 'rgba(111, 66, 193, 0.8)',
    gray: 'rgba(108, 117, 125, 0.8)', lightgray: 'rgba(206, 212, 218, 0.8)'
};

// Helper to extract code and clean description from a labor string (like "050 - ACLAREO 01")
const extractLaborDetails = (laborString) => {
    if (!laborString) return { code: null, description: null };
    const strLabor = String(laborString).trim();
    const match = strLabor.match(/^(\d{3,}) - (.+)$/); // Matches "CODE - DESCRIPTION"
    if (match) {
        return { code: match[1], description: match[2].trim() };
    }
    // If no code prefix, assume the whole string is the description and use it as code too
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

  const [filters, setFilters] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    labor: '',
    lote: '',
    responsable: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_norm', direction: 'descending' });
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showDataLabels, setShowDataLabels] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_URL;
  const textClassGlobal = darkMode ? 'rgb(230, 230, 230)' : 'rgb(40, 40, 40)';
  const secondaryTextGlobal = darkMode ? 'text-white-50' : 'text-muted';
  const gridColorGlobal = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
  const cardBgGlobal = darkMode ? '#212529' : '#f8f9fa';
  const cardClass = `card shadow-sm mb-4 ${darkMode ? 'bg-dark border-secondary text-light' : 'bg-light'}`;
  const inputBgClass = darkMode ? 'form-control form-control-sm bg-dark text-white border-secondary' : 'form-control form-control-sm bg-light text-dark';
  const tableClass = `table table-sm table-striped table-hover ${darkMode ? 'table-dark' : ''}`;
  const buttonSecondaryClass = `btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-secondary'}`;

  const loading = loadingGantt || loadingParteDiario;
  const error = errorGantt || errorParteDiario;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && setIsAuthenticated) {
      setIsAuthenticated(false);
    }
    setNombre(localStorage.getItem('nombre') || 'Usuario');
    setRol(localStorage.getItem('rol') || 'N/A');

    const today = new Date();
    // Use current date as the start date for filtering
    const startDate = new Date(today); 
    // Show a range of 5 days (e.g., today - 2 days to today + 2 days)
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
    const fetchGanttData = async () => {
      if (!filters.fecha_inicio || !filters.fecha_fin) return;
      setLoadingGantt(true);
      setErrorGantt(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `${apiBaseUrl}/resumen/gantt/por-rango-fechas?fecha_inicio=${filters.fecha_inicio}&fecha_fin=${filters.fecha_fin}`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && setIsAuthenticated) {
            setIsAuthenticated(false);
          }
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud (Gantt)'}`);
        }
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setGanttRawData(data.map(item => ({
            ...item,
            fecha_norm: normalizeDate(item.fecha),
            personas: parseFloat(item.personas) || 0,
          })));
        } else {
          setGanttRawData([]);
          setErrorGantt("Los datos de Gantt recibidos no son un array o están vacíos.");
        }
      } catch (err) {
        setErrorGantt(err.message);
      } finally {
        setLoadingGantt(false);
      }
    };
    fetchGanttData();
  }, [apiBaseUrl, filters.fecha_inicio, filters.fecha_fin, setIsAuthenticated]);

  useEffect(() => {
    const fetchParteDiarioData = async () => {
      if (!filters.fecha_inicio || !filters.fecha_fin) return;
      setLoadingParteDiario(true);
      setErrorParteDiario(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const url = `${apiBaseUrl}/resumen/parte-diario/por-rango-fechas?fecha_inicio=${filters.fecha_inicio}&fecha_fin=${filters.fecha_fin}`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          if ((response.status === 401 || response.status === 403) && setIsAuthenticated) {
            setIsAuthenticated(false);
          }
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud (Parte Diario)'}`);
        }
        const data = await response.json();
        if (data && Array.isArray(data)) {
            setParteDiarioRawData(data.map(item => ({
              ...item,
              fecha_norm: normalizeDate(item.fecha),
              dni: item.dni,
              fundo: item.fundo,
              jefe_campo: item.jefe_campo,
              descripcion_labor: item.descripcion_labor,
              lote: item.lote,
              rol: item.rol,
              turno: item.turno
            })));
        } else {
          setParteDiarioRawData([]);
          setErrorParteDiario("Los datos del Parte Diario recibidos no son un array o están vacíos.");
        }
      } catch (err) {
        setErrorParteDiario(err.message);
      } finally {
        setLoadingParteDiario(false);
      }
    };
    fetchParteDiarioData();
  }, [apiBaseUrl, filters.fecha_inicio, filters.fecha_fin, setIsAuthenticated]);


  const uniqueLabores = useMemo(() => {
    const laboresMap = new Map(); // Map: code -> {code, description, displayLabel}

    // Process Gantt data
    ganttRawData.forEach(item => {
        const cod = String(item.cod || '');
        const labor = String(item.labor || '');
        if (cod && labor) {
            laboresMap.set(cod, {
                cod: cod,
                descripcion_labor: labor,
                displayLabel: labor // Just the description for display
            });
        }
    });

    // Process Parte Diario data
    parteDiarioRawData.forEach(item => {
        const { code: extractedCode, description: extractedDescription } = extractLaborDetails(item.descripcion_labor);
        
        if (extractedCode && extractedDescription) {
            if (!laboresMap.has(extractedCode)) { 
                // If code is new or if existing one is not from Gantt (less specific), add/update
                laboresMap.set(extractedCode, {
                    cod: extractedCode,
                    descripcion_labor: extractedDescription,
                    displayLabel: extractedDescription
                });
            }
        } else if (item.descripcion_labor) {
            // If no code extracted (e.g., just "ASISTENTE DE PROCESO" from Parte Diario)
            const fullDesc = String(item.descripcion_labor).trim();
            if (!laboresMap.has(fullDesc)) { // Check if it's already added as a code or description
                laboresMap.set(fullDesc, {
                    cod: fullDesc, // Use full description as the key/code
                    descripcion_labor: fullDesc,
                    displayLabel: fullDesc
                });
            }
        }
    });

    // Convert map values to array and sort
    return Array.from(laboresMap.values()).sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
  }, [ganttRawData, parteDiarioRawData]);


  const getFilteredDataForNextLevel = (currentData, currentFilters, laborOptions) => {
    let data = [...currentData];
    // Convert filter dates to startOfDay and endOfDay for inclusive range checking
    const startDate = currentFilters.fecha_inicio ? startOfDay(parseISO(currentFilters.fecha_inicio)) : null;
    const endDate = currentFilters.fecha_fin ? endOfDay(parseISO(currentFilters.fecha_fin)) : null;

    if (startDate && endDate) {
        data = data.filter(item => {
            const itemDate = parseISO(item.fecha_norm);
            return isValid(itemDate) && itemDate >= startDate && itemDate <= endDate;
        });
    }
    
    if (currentFilters.labor) {
        // currentFilters.labor is the `cod` or full description used as key from uniqueLabores
        const selectedCodeOrDescKey = currentFilters.labor;
        const selectedLaborOption = laborOptions.find(l => l.cod === selectedCodeOrDescKey);
        
        // Ensure filterLaborDescription is always a lowercase string for comparison
        const filterLaborDescriptionLower = (selectedLaborOption ? selectedLaborOption.descripcion_labor : selectedCodeOrDescKey || '').toLowerCase();

        data = data.filter(item => {
            // Convert item's labor properties to lowercase strings for safe comparison
            const itemGanttCod = String(item.cod || '');
            const itemGanttLaborDesc = String(item.labor || '').toLowerCase();
            const itemParteDiarioDescRaw = String(item.descripcion_labor || ''); // Keep raw for extraction

            // Extract code and description from Parte Diario's description, if applicable
            const { code: itemParteDiarioExtractedCode, description: itemParteDiarioExtractedDescription } = extractLaborDetails(itemParteDiarioDescRaw);
            const itemParteDiarioDescLower = String(itemParteDiarioExtractedDescription || '').toLowerCase();

            // Match logic:
            // 1. Match by selected CODE (if item is Gantt's `cod` or Parte Diario's extracted code)
            const codeMatches = (itemGanttCod === selectedCodeOrDescKey) || 
                                (itemParteDiarioExtractedCode === selectedCodeOrDescKey);

            // 2. Match by clean description (for both Gantt's `labor` and Parte Diario's extracted description)
            const descriptionMatches = (filterLaborDescriptionLower && itemGanttLaborDesc === filterLaborDescriptionLower) ||
                                       (filterLaborDescriptionLower && itemParteDiarioDescLower === filterLaborDescriptionLower);
            
            // Also consider matching if the selected key (code) is present in the raw description
            const rawDescriptionCodeMatch = itemParteDiarioDescRaw.startsWith(`${selectedCodeOrDescKey} -`);

            return codeMatches || descriptionMatches || rawDescriptionCodeMatch;
        });
    }

    if (currentFilters.lote) {
        data = data.filter(item => String(item.lote || '') === String(currentFilters.lote || ''));
    }
    if (currentFilters.responsable) {
        data = data.filter(item => String(item.responsable || '') === String(currentFilters.responsable || ''));
    }
    return data;
  };


  useEffect(() => {
    // This part filters the Gantt data for the main table and the personnelByLabor chart
    let dataToFilterAndSort = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);
    
    if (sortConfig.key) {
      dataToFilterAndSort.sort((a, b) => {
        let valA = a[sortConfig.key]; let valB = b[sortConfig.key]; const numA = parseFloat(valA); const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) { valA = numA; valB = numB; } else { valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase(); }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1; return 0;
      });
    }
    setFilteredAndSortedData(dataToFilterAndSort);
  }, [ganttRawData, filters, sortConfig, uniqueLabores]); // uniqueLabores is a dependency for this useEffect


  const handleSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
  const getSortIndicator = (key) => { if (sortConfig.key === key) { return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up ms-1"></i> : <i className="bi bi-sort-down ms-1"></i>; } return <i className="bi bi-arrow-down-up ms-1 opacity-25"></i>; };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, [name]: value };
      return newFilters;
    });
  };


  const uniqueLotes = useMemo(() => {
    // Combine unique lotes from both gantt and parte diario for the filter dropdown
    const ganttLotes = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores); 
    const parteDiarioLotes = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores); 
    
    const combinedLotes = new Set();
    ganttLotes.forEach(item => item.lote && combinedLotes.add(item.lote));
    parteDiarioLotes.forEach(item => item.lote && combinedLotes.add(item.lote));

    return [...combinedLotes].sort();
  }, [ganttRawData, parteDiarioRawData, filters, uniqueLabores]);

  const uniqueResponsables = useMemo(() => {
    // Responsible is typically from Gantt data
    const data = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores); 
    return [...new Set(data.map(item => item.responsable).filter(Boolean))].sort();
  }, [ganttRawData, filters, uniqueLabores]);

  const totalPersonnelSummary = useMemo(() => {
    // This filteredAndSortedData already accounts for all filters, including date, labor, lote, responsable from Gantt
    return filteredAndSortedData.reduce((sum, item) => sum + item.personas, 0);
  }, [filteredAndSortedData]);


  // NUEVO: Asistencia por Jefe de Campo (Real) - GRÁFICO DE BARRAS
  const personnelByJefeCampoChartData = useMemo(() => {
    const summary = {};
    const uniquePersonnelPerDay = {};
    
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores); // Apply all filters
    
    filteredData.forEach(item => {
        if (!item.fecha_norm || !item.dni || !item.jefe_campo) return;
        
        const key = `${item.fecha_norm}-${item.dni}`; // Key for unique person per day
        if (!uniquePersonnelPerDay[key]) {
            uniquePersonnelPerDay[key] = {
                jefe_campo: item.jefe_campo
            };
        }
    });
    
    Object.values(uniquePersonnelPerDay).forEach(entry => {
        const jefeCampo = entry.jefe_campo;
        summary[jefeCampo] = (summary[jefeCampo] || 0) + 1;
    });

    const sortedEntries = Object.entries(summary).sort(([, a], [, b]) => b - a);
    const labels = sortedEntries.map(([jefeCampo, ]) => jefeCampo);
    const data = sortedEntries.map(([, count]) => count);

    return {
      labels,
      datasets: [{
        type: 'bar',
        label: 'Personas Únicas',
        backgroundColor: metallicColors.blue, // Using a blue color for this bar chart
        data: data,
      }]
    };
  }, [parteDiarioRawData, filters, uniqueLabores]); // Depend on all filters including uniqueLabores


  // NUEVO: Asistencia por Fundo (Real) - GRÁFICO DE BARRAS
  const personnelByFundoChartData = useMemo(() => {
    const summary = {};
    const uniquePersonnelPerDayFundo = {};
    
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores); // Apply all filters

    filteredData.forEach(item => {
        if (!item.fecha_norm || !item.dni || !item.fundo) return;

        const key = `${item.fecha_norm}-${item.dni}`; // Key for unique person per day and fundo
        if (!uniquePersonnelPerDayFundo[key]) {
            uniquePersonnelPerDayFundo[key] = {
                fundo: item.fundo
            };
        }
    });
    
    const fundoCounts = {};
    Object.values(uniquePersonnelPerDayFundo).forEach(entry => {
        const fundo = entry.fundo;
        fundoCounts[fundo] = (fundoCounts[fundo] || 0) + 1;
    });

    const sortedEntries = Object.entries(fundoCounts).sort(([, a], [, b]) => b - a);
    const labels = sortedEntries.map(([fundo, ]) => fundo);
    const data = sortedEntries.map(([, count]) => count);

    return {
      labels,
      datasets: [{
        type: 'bar',
        label: 'Personas Únicas',
        backgroundColor: metallicColors.purple, // Using a purple color for this bar chart
        data: data,
      }]
    };
  }, [parteDiarioRawData, filters, uniqueLabores]); // Depend on all filters including uniqueLabores


  const personnelByLabor = useMemo(() => {
    const summary = {};
    
    // This filteredAndSortedData already accounts for all filters, including date, labor, lote, responsable from Gantt
    filteredAndSortedData.forEach(item => {
      if (item.labor) { // item.labor is from Gantt
        summary[item.labor] = (summary[item.labor] || 0) + item.personas;
      }
    });
    const sortedEntries = Object.entries(summary).sort(([, a], [, b]) => b - a);
    const top4Labors = sortedEntries.slice(0, 4);
    const otherLaborsSum = sortedEntries.slice(4).reduce((sum, [, count]) => sum + count, 0);
    const labels = top4Labors.map(([label,]) => label);
    const data = top4Labors.map(([, data]) => data);
    if (otherLaborsSum > 0) {
      labels.push('Otras Labores');
      data.push(otherLaborsSum);
    }
    return { labels, data };
  }, [filteredAndSortedData]); // This only depends on filteredAndSortedData now

  const personnelByLoteLabor = useMemo(() => {
    const loteLaborMap = {};
    const loteTotals = {};
    
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores); // Apply all filters
    
    filteredData.forEach(item => {
      if (!item.lote || !item.descripcion_labor || !item.dni) return; 
      
      if (!loteLaborMap[item.lote]) {
        loteLaborMap[item.lote] = {};
      }
      loteLaborMap[item.lote][item.descripcion_labor] = (loteLaborMap[item.lote][item.descripcion_labor] || 0) + 1;

      // For lote totals, count unique DNI per lote for the entire filtered period
      if (!loteTotals[item.lote]) loteTotals[item.lote] = new Set();
      loteTotals[item.lote].add(item.dni); 
    });

    const uniqueLaborsAcrossAllLotes = [...new Set(filteredData.map(item => item.descripcion_labor).filter(Boolean))].sort();

    // Order lotes by the REAL total of unique people per lote (summing the sets)
    const sortedLotesWithTotals = Object.keys(loteTotals).map(lote => ({
        lote,
        total: loteTotals[lote].size
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    const sortedLotes = sortedLotesWithTotals.map(item => item.lote);

    const colors = [
        metallicColors.green, metallicColors.blue, metallicColors.purple,
        metallicColors.teal, metallicColors.orange, metallicColors.red,
        metallicColors.yellow, metallicColors.gray, metallicColors.lightgray,
        'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)',
    ];
    let colorIndex = 0;

    const datasets = uniqueLaborsAcrossAllLotes.map(laborName => {
        const data = sortedLotes.map(lote => loteLaborMap[lote]?.[laborName] || 0);
        const backgroundColor = colors[colorIndex % colors.length];
        colorIndex++;
        return {
            label: laborName,
            data: data,
            backgroundColor: backgroundColor,
        };
    });

    // Add a dataset for total lote labels (not visible as a bar)
    datasets.push({
        label: 'Total Lote',
        data: sortedLotesWithTotals.map(item => item.total), 
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(0,0,0,0)',
        hoverBackgroundColor: 'rgba(0,0,0,0)',
        hoverBorderColor: 'rgba(0,0,0,0)',
        datalabels: {
            align: 'end',
            anchor: 'end',
            offset: 4,
            color: textClassGlobal,
            font: {
                weight: 'bold',
                size: 9
            },
            formatter: (value) => value > 0 ? value : '',
            display: (context) => {
                return showDataLabels && context.dataset.label === 'Total Lote'; 
            },
            backgroundColor: 'transparent',
            borderRadius: 4,
            padding: 4
        },
        stack: 'total_labels',
        order: 0, 
    });

    return {
      labels: sortedLotes,
      datasets: datasets,
    };
  }, [parteDiarioRawData, showDataLabels, filters, uniqueLabores]); // Depend on all filters including uniqueLabores

  const combinedGanttAttendanceData = useMemo(() => {
    const dailyData = {};
    const todayFormatted = getTodayDate(); // "2025-06-11"
    const todayAsDate = parseISO(todayFormatted);

    const startDate = filters.fecha_inicio ? startOfDay(parseISO(filters.fecha_inicio)) : null;
    const endDate = filters.fecha_fin ? endOfDay(parseISO(filters.fecha_fin)) : null;

    // Apply all filters to Gantt data
    const filteredGantt = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);

    // Apply all filters to Parte Diario data
    const filteredParteDiario = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);

    filteredGantt.forEach(item => {
        const dateKey = item.fecha_norm; 
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = { gantt: 0, attendance: 0 };
        }
        dailyData[dateKey].gantt += item.personas;
    });

    const uniqueDniPerDay = {};
    filteredParteDiario.forEach(item => {
        const dateKey = item.fecha_norm; 
        if (!item.fecha_norm || !item.dni) return;
        if (!uniqueDniPerDay[dateKey]) {
            uniqueDniPerDay[dateKey] = new Set();
        }
        uniqueDniPerDay[dateKey].add(item.dni);
    });

    Object.keys(uniqueDniPerDay).forEach(date => {
        if (!dailyData[date]) {
            dailyData[date] = { gantt: 0, attendance: 0 };
        }
        dailyData[date].attendance = uniqueDniPerDay[date].size;
    });

    // Generate all dates in the range, even if no data
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

    // Prepare data for trendline: only use historical data (up to today)
    const trendlineDataPoints = [];
    labels.forEach((dateString, index) => {
        const date = parseISO(dateString);
        if (date <= todayAsDate) { // Only include data up to and including today
            trendlineDataPoints.push({ x: dateString, y: attendancePersonnel[index] });
        } else {
            // For future dates, the trendline needs to project, but the raw data for calculation stops at today
            // We pass null for y values for future dates so trendline plugin handles projection from last real point
            trendlineDataPoints.push({ x: dateString, y: null });
        }
    });


    return {
        labels,
        datasets: [
            {
                type: 'bar',
                label: 'Personas Pedidas (Gantt)',
                backgroundColor: metallicColors.blue,
                data: ganttPersonnel,
                yAxisID: 'y',
                order: 2,
            },
            {
                type: 'line',
                label: 'Personas Asistentes (Real)',
                borderColor: 'rgba(25, 135, 84, 0.6)', // Color un poco más claro (0.6 en lugar de 0.9)
                backgroundColor: 'rgba(0,0,0,0)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(25, 135, 84, 0.6)',
                data: attendancePersonnel,
                yAxisID: 'y',
                order: 1,
                tension: 0.3,
            },
            {
                type: 'line', // New dataset for the trendline
                label: 'Tendencia de Asistencia',
                borderColor: 'rgba(255,193,7,0.8)', // Amarillo
                backgroundColor: 'rgba(0,0,0,0)',
                borderWidth: 2,
                borderDash: [5, 5], // Línea punteada
                pointRadius: 0, // No mostrar puntos para la tendencia
                data: trendlineDataPoints, // Data for trendline calculation
                trendlineLinear: { // Plugin configuration for trendline
                    style: 'rgba(255,193,7,0.8)',
                    lineStyle: 'dotted', // Use dotted for distinction
                    width: 2,
                    projection: true, // Enable projection to future dates
                },
                fill: false, // No rellenar área bajo la línea
                yAxisID: 'y',
                order: 0, // Dibuja la tendencia debajo de los otros datasets si es necesario
            }
        ],
    };
  }, [ganttRawData, parteDiarioRawData, filters, uniqueLabores]); // Depend on uniqueLabores

  // Asistencia real por día (Bar Chart)
  const dailyActualAttendanceData = useMemo(() => {
    const dailyCounts = {};
    const startDate = filters.fecha_inicio ? startOfDay(parseISO(filters.fecha_inicio)) : null;
    const endDate = filters.fecha_fin ? endOfDay(parseISO(filters.fecha_fin)) : null;

    const filteredParteDiario = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores); // Apply all filters

    filteredParteDiario.forEach(item => {
      if (item.fecha_norm && item.dni) {
        const dateKey = item.fecha_norm;
        if (!dailyCounts[dateKey]) {
          dailyCounts[dateKey] = new Set();
        }
        dailyCounts[dateKey].add(item.dni);
      }
    });

    // Generate all dates in the range, even if no data
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

    return {
      labels,
      datasets: [{
        type: 'bar',
        label: 'Asistencia Diaria (Real)',
        backgroundColor: metallicColors.teal,
        data: data,
      }]
    };
  }, [parteDiarioRawData, filters, uniqueLabores]); // Depend on uniqueLabores

  // Top 5 Labores (Asistencia Real - Bar Chart)
  const top5LaborsActualData = useMemo(() => {
    const laborCounts = {};
    
    const filteredData = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores); // Apply all filters

    filteredData.forEach(item => {
      if (item.descripcion_labor && item.dni) {
        if (!laborCounts[item.descripcion_labor]) {
          laborCounts[item.descripcion_labor] = new Set();
        }
        laborCounts[item.descripcion_labor].add(item.dni);
      }
    });

    const sortedLabors = Object.entries(laborCounts)
                            .map(([labor, dnis]) => ({ labor, count: dnis.size }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 5);

    const labels = sortedLabors.map(item => item.labor);
    const data = sortedLabors.map(item => item.count);

    return {
      labels,
      datasets: [{
        type: 'bar',
        label: 'Personas Únicas',
        backgroundColor: metallicColors.orange,
        data: data,
      }]
    };
  }, [parteDiarioRawData, filters, uniqueLabores]); // Depend on uniqueLabores


  // Top 5 Lotes (Gantt vs Actual) - Comparación entre dos datasets
  const top5LotesComparisonData = useMemo(() => {
    const loteData = {};
    
    // Apply all filters to Gantt data
    const filteredGanttData = getFilteredDataForNextLevel(ganttRawData, filters, uniqueLabores);
    // Apply all filters to Parte Diario data
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

    const combinedLotes = Object.entries(loteData)
                                .map(([lote, data]) => ({ lote, gantt: data.gantt, actual: data.actual.size }))
                                .sort((a, b) => (b.gantt + b.actual) - (a.gantt + a.actual))
                                .slice(0, 5);

    const labels = combinedLotes.map(item => item.lote);
    const ganttData = combinedLotes.map(item => item.gantt);
    const actualData = combinedLotes.map(item => item.actual);

    return {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Pedidas (Gantt)',
          backgroundColor: metallicColors.blue,
          data: ganttData,
          order: 2,
          categoryPercentage: 0.6,
          barPercentage: 0.8,
        },
        {
          type: 'bar',
          label: 'Asistentes (Real)',
          backgroundColor: metallicColors.green,
          data: actualData,
          order: 1,
          categoryPercentage: 0.6,
          barPercentage: 0.8,
        }
      ]
    };

  }, [ganttRawData, parteDiarioRawData, filters, uniqueLabores]); // Depend on uniqueLabores


  const commonChartOptions = (title, yAxisLabel = '', customOptions = {}) => ({
    responsive: true, maintainAspectRatio:false,
    plugins: {
        legend: { display: customOptions.showLegend !== undefined ? customOptions.showLegend : true, position: customOptions.legendPosition || 'top', labels:{color:textClassGlobal, boxWidth:10, padding:8, font:{size:9} } },
        title: { display: !!title, text: title, color:textClassGlobal, font:{size:11, weight:'bold'} },
        datalabels: { display: showDataLabels, anchor:'end', align:'top', color:textClassGlobal, font:{weight:'bold', size:9}, formatter:(value)=>value }
    },
    scales: { x:{ ticks:{color:textClassGlobal, font:{size:9}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal} }, y:{ ticks:{color:textClassGlobal, font:{size:9}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal}, title: {display: !!yAxisLabel, text:yAxisGlobal, color:textClassGlobal, font:{size:9}} } },
    ...customOptions?.nativeOptions
  });

  const pieChartOptions = (titleText) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: textClassGlobal, boxWidth: 10, padding: 8, font: { size: 9 } },
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
          if (!bgColor || typeof bgColor !== 'string') return 'rgb(240,240,240)';
          const rgba = bgColor.match(/\d+/g);
          if (!rgba || rgba.length < 3) return 'rgb(240,240,240)';
          const r = parseInt(rgba[0], 10);
          const g = parseInt(rgba[1], 10);
          const b = parseInt(rgba[2], 10);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          return brightness > 125 ? 'rgb(20,20,20)' : 'rgb(240,240,240)';
        },
        font: { weight: 'bold', size: 10 },
        formatter: (value, ctx) => {
          let sum = 0;
          let dataArr = ctx.chart.data.datasets[0].data;
          dataArr.forEach((data) => { sum += data; });
          return sum > 0 ? ((value * 100) / sum).toFixed(1) + '%' : '0.0%';
        },
        backgroundColor: (context) => {
            const bgColor = context.dataset.backgroundColor[context.dataIndex];
            if (!bgColor || typeof bgColor !== 'string') return 'rgba(0,0,0,0.7)';
            const rgba = bgColor.match(/\d+/g);
            if (!rgba || rgba.length < 3) return 'rgba(0,0,0,0.7)';
            const r = parseInt(rgba[0], 10);
            const g = parseInt(rgba[1], 10);
            const b = parseInt(rgba[2], 10);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness > 125) {
                return `rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.7)`;
            } else {
                return `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, 0.7)`;
            }
        },
        borderRadius: 4,
        padding: 4,
      },
    },
  });

  const stackedBarOptions = (title, yAxisLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 1.8,
    plugins: {
        legend: { display: false },
        title: { display: !!title, text: title, color:textClassGlobal, font:{size:11, weight:'bold'} },
        datalabels: {
            display: (context) => context.dataset.label === 'Total Lote' && showDataLabels, // Show only for 'Total Lote' dataset
            anchor: 'end',
            align: 'top',
            offset: 4,
            color: textClassGlobal,
            font: {
                weight: 'bold',
                size: 9
            },
            formatter: (value) => value > 0 ? value : '',
            backgroundColor: (context) => {
                const totalColor = darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                return totalColor;
            },
            borderRadius: 4,
            padding: 4
        }
    },
    scales: {
      x: { ticks:{color:textClassGlobal, font:{size:8}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal}, stacked:true },
      y: { ticks:{color:textClassGlobal, font:{size:9}}, grid:{color:gridColorGlobal, borderColor:gridColorGlobal}, title: {display: !!yAxisLabel, text:yAxisLabel, color:textClassGlobal, font:{size:9}}, stacked:true }
    }
  });

  const combinedChartOptions = (titleText) => ({
    responsive: true,
    maintainAspectRatio: false,
    height: 350,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textClassGlobal, boxWidth: 10, padding: 8, font: { size: 9 } },
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
        display: (context) => showDataLabels && context.dataset.data[context.dataIndex] > 0,
        color: (context) => {
            const dataset = context.dataset;
            if (dataset.type === 'bar') {
                return (dataset.backgroundColor && typeof dataset.backgroundColor === 'string' &&
                        (dataset.backgroundColor.match(/\d+/g) && ((parseInt(dataset.backgroundColor.match(/\d+/g)[0]) * 299 + parseInt(dataset.backgroundColor.match(/\d+/g)[1]) * 587 + parseInt(dataset.backgroundColor.match(/\d+/g)[2]) * 114) / 1000 > 125))) ? 'rgb(20,20,20)' : 'rgb(240,240,240)';
            } else if (dataset.type === 'line') {
                return (dataset.borderColor && typeof dataset.borderColor === 'string' &&
                        (dataset.borderColor.match(/\d+/g) && ((parseInt(dataset.borderColor.match(/\d+/g)[0]) * 299 + parseInt(dataset.borderColor.match(/\d+/g)[1]) * 587 + parseInt(dataset.borderColor.match(/\d+/g)[2]) * 114) / 1000 > 125))) ? 'rgb(20,20,20)' : 'rgb(240,240,240)';
            }
            return textClassGlobal;
        },
        font: { weight: 'bold', size: 9 },
        formatter: (value) => value > 0 ? value : '',
        backgroundColor: (context) => {
            const dataset = context.dataset;
            if (dataset.type === 'bar') {
                return dataset.backgroundColor.replace('0.9', '0.7');
            } else if (dataset.type === 'line') {
                return dataset.borderColor.replace('0.9', '0.7');
            }
            return 'rgba(0,0,0,0.7)';
        },
        borderRadius: 4,
        padding: 4,
        anchor: (context) => context.dataset.type === 'bar' ? 'end' : 'end',
        align: (context) => context.dataset.type === 'bar' ? 'top' : 'top',
        offset: (context) => context.dataset.type === 'bar' ? 4 : 8,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'dd MMM CCCC',
          displayFormats: {
            day: 'EEE dd/MM'
          },
          parser: 'yyyy-MM-dd',
          // Set min and max directly from filters, if valid
          min: filters.fecha_inicio && isValid(parseISO(filters.fecha_inicio)) ? filters.fecha_inicio : undefined,
          max: filters.fecha_fin && isValid(parseISO(filters.fecha_fin)) ? filters.fecha_fin : undefined,
        },
        adapters: {
          date: {
            locale: es
          }
        },
        ticks: {
            color: textClassGlobal,
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 45,
        },
        grid: { color: gridColorGlobal, borderColor: gridColorGlobal },
      },
      y: {
        ticks: { color: textClassGlobal, font: { size: 9 } },
        grid: { color: gridColorGlobal, borderColor: gridColorGlobal },
        title: { display: true, text: 'Nº de Personas', color: textClassGlobal, font: { size: 9 } },
        beginAtZero: true,
      },
    },
  });

  const newChartsCommonOptions = (title, yAxisLabel, customOptions = {}) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
        legend: { display: customOptions.showLegend !== undefined ? customOptions.showLegend : true, position: customOptions.legendPosition || 'top', labels:{color:textClassGlobal, boxWidth:10, padding:8, font:{size:9} } },
        title: { display: !!title, text: title, color:textClassGlobal, font:{size:11, weight:'bold'} },
        datalabels: { 
            display: showDataLabels, 
            anchor:'end', 
            align:'top', 
            color:textClassGlobal, 
            font:{weight:'bold', size:9}, 
            formatter:(value)=>value > 0 ? value : '',
            offset: customOptions.datalabelsOffset || 4, // Allow custom offset, default 4
        }
    },
    scales: { 
      x:{ 
        ticks:{color:textClassGlobal, font:{size:9}}, 
        grid:{color:gridColorGlobal, borderColor:gridColorGlobal},
        type: customOptions.timeScale ? 'time' : 'category',
        time: customOptions.timeScale ? {
          unit: 'day',
          tooltipFormat: 'dd MMM CCCC',
          displayFormats: { day: 'EEE dd/MM' },
          parser: 'yyyy-MM-dd',
          // Set min and max directly from filters, if valid
          min: filters.fecha_inicio && isValid(parseISO(filters.fecha_inicio)) ? filters.fecha_inicio : undefined,
          max: filters.fecha_fin && isValid(parseISO(filters.fecha_fin)) ? filters.fecha_fin : undefined,
        } : undefined,
        adapters: customOptions.timeScale ? { date: { locale: es } } : undefined,
      }, 
      y:{ 
        ticks:{color:textClassGlobal, font:{size:9}}, 
        grid:{color:gridColorGlobal, borderColor:gridColorGlobal}, 
        title: {display: !!yAxisLabel, text:yAxisLabel, color:textClassGlobal, font:{size:9}},
        beginAtZero: true,
        // Add suggestedMax for extra top padding, if provided
        suggestedMax: customOptions.suggestedYMax, 
      } 
    },
    ...customOptions?.nativeOptions
  });

    // Tacómetro (Cumplimiento % de Asistencia)
  const complianceData = useMemo(() => {
    // Calculamos el total de personas asistentes reales basándonos en los datos filtrados
    // para asegurar que el tacómetro refleje el cumplimiento del rango de fechas y otros filtros.
    const filteredParteDiarioForCompliance = getFilteredDataForNextLevel(parteDiarioRawData, filters, uniqueLabores);
    const totalAsistentes = new Set(filteredParteDiarioForCompliance.map(item => item.dni)).size;

    // totalPersonnelSummary ya considera los filtros de Gantt.
    const totalPedidos = totalPersonnelSummary; 

    let percentage = 0;
    if (totalPedidos > 0) {
      percentage = (totalAsistentes / totalPedidos) * 100;
    } else if (totalAsistentes > 0) {
      percentage = 100; // Si no se pidió nada pero asistió gente, se considera 100% de cumplimiento.
    }

    // Asegurar que el porcentaje para la representación visual no exceda el 100%
    const complianceSegment = Math.min(percentage, 100); 
    const remainingSegment = 100 - complianceSegment;

    const backgroundColor = [];
    if (percentage >= 90) {
        backgroundColor.push(metallicColors.green); // Alto cumplimiento
    } else if (percentage >= 70) {
        backgroundColor.push(metallicColors.yellow); // Cumplimiento moderado
    } else {
        backgroundColor.push(metallicColors.red); // Bajo cumplimiento
    }
    backgroundColor.push(darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'); // Color para el resto del círculo

    return {
      percentage: percentage.toFixed(1), // Para mostrar en el centro del tacómetro
      labels: ['Cumplimiento', 'Restante'],
      datasets: [{
        data: [complianceSegment, remainingSegment],
        backgroundColor: backgroundColor,
        borderColor: darkMode ? '#212529' : '#fff',
        borderWidth: 1,
      }],
      totalAsistentes: totalAsistentes, // Pasar los totales para las etiquetas
      totalPedidos: totalPedidos
    };
  }, [totalPersonnelSummary, parteDiarioRawData, filters, uniqueLabores, darkMode]);


  const exportToExcel = () => {
    const dataToExport = filteredAndSortedData.map(item => ({
      'FECHA': item.fecha_norm,
      'CODIGO LABOR': item.cod,
      'LABOR': item.labor,
      'RESPONSABLE': item.responsable,
      'LOTE': item.lote,
      'TURNO': item.turno,
      'TRABAJO': item.trabajo,
      'PRECIO': item.precio,
      'PRODUCCION': item.prod,
      'PROD. MIN': item.min,
      'PROD. MAX': item.max,
      'PERSONAS': item.personas,
      'SEMANA': item.semana,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AsistenciaGantt");
    XLSX.writeFile(workbook, "AsistenciaGantt.xlsx");
  };

  const displayedData = useMemo(() => {
    if (rowsPerPage === 'Todas') return filteredAndSortedData;
    return filteredAndSortedData.slice(0, parseInt(rowsPerPage, 10));
  }, [filteredAndSortedData, rowsPerPage]);

  const pieChartLaborData = {
    labels: personnelByLabor.labels,
    datasets: [{
      data: personnelByLabor.data,
      backgroundColor: personnelByLabor.labels.map((_, i) => metallicColors[['green', 'blue', 'purple', 'teal', 'orange', 'red', 'yellow', 'gray', 'lightgray'][i % 9]]),
      borderColor: darkMode ? '#212529' : '#fff',
      borderWidth: 2,
    }]
  };

  const formattedFechaInicio = filters.fecha_inicio ? format(parseISO(filters.fecha_inicio), 'dd/MM/yyyy') : '';
  const formattedFechaFin = filters.fecha_fin ? format(parseISO(filters.fecha_fin), 'dd/MM/yyyy') : '';

  if (loading) return <div className="container-fluid text-center py-5"><div className={`spinner-border ${textClassGlobal}`} style={{ width: '3rem', height: '3rem' }} role="status"><span className="visually-hidden">Cargando...</span></div></div>;
  if (error) return <div className={`container-fluid alert alert-danger mt-4 ${darkMode ? 'text-white bg-danger border-danger' : ''}`} role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i>Error: {error}</div>;

  return (
    <Fragment>
      <style>{`
        .tabla-attendance th {
          cursor: pointer; white-space: normal !important; word-break: break-word !important;
          vertical-align: middle; text-align: center;
          position: sticky; top: 0; z-index: 1;
          background-color: ${cardBgGlobal};
          border-right: 1px solid ${gridColorGlobal};
          border-bottom: 2px solid ${gridColorGlobal};
        }
        .tabla-attendance td {
          font-size: 0.70rem !important;
          padding: 0.2rem 0.25rem !important;
          white-space: nowrap;
          border-right: 1px solid ${gridColorGlobal};
        }
        .tabla-attendance tr th:first-child, .tabla-attendance tr td:first-child { border-left: 1px solid ${gridColorGlobal};}
        .tabla-attendance tr th:last-child, .tabla-attendance tr td:last-child { border-right: 1px solid ${gridColorGlobal}; }
        .tabla-attendance .text-numeric { text-align: center; }
        .table-responsive-custom-height { max-height: ${rowsPerPage === 'Todas' ? 'none' : '450px'}; overflow-y: auto; }
        .attendance-card-mobile { font-size: 0.75rem; }
        .attendance-card-mobile .card-title { font-size: 0.9rem; margin-bottom: 0.5rem; }
        .attendance-card-mobile .card-text { margin-bottom: 0.2rem; font-size: 0.7rem; }
        .attendance-card-mobile .card-text strong { min-width: 110px; display: inline-block; }
      `}</style>

      <div aria-live="polite" aria-atomic="true" className="position-relative">
        <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
          {showWelcomeToast && (
            <div className={`toast align-items-center ${darkMode ? 'text-white bg-dark-custom border-secondary' : 'text-dark bg-light-custom border-primary'}`} role="alert" aria-live="assertive" aria-atomic="true" >
              <div className="d-flex">
                <div className="toast-body">
                  ¡Hola, <strong>{nombre}</strong>! Bienvenido/a de nuevo. Tu rol es: <strong>{rol}</strong>.
                </div>
                <button
                  type="button"
                  className={`btn-close me-2 m-auto ${darkMode ? 'btn-close-white' : ''}`}
                  data-bs-dismiss="toast"
                  aria-label="Cerrar"
                  onClick={() => setShowWelcomeToast(false)}
                ></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h1 className={`${textClassGlobal} h3`}>Bienvenido, {nombre} | Asistencia de {formattedFechaInicio} a {formattedFechaFin}</h1>
        <div className="d-flex align-items-center">
            <button className={`${buttonSecondaryClass} me-2`} onClick={() => setShowDataLabels(!showDataLabels)} title="Mostrar/Ocultar etiquetas en gráficos"> <i className={`bi ${showDataLabels ? 'bi-tag-fill' : 'bi-tag'}`}></i> {showDataLabels ? 'Ocultar' : 'Mostrar'} Etqt. </button>
            <button className={buttonSecondaryClass} onClick={exportToExcel} disabled={filteredAndSortedData.length === 0}> <i className="bi bi-file-earmark-excel-fill me-2"></i>Exportar </button>
        </div>
      </div>

      {/* Nueva Fila para Filtros y Tacómetro */}
      <div className="row mb-3">
          {/* Panel de Filtros - Encogido */}
          <div className="col-lg-8 col-md-12"> {/* Ocupa 8 columnas en pantallas grandes */}
            <div className={cardClass}> 
                <div className="card-body"> 
                    <h5 className="card-title mb-3">Filtros</h5>
                    <div className="row g-2">
                        {/* Primera fila de filtros */}
                        <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Fecha Inicio:</label> <input type="date" name="fecha_inicio" className={inputBgClass} value={filters.fecha_inicio} onChange={handleFilterChange} /> </div>
                        <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Fecha Fin:</label> <input type="date" name="fecha_fin" className={inputBgClass} value={filters.fecha_fin} onChange={handleFilterChange} /> </div>
                        <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Lote:</label> <select name="lote" className={inputBgClass} value={filters.lote} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueLotes.map(l => <option key={l} value={l}>{l}</option>)} </select> </div>
                        
                        {/* Segunda fila de filtros */}
                        <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Labor:</label> <select name="labor" className={inputBgClass} value={filters.labor} onChange={handleFilterChange}> <option value="">Todas</option> {uniqueLabores.map(l => <option key={l.cod} value={l.cod}>{l.displayLabel}</option>)} </select> </div>
                        <div className="col-lg-4 col-md-4 col-sm-6"> <label className="form-label form-label-sm">Responsable (Gantt):</label> <select name="responsable" className={inputBgClass} value={filters.responsable} onChange={handleFilterChange}> <option value="">Todos</option> {uniqueResponsables.map(e => <option key={e} value={e}>{e}</option>)} </select> </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Tacómetro */}
          <div className="col-lg-4 col-md-12 mt-3 mt-lg-0"> {/* Ocupa 4 columnas en pantallas grandes */}
            <div className={`${cardClass} h-100`}>
              <div className="card-body d-flex flex-column justify-content-center align-items-center position-relative">
                <h5 className="card-title text-center mb-3" style={{fontSize:'1rem'}}>Cumplimiento de Asistencia</h5>
                {(complianceData.totalAsistentes || complianceData.totalPedidos) > 0 ? ( // Check if there's any data to show
                    <div style={{ position: 'relative', width: '100%', maxWidth: '250px', height: '150px' }}> {/* Ajusta tamaño para tacómetro */}
                      <Pie 
                        data={complianceData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          circumference: 180, // Semicírculo
                          rotation: -90, // Inicia desde la izquierda
                          cutout: '70%', // Grosor del anillo
                          plugins: {
                            legend: { display: false }, // Ocultar leyenda
                            tooltip: { enabled: false }, // Ocultar tooltip
                            datalabels: { display: false }, // Ocultar datalabels predeterminados
                          },
                          animation: {
                            animateRotate: true,
                            animateScale: true,
                          },
                        }} 
                        key="compliance-gauge-chart" 
                      />
                      <div className="position-absolute top-50 start-50 translate-middle" style={{ textAlign: 'center', marginTop: '20px' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: textClassGlobal }}>
                            {complianceData.percentage}%
                        </span>
                        <p className={secondaryTextGlobal} style={{fontSize:'0.75rem', marginBottom:0}}>
                            {complianceData.totalAsistentes} de {complianceData.totalPedidos} personas
                        </p>
                      </div>
                    </div>
                ) : (
                    <p className="text-center fst-italic my-auto">No hay datos para el tacómetro.</p>
                )}
              </div>
            </div>
          </div>
      </div>


      {/* Fila 1 de Gráficos (Orden de Importancia: 1-3) */}
      <div className="row mb-3">
          {/* 1. Asistencia por Jefe de Campo (Real) - GRÁFICO DE BARRAS */}
          <div className="col-lg-4 col-md-6">
            <div className={`${cardClass} h-100`}>
              <div className="card-header"><h6 className="mb-0">Asistencia por Jefe de Campo (Real)</h6></div>
              <div className="card-body d-flex flex-column justify-content-center">
                {personnelByJefeCampoChartData.labels.length > 0 && personnelByJefeCampoChartData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                  <div style={{ maxHeight:'350px' }}>
                    <Bar data={personnelByJefeCampoChartData} options={newChartsCommonOptions('Asistencia por Jefe de Campo (Real)', 'Nº Personas', { showLegend: false, datalabelsOffset: 8, suggestedYMax: Math.max(...personnelByJefeCampoChartData.datasets[0].data) * 1.2 })} key="jefe-campo-chart" />
                  </div>
                ) : (
                  <p className="text-center fst-italic my-auto">No hay datos de asistencia por Jefe de Campo.</p>
                )}
              </div>
            </div>
          </div>
          {/* 2. Asistencia por Fundo (Real) - GRÁFICO DE BARRAS */}
          <div className="col-lg-4 col-md-6">
            <div className={`${cardClass} h-100`}>
              <div className="card-header"><h6 className="mb-0">Asistencia por Fundo (Real)</h6></div>
              <div className="card-body d-flex flex-column justify-content-center">
                {personnelByFundoChartData.labels.length > 0 && personnelByFundoChartData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                  <div style={{ maxHeight:'350px' }}>
                    <Bar data={personnelByFundoChartData} options={newChartsCommonOptions('Asistencia por Fundo (Real)', 'Nº Personas', { showLegend: false, datalabelsOffset: 8, suggestedYMax: Math.max(...personnelByFundoChartData.datasets[0].data) * 1.2 })} key="fundo-chart" />
                  </div>
                ) : (
                  <p className="text-center fst-italic my-auto">No hay datos de asistencia por Fundo.</p>
                )}
              </div>
            </div>
          </div>
          {/* 3. Asistencia por Lote y Labor (Stacked Bar Chart) */}
          <div className="col-lg-4 col-md-12 mt-3 mt-lg-0">
            <div className={`${cardClass} h-100`}>
              <div className="card-header"><h6 className="mb-0">Asistencia por Lote y Labor (Top 5 Lotes)</h6></div>
              <div className="card-body d-flex flex-column justify-content-center">
                { (personnelByLoteLabor.labels.length > 0 && personnelByLoteLabor.datasets.some(ds => ds.data.some(d => d > 0))) ? <div style={{maxHeight:'450px'}}> <Bar data={personnelByLoteLabor} options={stackedBarOptions('Asistencia por Lote y Labor (Top 5 Lotes)', 'Nº Personas')} key="bar-lote-labor-chart" /> </div> : <p className="text-center fst-italic my-auto">No hay datos para el gráfico de Asistencia por Lote y Labor.</p> }
              </div>
            </div>
          </div>
      </div>

      {/* Fila 2 de Gráficos (Orden de Importancia: 4) */}
      {/* 4. Análisis Comparativo: Personas Pedidas (Gantt) vs. Personas Asistentes (Real) por Día */}
      <div className="row mb-3">
        <div className="col-12">
          <div className={`${cardClass} h-100`}>
            <div className="card-header"><h6 className="mb-0">Análisis Comparativo: Personas Pedidas (Gantt) vs. Personas Asistentes (Real) por Día</h6></div>
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

      {/* Fila 3 de Gráficos (Orden de Importancia: 5-7) */}
      <div className="row mb-3">
        {/* 5. Asistencia Diaria (Real) */}
        <div className="col-lg-4 col-md-6 mb-3 mb-md-0">
          <div className={`${cardClass} h-100`}>
            <div className="card-header"><h6 className="mb-0">Asistencia Diaria (Real)</h6></div>
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
        {/* 6. Top 5 Labores (Asistencia Real) */}
        <div className="col-lg-4 col-md-6 mb-3 mb-md-0">
          <div className={`${cardClass} h-100`}>
            <div className="card-header"><h6 className="mb-0">Top 5 Labores (Asistencia Real)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {top5LaborsActualData.labels.length > 0 && top5LaborsActualData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ height: '250px' }}>
                  <Bar data={top5LaborsActualData} options={newChartsCommonOptions('Top 5 Labores (Real)', 'Nº Personas', { showLegend: false, datalabelsOffset: 8, suggestedYMax: Math.max(...top5LaborsActualData.datasets[0].data) * 1.2 })} key="top5-labors-actual-chart" />
                </div>
              ) : (
                <p className="text-center fst-italic my-auto">No hay datos para este gráfico.</p>
              )}
            </div>
          </div>
        </div>
        {/* 7. Top 5 Lotes: Pedidas (Gantt) vs Asistentes (Real) */}
        <div className="col-lg-4 col-md-12">
          <div className={`${cardClass} h-100`}>
            <div className="card-header"><h6 className="mb-0">Top 5 Lotes: Pedidas (Gantt) vs Asistentes (Real)</h6></div>
            <div className="card-body d-flex flex-column justify-content-center">
              {top5LotesComparisonData.labels.length > 0 && top5LotesComparisonData.datasets.some(ds => ds.data.some(d => d > 0)) ? (
                <div style={{ height: '250px' }}>
                  <Bar data={top5LotesComparisonData} options={newChartsCommonOptions('Top 5 Lotes: Pedidas vs Asistentes', 'Nº Personas', { datalabelsOffset: 8, suggestedYMax: Math.max(...top5LotesComparisonData.datasets[0].data.concat(top5LotesComparisonData.datasets[1].data)) * 1.2 })} key="top5-lotes-comparison-chart-new" />
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