// src/Admin.jsx
import React, { useState, useEffect } from 'react';

function Admin({ setIsAuthenticated, darkMode }) {
  const [users, setUsers] = useState([]);
  // const [allReports, setAllReports] = useState([]); // Descomenta si necesitas esta lógica
  // const [showAssignReportsModal, setShowAssignReportsModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  // const [selectedUserForReports, setSelectedUserForReports] = useState(null);
  // const [assignedReportsForSelectedUser, setAssignedReportsForSelectedUser] = useState(new Set());

  const [newUser, setNewUser] = useState({
    usuario: '',
    correo: '',
    nombre: '',
    perfil: '',
    // estado: 'activo', // El backend lo establece en 'activo' por defecto al crear
    password: '',
  });

  const apiBaseUrl = import.meta.env.VITE_API_URL;

  // --- Funciones Auxiliares de Fetch ---
  const fetchData = async (specificEndpoint, options = {}) => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}${specificEndpoint}`, {
        method: 'GET', // Default method
        ...options, // Sobrescribe method, headers, body si se proveen
        headers, // Aplica las cabeceras combinadas
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText };
        }
        throw new Error(`Error ${response.status}: ${errorData.message || 'Falló la solicitud'}`);
      }

      if (response.status === 204 || options.method === 'DELETE') {
        return null;
      }
      // Para respuestas que solo devuelven un mensaje y no un JSON completo de datos
      if (options.method === 'POST' && response.headers.get("content-type")?.includes("application/json")) {
        // Si es un POST, y el backend devuelve un JSON (ej. {message: "..."}), lo parseamos
        // Si no, y esperabas un objeto creado, tendrás que manejarlo diferente (como re-fetch)
        return await response.json(); 
      }
      return await response.json();
    } catch (error) {
      console.error(`Error en la operación para ${apiBaseUrl}${specificEndpoint}:`, error.message);
      alert(`Error en la operación: ${error.message}`);
      throw error; // Re-lanza para que la función que llama pueda manejarlo
    }
  };

  // --- USUARIOS ---
  const fetchUsers = async () => {
    try {
      const data = await fetchData('/users'); // Usa el endpoint base de usuarios
      setUsers(data || []);
    } catch (error) {
      // El alert de error ya se muestra en fetchData
    }
  };

  useEffect(() => {
    // const token = localStorage.getItem('token'); // Protección de ruta ya en App.jsx
    // if (!token && setIsAuthenticated) {
    //   setIsAuthenticated(false);
    // }
    fetchUsers();
  }, [setIsAuthenticated]); // Si usas setIsAuthenticated en el efecto

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUser = async () => {
    if (!newUser.usuario || !newUser.correo || !newUser.nombre || !newUser.perfil || !newUser.password) {
      alert('Por favor, completa todos los campos requeridos, incluyendo la contraseña.');
      return;
    }
    try {
      // Backend devuelve: { message: "Usuario creado" }
      await fetchData('/users', {
        method: 'POST',
        body: JSON.stringify({
            usuario: newUser.usuario,
            password: newUser.password,
            nombre: newUser.nombre,
            perfil: newUser.perfil,
            correo: newUser.correo,
            // 'estado' es 'activo' por defecto en el backend
        }),
      });
      // Como el backend no devuelve el usuario creado, volvemos a cargar la lista
      alert("Usuario creado con éxito.");
      fetchUsers(); // Re-fetch para obtener la lista actualizada con el nuevo usuario (y su ID)
      setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' });
      setShowAddUserModal(false);
    } catch (error) {
      // El alert de error ya se muestra en fetchData
    }
  };

  const toggleUserState = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    try {
      // Backend devuelve: { message: "Estado actualizado a ${nuevoEstado}", estado: nuevoEstado }
      const responseData = await fetchData(`/users/desactivar/${userId}`, {
        method: 'PUT',
        // El body no es estrictamente necesario para este endpoint de backend en particular,
        // ya que el backend calcula el nuevo estado.
        // Pero si el backend lo leyera, sería { estado: !user.estado }
      });

      if (responseData && responseData.estado !== undefined) {
        setUsers(prevUsers =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, estado: responseData.estado } : u
          )
        );
        alert(responseData.message || `Estado del usuario ${user.usuario} actualizado a ${responseData.estado}.`);
      } else {
        // Si la respuesta no es la esperada, se podría re-fetch como fallback
        console.warn("Respuesta inesperada del backend al cambiar estado, re-cargando usuarios...");
        fetchUsers();
      }
    } catch (error) {
      // El alert de error ya se muestra en fetchData
    }
  };

  // --- REPORTES (Lógica de asignación - Mantenida como estaba, asumiendo que los endpoints son correctos) ---
  // Si esta lógica no es necesaria en Admin.jsx, se puede eliminar.
  // const fetchAllReports = async () => { /* ... */ };
  // useEffect(() => { fetchAllReports(); }, []);
  // const handleOpenAssignReportsModal = async (user) => { /* ... */ };
  // const handleToggleReportAssignment = async (reportId) => { /* ... */ };


  return (
    <>
      <div className="container mt-4">
        <h1>Gestión de Usuarios</h1>
        <button
          className="btn btn-primary mb-3"
          onClick={() => {
            setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' }); // Resetear al abrir
            setShowAddUserModal(true);
          }}
        >
          Agregar Usuario
        </button>
        <div className="table-responsive rounded shadow">
          <table className={`table table-striped `}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Nombre</th>
                <th>Perfil</th>
                <th>Estado</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.usuario}</td>
                  <td>{user.correo || 'N/A'}</td> {/* Backend GET /users no devuelve correo, pero POST sí */}
                  <td>{user.nombre}</td>
                  <td>{user.perfil}</td>
                  <td>
                    <span className={`badge ${user.estado?.toLowerCase() === 'activo' ? 'bg-success' : 'bg-danger'}`}>
                      {user.estado}
                    </span>
                  </td>
                  <td>
                    <button
                      title={user.estado?.toLowerCase() === 'activo' ? 'Desactivar' : 'Activar'}
                      className={`btn btn-sm me-2 ${user.estado?.toLowerCase() === 'activo' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                      onClick={() => toggleUserState(user.id)}
                    >
                      <i className={`bi ${user.estado?.toLowerCase() === 'activo' ? 'bi-person-fill-slash' : 'bi-person-fill-check'}`}></i>
                      {/* {user.estado?.toLowerCase() === 'activo' ? 'Desactivar' : 'Activar'} */}
                    </button>
                    {/* <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleOpenAssignReportsModal(user)}
                    >
                      Asignar Reportes
                    </button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para agregar usuario */}
      {showAddUserModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content `}>
              <div className="modal-header">
                <h5 className="modal-title">Agregar Usuario</h5>
                <button type="button" className={`btn-close `}
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' });
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); handleAddUser(); }}>
                  <div className="mb-3">
                    <label className="form-label">Usuario</label>
                    <input type="text" className="form-control" name="usuario" value={newUser.usuario} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Correo</label>
                    <input type="email" className="form-control" name="correo" value={newUser.correo} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input type="text" className="form-control" name="nombre" value={newUser.nombre} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Perfil</label>
                    <input type="text" className="form-control" name="perfil" value={newUser.perfil} onChange={handleInputChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" name="password" value={newUser.password} onChange={handleInputChange} required />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddUserModal(false); setNewUser({ usuario: '', correo: '', nombre: '', perfil: '', password: '' }); }}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleAddUser}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar reportes (Mantenido como estaba, si es necesario) */}
      {/* {showAssignReportsModal && selectedUserForReports && ( ... tu modal de asignar reportes ... )} */}
    </>
  );
}

export default Admin;