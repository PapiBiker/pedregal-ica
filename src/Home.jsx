// src/Home.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // Para enlaces internos si los añades

// Home recibe setIsAuthenticated y darkMode desde App/ProtectedPageLayout
function Home({ setIsAuthenticated, darkMode }) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [showWelcomeToast, setShowWelcomeToast] = useState(true); // Estado para el toast

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && setIsAuthenticated) {
      setIsAuthenticated(false);
    }
    setNombre(localStorage.getItem('nombre') || 'Usuario');
    setRol(localStorage.getItem('rol') || 'N/A');

    // Opcional: Ocultar el toast automáticamente después de un tiempo
    // const timer = setTimeout(() => {
    //   setShowWelcomeToast(false);
    // }, 5000); // Ocultar después de 5 segundos
    // return () => clearTimeout(timer);

  }, [setIsAuthenticated]);

  // Clases condicionales para modo oscuro
  const textClass = darkMode ? 'text-light' : 'text-dark';
  const secondaryTextClass = darkMode ? 'text-white-50' : 'text-muted';
  const cardClass = `card shadow-sm h-100 ${darkMode ? 'bg-dark border-secondary text-light' : ''}`;
  const jumbotronClass = `p-4 p-md-5 mb-4 rounded-3 ${darkMode ? 'bg-secondary' : 'bg-light'}`;
  const toastClass = `toast align-items-center ${
    darkMode ? 'text-white bg-dark border-secondary' : 'text-dark bg-white border-primary'
  }`;


  return (
    <>
      {/* --- Toast de Bienvenida --- */}
      <div aria-live="polite" aria-atomic="true" className="position-relative">
        <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
          {showWelcomeToast && (
            <div className={toastClass} role="alert" aria-live="assertive" aria-atomic="true" >
              <div className="d-flex">
                <div className="toast-body">
                  ¡Hola, <strong>{nombre}</strong>! Bienvenido/a de nuevo.
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

      {/* --- Sección de Bienvenida Principal (Jumbotron/Hero) --- */}
      <div className={jumbotronClass}>
        <div className="container-fluid py-3">
          <h1 className={`display-5 fw-bold ${textClass}`}>Bienvenido, {nombre}</h1>
          <p className={`col-md-8 fs-5 ${secondaryTextClass}`}>
            Tu rol actual es: <strong>{rol}</strong>. Explora las funcionalidades disponibles para ti.
          </p>
          <p className={secondaryTextClass}>Este es el contenido principal de tu página de inicio.</p>
          {rol === 'admin' && (
            <Link to="/admin" className={`btn ${darkMode ? 'btn-light' : 'btn-primary'} btn-lg mt-3`}>
              Ir al Panel de Administración <i className="bi bi-arrow-right-circle ms-2"></i>
            </Link>
          )}
        </div>
      </div>

      {/* --- Sección de Contenido Adicional / Accesos Rápidos (Cards) --- */}
      <h2 className={`mt-5 mb-3 ${textClass}`}>Accesos Rápidos</h2>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {/* Ejemplo de Card 1: Dashboard */}
        <div className="col">
          <div className={cardClass}>
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">
                <i className="bi bi-speedometer2 me-2"></i>Dashboard
              </h5>
              <p className={`card-text flex-grow-1 ${secondaryTextClass}`}>
                Visualiza tus reportes asignados y principales métricas.
              </p>
              <Link to="/dashboard" className={`btn mt-auto ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}>
                Ir al Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Ejemplo de Card 2: Perfil */}
        <div className="col">
          <div className={cardClass}>
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">
                <i className="bi bi-person-circle me-2"></i>Mi Perfil
              </h5>
              <p className={`card-text flex-grow-1 ${secondaryTextClass}`}>
                Consulta y actualiza tu información personal y de contacto.
              </p>
              <Link to="/profile" className={`btn mt-auto ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}>
                Ver Perfil
              </Link>
            </div>
          </div>
        </div>

        {/* Ejemplo de Card 3: Configuración (opcional o según rol) */}
        <div className="col">
          <div className={cardClass}>
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">
                <i className="bi bi-gear-fill me-2"></i>Configuración
              </h5>
              <p className={`card-text flex-grow-1 ${secondaryTextClass}`}>
                Ajusta las preferencias de tu cuenta y de la aplicación.
              </p>
              <Link to="/settings" className={`btn mt-auto ${darkMode ? 'btn-outline-light' : 'btn-outline-primary'}`}>
                Ajustes
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Puedes añadir más contenido o secciones aquí */}
      <div className="my-5">
        <hr className={darkMode ? 'border-secondary' : ''} />
        <p className={`text-center ${secondaryTextClass}`}>Más funcionalidades próximamente.</p>
      </div>
    </>
  );
}

export default Home;