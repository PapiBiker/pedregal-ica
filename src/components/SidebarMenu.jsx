// src/components/SidebarMenu.jsx
import React, { useEffect, useState } from 'react';
import logo from '../assets/logo-menu.png'; // Asegúrate que la ruta al logo sea correcta
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Importa useLocation

function SidebarMenu({ setIsAuthenticated, darkMode, setDarkMode }) {
    const navigate = useNavigate();
    const location = useLocation(); // Hook para obtener la ruta actual
    const [rol, setRol] = useState('');
    const [userInitial, setUserInitial] = useState('');
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const userRol = localStorage.getItem('rol');
        setRol(userRol || '');

        const storedUserName = localStorage.getItem('nombreUsuario') || localStorage.getItem('nombre');
        if (storedUserName) {
            setUserName(storedUserName);
            setUserInitial(storedUserName.charAt(0).toUpperCase());
        } else {
            setUserInitial('U');
            setUserName('Usuario');
        }
    }, []);

    // Inicializar tooltips de Bootstrap
    useEffect(() => {
        // Asegúrate de que window.bootstrap y window.bootstrap.Tooltip estén disponibles
        if (window.bootstrap && typeof window.bootstrap.Tooltip === 'function') {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new window.bootstrap.Tooltip(tooltipTriggerEl, {
                    trigger: 'hover' // Mostrar tooltip solo en hover
                });
            });
            // Opcional: limpiar tooltips al desmontar
            return () => {
                tooltipList.forEach(tooltip => tooltip.dispose());
            };
        }
    }, []); // Ejecutar solo al montar


    const handleLogout = () => {
        if (setIsAuthenticated) {
            setIsAuthenticated(false);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('nombre');
            localStorage.removeItem('nombreUsuario');
            localStorage.removeItem('rol');
        }
        navigate('/');
    };

    const toggleInternalDarkMode = () => {
        const newDarkMode = !darkMode;
        if (setDarkMode) {
            setDarkMode(newDarkMode);
        }
        localStorage.setItem('darkMode', newDarkMode.toString());
    };

    // Estilos para el contenedor de la inicial del usuario
    const initialContainerStyle = {
        width: '32px', // Ligeramente más grande
        height: '32px',
        borderRadius: '50%',
        backgroundColor: darkMode ? '#4A5568' : '#A0AEC0', // Colores más suaves (Tailwind gray-700 y gray-500)
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        fontWeight: '600', // Semibold
        lineHeight: '1',
        transition: 'background-color 0.2s ease-in-out',
    };
    
    // Clases base para los enlaces de navegación
    const baseLinkClasses = "nav-link d-flex align-items-center justify-content-center py-3 mx-2 rounded-3"; // mx-2 para espacio, rounded-3
    const iconSize = '1.75rem'; // Tamaño de icono unificado

    // Función para determinar si un enlace está activo
    const isActive = (path) => location.pathname === path;

    return (
        <div
            className={`d-flex flex-column flex-shrink-0 vh-100 shadow-sm ${darkMode ? 'bg-dark-custom' : 'bg-light-custom'}`}
            style={{ width: '5rem' }} // Ligeramente más ancho para acomodar padding
        >
            {/* Logo con padding y efecto hover */}
            <Link 
                to="/home" 
                className={`d-block p-3 text-decoration-none sidebar-logo-link ${darkMode ? 'link-light-hover' : 'link-dark-hover'}`}
                title="Inicio" 
                data-bs-toggle="tooltip" 
                data-bs-placement="right"
            >
                <img src={logo} alt="Logo" className="img-fluid mx-auto d-block" style={{ maxHeight: '2.8rem', width: 'auto' }} />
            </Link>

            {/* Lista de navegación principal */}
            <ul className="nav nav-pills nav-flush flex-column mb-auto text-center mt-2">
                {[
                    { path: "/home", title: "Inicio", icon: "bi-house-door-fill" },
                    { path: "/dashboard", title: "Dashboard", icon: "bi-grid-1x2-fill" }, // Icono cambiado
                ].map(item => (
                    <li className="nav-item my-1" key={item.path}>
                        <Link 
                            to={item.path} 
                            className={`${baseLinkClasses} ${isActive(item.path) 
                                ? (darkMode ? 'active-dark' : 'active-light') 
                                : (darkMode ? 'link-light-hover' : 'link-dark-hover')
                            }`}
                            title={item.title} 
                            data-bs-toggle="tooltip" 
                            data-bs-placement="right"
                            aria-current={isActive(item.path) ? "page" : undefined}
                        >
                            <i className={`bi ${item.icon}`} style={{ fontSize: iconSize }}></i>
                        </Link>
                    </li>
                ))}

                {rol === 'admin' && [
                    { path: "/admin", title: "Portal Admin", icon: "bi-sliders" }, // Icono cambiado
                    { path: "/reports", title: "Reportes", icon: "bi-file-earmark-bar-graph-fill" }, // Icono cambiado
                ].map(item => (
                     <li className="nav-item my-1" key={item.path}>
                        <Link 
                            to={item.path} 
                            className={`${baseLinkClasses} ${isActive(item.path) 
                                ? (darkMode ? 'active-dark' : 'active-light') 
                                : (darkMode ? 'link-light-hover' : 'link-dark-hover')
                            }`}
                            title={item.title} 
                            data-bs-toggle="tooltip" 
                            data-bs-placement="right"
                            aria-current={isActive(item.path) ? "page" : undefined}
                        >
                            <i className={`bi ${item.icon}`} style={{ fontSize: iconSize }}></i>
                        </Link>
                    </li>
                ))}
            </ul>

            {/* Sección inferior: Dropdown de Perfil y Toggle de Modo Oscuro */}
            <div className="mt-auto"> {/* Empuja estos elementos hacia abajo */}
                <div className="dropdown border-top-custom">
                    <a
                        href="#"
                        className={`d-flex align-items-center justify-content-center p-3 text-decoration-none dropdown-toggle profile-dropdown-toggle ${darkMode ? 'text-light-emphasis' : 'text-dark-emphasis'}`}
                        id="dropdownUserMenuSidebar"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        title={userName}
                        data-bs-toggle-tooltip="tooltip" // Corregido: data-bs-toggle="tooltip"
                        data-bs-placement="right"
                    >
                        <div style={initialContainerStyle} className="profile-initial-container">
                            {userInitial}
                        </div>
                    </a>
                    <ul 
                        className={`dropdown-menu text-small shadow ${darkMode ? 'dropdown-menu-dark' : ''}`} 
                        aria-labelledby="dropdownUserMenuSidebar"
                        style={{ minWidth: '180px' }} // Ancho mínimo para el dropdown
                    >
                        <li><Link className="dropdown-item" to="/profile"><i className="bi bi-person-fill me-2"></i>Perfil</Link></li>
                        <li><Link className="dropdown-item" to="/settings"><i className="bi bi-gear-fill me-2"></i>Configuración</Link></li>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                            <button type="button" className="dropdown-item d-flex align-items-center" onClick={handleLogout}>
                                <i className="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="text-center py-2 border-top-custom">
                    <button
                        type="button"
                        className={`btn btn-toggle-dark-mode ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}
                        onClick={toggleInternalDarkMode}
                        title="Alternar Modo Oscuro"
                        data-bs-toggle="tooltip"
                        data-bs-placement="right"
                        style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem' }} // Botón más cuadrado
                    >
                        <i className={`bi ${darkMode ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} style={{ fontSize: '1.3rem' }}></i>
                    </button>
                </div>
            </div>
            
            {/* Estilos CSS en línea (o puedes moverlos a un archivo .css) */}
            <style jsx global>{`
                .bg-dark-custom { background-color: #1a202c; } /* Tailwind gray-900 */
                .bg-light-custom { background-color: #f7fafc; } /* Tailwind gray-100 */

                .sidebar-logo-link { transition: opacity 0.2s ease-in-out; }
                .sidebar-logo-link:hover { opacity: 0.8; }

                .nav-link {
                    transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
                    position: relative; /* Para la pseudo-clase ::before */
                }
                .nav-link:hover, .nav-link:focus {
                    /* No es necesario aquí si usamos clases de hover específicas */
                }
                
                .link-light-hover:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #f8f9fa !important; /* text-light */
                }
                .link-dark-hover:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                    color: #212529 !important; /* text-dark */
                }

                .active-light {
                    background-color: #0d6efd !important; /* Bootstrap primary */
                    color: white !important;
                }
                .active-light i {
                    color: white !important;
                }

                .active-dark {
                    background-color: #4dabf7 !important; /* Un azul más brillante para modo oscuro */
                    color: #1a202c !important;
                }
                 .active-dark i {
                    color: #1a202c !important;
                }
                
                /* Indicador lateral para el enlace activo (opcional) */
                .nav-link.active-light::before, .nav-link.active-dark::before {
                  content: "";
                  position: absolute;
                  left: 0;
                  top: 50%;
                  transform: translateY(-50%);
                  width: 4px;
                  height: 60%;
                  background-color: ${darkMode ? '#1a202c' : '#fff'}; /* Color del indicador */
                  border-top-right-radius: 4px;
                  border-bottom-right-radius: 4px;
                }


                .profile-dropdown-toggle:hover .profile-initial-container {
                    background-color: ${darkMode ? '#667EEA' : '#4A5568'}; /* Indigo-500 y Gray-700 */
                }
                .profile-dropdown-toggle::after { /* Ocultar la flecha por defecto del dropdown */
                    display: none;
                }
                
                .border-top-custom {
                    border-top: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
                }

                .btn-toggle-dark-mode {
                    transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out;
                }
                .dropdown-item {
                    transition: background-color 0.15s ease-in-out;
                }
                .dropdown-item i {
                    opacity: 0.7;
                }
                .dropdown-item:hover i {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}

export default SidebarMenu;
