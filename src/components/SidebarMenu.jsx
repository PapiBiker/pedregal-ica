// src/components/SidebarMenu.jsx
import React, { useEffect, useState, useRef } from 'react';
import logo from '../assets/logo-menu.png'; // Asegúrate que la ruta al logo sea correcta
import { Link, useNavigate, useLocation } from 'react-router-dom';

function SidebarMenu({ setIsAuthenticated, darkMode, setDarkMode, id = "sidebarMenuOffcanvas" }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [rol, setRol] = useState('');
    const [userInitial, setUserInitial] = useState('');
    const [userName, setUserName] = useState('');
    const offcanvasRef = useRef(null); // Ref para el elemento DOM del offcanvas
    const initializedTooltipsRef = useRef([]);

    useEffect(() => {
        const userRol = localStorage.getItem('rol'); setRol(userRol || '');
        const storedUserName = localStorage.getItem('nombreUsuario') || localStorage.getItem('nombre');
        if (storedUserName) { setUserName(storedUserName); setUserInitial(storedUserName.charAt(0).toUpperCase()); } 
        else { setUserInitial('U'); setUserName('Usuario'); }
    }, []);

    useEffect(() => {
        const initTooltips = () => {
            initializedTooltipsRef.current.forEach(tooltip => { if (tooltip && typeof tooltip.dispose === 'function') { try { tooltip.dispose(); } catch (e) {/* Silenciar error */} } });
            initializedTooltipsRef.current = [];

            if (window.bootstrap && typeof window.bootstrap.Tooltip === 'function') {
                const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.forEach(function (tooltipTriggerEl) {
                    if (!window.bootstrap.Tooltip.getInstance(tooltipTriggerEl)) { // Solo inicializar si no tiene ya una instancia
                        try {
                            const newTooltip = new window.bootstrap.Tooltip(tooltipTriggerEl, { trigger: 'hover', container: 'body' });
                            initializedTooltipsRef.current.push(newTooltip);
                        } catch (e) { console.warn("SidebarMenu: Falló al inicializar un tooltip específico.", e, tooltipTriggerEl); }
                    }
                });
            }
        };
        const timerId = setTimeout(initTooltips, 150);
        return () => { clearTimeout(timerId); initializedTooltipsRef.current.forEach(tooltip => { if (tooltip && typeof tooltip.dispose === 'function') { try { tooltip.dispose(); } catch (e) {} } }); initializedTooltipsRef.current = []; };
    }, [location.pathname, darkMode, rol]); // Agregado rol a las dependencias por si afecta la visibilidad y tooltips


    const tryCloseOffcanvas = () => {
        if (offcanvasRef.current && window.bootstrap && window.bootstrap.Offcanvas && typeof window.bootstrap.Offcanvas.getInstance === 'function') {
            const offcanvasInstance = window.bootstrap.Offcanvas.getInstance(offcanvasRef.current);
            if (offcanvasInstance && offcanvasInstance._isShown) { // _isShown es una propiedad interna, pero útil
                offcanvasInstance.hide();
            }
        }
    };

    const handleMenuLinkClick = () => {
        tryCloseOffcanvas();
    };

    const handleLogout = () => {
        if (setIsAuthenticated) { setIsAuthenticated(false); } 
        else { localStorage.clear(); }
        tryCloseOffcanvas();
        navigate('/');
    };
    const toggleInternalDarkMode = () => { const newDarkMode = !darkMode; if (setDarkMode) { setDarkMode(newDarkMode); } localStorage.setItem('darkMode', newDarkMode.toString()); };
    
    const initialContainerStyle = { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: darkMode ? '#4A5568' : '#A0AEC0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '600', lineHeight: '1', transition: 'background-color 0.2s ease-in-out', };
    const baseLinkClasses = "nav-link d-flex align-items-center justify-content-center py-3 mx-2 rounded-3";
    const iconSize = '1.6rem';
    const isActive = (path) => location.pathname === path || (path === "/home" && location.pathname === "/");

    // Definición de items de menú base y condicionales
    const menuContent = (isOffcanvas = false) => {
        const baseMenuItems = [
            { path: "/home", title: "Inicio", icon: "bi-house-door-fill" },
            { path: "/dashboard", title: "Dashboard", icon: "bi-grid-1x2-fill" }
        ];

        const conditionalMenuItems = [];

        // Lógica para items condicionales basada en el rol
        if (rol && ['gerente', 'jefe_campo', 'admin'].includes(rol)) {
            conditionalMenuItems.push({ path: "/costos", title: "Costos", icon: "bi-currency-dollar" });
        }
        if (rol && ['supervisor', 'jefe_campo', 'gerente', 'admin'].includes(rol)) {
            conditionalMenuItems.push({ path: "/personal", title: "Personal", icon: "bi bi-people-fill" });
        }
        if (rol && ['apoyo', 'admin'].includes(rol)) {
            conditionalMenuItems.push({ path: "/supervisioningreso", title: "Supervisión de Ingreso", icon: "bi bi-search" });
        }
        if (rol && ['apoyo', 'admin'].includes(rol)) {
            conditionalMenuItems.push({ path: "/administrarpartesdiarios", title: "Administrar Partes Diarios", icon: "bi bi-journal-text" }); // Ruta visible solo para apoyo y admin
        }

        const finalMenuItems = [...baseMenuItems, ...conditionalMenuItems];

        // Items exclusivos para administradores
        const adminMenuItems = [
            { path: "/admin", title: "Portal Admin", icon: "bi-sliders" },
            { path: "/reports", title: "Reportes", icon: "bi-file-earmark-bar-graph-fill" },
        ];

        return (
            <>
                {!isOffcanvas && ( <Link to="/home" className={`d-block p-3 text-decoration-none sidebar-logo-link ${darkMode ? 'link-light-hover' : 'link-dark-hover'}`} title="Inicio" data-bs-toggle="tooltip" data-bs-placement="right"> <img src={logo} alt="Logo" className="img-fluid mx-auto d-block" style={{ maxHeight: '2.8rem', width: 'auto' }} /> </Link> )}
                <ul className={`nav nav-pills nav-flush flex-column mb-auto text-center ${isOffcanvas ? 'mt-0' : 'mt-2'}`}>
                    {/* Renderizar los items de menú finales (base + condicionales) */}
                    {finalMenuItems.map(item => (
                        <li className={`nav-item ${isOffcanvas ? '' : 'my-1'}`} key={item.path}>
                            <Link 
                                to={item.path} 
                                className={isOffcanvas 
                                    ? `nav-link py-2 ps-3 d-flex align-items-center ${isActive(item.path) ? (darkMode ? 'active-dark-offcanvas' : 'active-light-offcanvas') : (darkMode ? 'link-light-hover-offcanvas' : 'link-dark-hover-offcanvas') }` 
                                    : `${baseLinkClasses} ${isActive(item.path) ? (darkMode ? 'active-dark' : 'active-light') : (darkMode ? 'link-light-hover' : 'link-dark-hover') }`} 
                                title={isOffcanvas ? '' : item.title} 
                                data-bs-toggle={isOffcanvas ? '' : "tooltip"} 
                                data-bs-placement="right" 
                                aria-current={isActive(item.path) ? "page" : undefined} 
                                onClick={isOffcanvas ? handleMenuLinkClick : undefined}
                            >
                                <i className={`bi ${item.icon} ${isOffcanvas ? 'me-2' : ''}`} style={{ fontSize: isOffcanvas ? '1.2rem' : iconSize }}></i> 
                                {isOffcanvas && item.title}
                            </Link>
                        </li>
                    ))}
                    {/* Renderizar items de menú para administradores si el rol es 'admin' */}
                    {rol === 'admin' && adminMenuItems.map(item => (
                        <li className={`nav-item ${isOffcanvas ? '' : 'my-1'}`} key={item.path}>
                            <Link 
                                to={item.path} 
                                className={isOffcanvas 
                                    ? `nav-link py-2 ps-3 d-flex align-items-center ${isActive(item.path) ? (darkMode ? 'active-dark-offcanvas' : 'active-light-offcanvas') : (darkMode ? 'link-light-hover-offcanvas' : 'link-dark-hover-offcanvas') }` 
                                    : `${baseLinkClasses} ${isActive(item.path) ? (darkMode ? 'active-dark' : 'active-light') : (darkMode ? 'link-light-hover' : 'link-dark-hover') }`} 
                                title={isOffcanvas ? '' : item.title} 
                                data-bs-toggle={isOffcanvas ? '' : "tooltip"} 
                                data-bs-placement="right" 
                                aria-current={isActive(item.path) ? "page" : undefined} 
                                onClick={isOffcanvas ? handleMenuLinkClick : undefined}
                            >
                                <i className={`bi ${item.icon} ${isOffcanvas ? 'me-2' : ''}`} style={{ fontSize: isOffcanvas ? '1.2rem' : iconSize }}></i> 
                                {isOffcanvas && item.title}
                            </Link>
                        </li>
                    ))}
                </ul>
                <div className="mt-auto"> {/* Contenedor para perfil y modo oscuro */}
                    <div className={`dropdown ${isOffcanvas ? '' : 'border-top-custom'}`}>
                        <a href="#" className={`d-flex align-items-center ${isOffcanvas ? 'p-3' : 'justify-content-center p-3'} text-decoration-none dropdown-toggle profile-dropdown-toggle ${darkMode ? 'text-light-emphasis' : 'text-dark-emphasis'}`} id={`dropdownUser-${isOffcanvas ? 'offcanvas' : 'sidebar'}`} data-bs-toggle="dropdown" aria-expanded="false" title={userName} data-bs-toggle-tooltip={isOffcanvas ? '' : "tooltip"} data-bs-placement="right">
                            <div style={{...initialContainerStyle, width: isOffcanvas ? '28px' : '32px', height: isOffcanvas ? '28px' : '32px', fontSize: isOffcanvas? '0.9rem':'1rem'}} className={isOffcanvas ? 'me-2' : 'profile-initial-container'}>
                                {userInitial}
                            </div>
                            {isOffcanvas && <span style={{fontSize:'0.9rem'}}>{userName}</span>}
                        </a>
                        <ul className={`dropdown-menu text-small shadow ${darkMode ? 'dropdown-menu-dark' : ''}`} aria-labelledby={`dropdownUser-${isOffcanvas ? 'offcanvas' : 'sidebar'}`} style={{ minWidth: isOffcanvas ? 'calc(100% - 1rem)' : '180px', ...(isOffcanvas ? {position:'static !important', transform:'none !important', inset:'auto !important', float:'none !important', margin:'0.5rem'} : {left: '100%', marginLeft:'0.5rem', top: 'auto', bottom:'1rem'}) }}>
                            <li><Link className="dropdown-item" to="/profile" onClick={isOffcanvas ? handleMenuLinkClick : undefined}><i className="bi bi-person-fill me-2"></i>Perfil</Link></li>
                            <li><Link className="dropdown-item" to="/settings" onClick={isOffcanvas ? handleMenuLinkClick : undefined}><i className="bi bi-gear-fill me-2"></i>Configuración</Link></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li> <button type="button" className="dropdown-item d-flex align-items-center" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Cerrar Sesión</button> </li>
                        </ul>
                    </div>
                    <div className={`text-center py-2 ${isOffcanvas ? 'p-3' : ''} ${isOffcanvas && !darkMode ? 'bg-light' : ''} ${isOffcanvas && darkMode ? 'bg-dark' : ''} border-top-custom`}>
                        <button type="button" className={`btn ${isOffcanvas ? (darkMode ? 'btn-outline-light w-100' : 'btn-outline-secondary w-100') : `btn-toggle-dark-mode ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}`} onClick={toggleInternalDarkMode} title={isOffcanvas ? "" : "Alternar Modo Oscuro"} data-bs-toggle-tooltip={isOffcanvas ? '' : "tooltip"} data-bs-placement="right" style={isOffcanvas ? {} : { width: '3rem', height: '3rem', borderRadius: '0.75rem' }}>
                            {isOffcanvas ? (darkMode ? <><i className="bi bi-sun-fill me-1"></i>Modo Claro</> : <><i className="bi bi-moon-stars-fill me-1"></i>Modo Oscuro</>) : <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} style={{ fontSize: '1.3rem' }}></i>}
                        </button>
                    </div>
                </div>
            </>
        );
    };

    return (
        <>
            {/* Sidebar fijo para desktop (md y más grande) */}
            <div className={`d-none d-md-flex flex-column flex-shrink-0 vh-100 shadow-sm ${darkMode ? 'bg-dark-custom' : 'bg-light-custom'}`} style={{ width: '4.5rem' }}>
                {menuContent(false)}
            </div>

            {/* Offcanvas para móvil (más pequeño que md) */}
            <div 
                ref={offcanvasRef} 
                className={`offcanvas offcanvas-start ${darkMode ? 'bg-dark-custom text-light' : 'bg-light-custom text-dark'} d-md-none`} 
                tabIndex="-1" 
                id={id} 
                aria-labelledby={`${id}Label`} 
                style={{ width: '220px' }}
            >
                <div className="offcanvas-header border-bottom-custom">
                    <img src={logo} alt="Logo" className="img-fluid" style={{ maxHeight: '2.5rem' }} />
                    <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div className="offcanvas-body d-flex flex-column p-0">
                    {menuContent(true)}
                </div>
            </div>
        </>
    );
}
export default SidebarMenu;