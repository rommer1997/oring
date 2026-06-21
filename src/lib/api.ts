// Base URL del backend. En dev usa proxy de Vite (vacío). En prod apunta al backend en Render.
const API_BASE = import.meta.env.VITE_API_URL ?? '';
export const apiUrl = (path: string) => `${API_BASE}${path}`;
