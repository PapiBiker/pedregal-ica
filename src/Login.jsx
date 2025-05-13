import React, { useState } from 'react';
import BackgroundLogin from './assets/login-background.jpg';

function Login({ setIsAuthenticated }) {
  const [usuario, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/auth/login`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('nombre', data.nombre);
        localStorage.setItem('rol', data.rol);
        localStorage.setItem('userId', data.id);
        setIsAuthenticated(true);
      } else {
        setError('Error: Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      setError(`Error al conectar con el servidor: ${err.message}`);
    }
  };

  return (
    <div
      className="vh-100 vw-100 d-flex justify-content-center align-items-center"
      style={{
        backgroundImage: `url(${BackgroundLogin})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="p-4 rounded shadow"
        style={{
          width: '100%',
          maxWidth: '400px',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#fff',
        }}
      >
        <h2 className="text-center mb-4">Iniciar Sesión</h2>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <label htmlFor="usuario" className="form-label">Usuario</label>
          <input
            type="text"
            id="usuario"
            className="form-control bg-transparent text-white border-white"
            value={usuario}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="form-label">Contraseña</label>
          <input
            type="password"
            id="password"
            className="form-control bg-transparent text-white border-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn btn-light w-100 mb-3" onClick={handleLogin}>
          Iniciar Sesión
        </button>

        <div className="text-center">
          <a href="/help" className="text-light text-decoration-underline">
            ¿Olvidaste tu usuario o contraseña?
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
