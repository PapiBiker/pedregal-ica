// src/utils/auth.js
import { jwtDecode } from 'jwt-decode';

export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log("No token found in localStorage.");
    return false;
  }

  try {
    const decodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000; // Convertir a segundos (igual que el claim 'exp')

    // console.log("Decoded token exp:", decodedToken.exp);
    // console.log("Current time:", currentTime);

    if (decodedToken.exp < currentTime) {
      console.log("Token has expired.");
      localStorage.removeItem('token'); // Eliminar token expirado
      // Opcional: también podrías querer eliminar el rol si el token expiró
      // localStorage.removeItem('rol');
      return false;
    }
    // console.log("Token is valid.");
    return true;
  } catch (error) {
    console.error("Error decoding token or invalid token:", error);
    localStorage.removeItem('token'); // Eliminar token inválido/malformado
    // localStorage.removeItem('rol');
    return false;
  }
};