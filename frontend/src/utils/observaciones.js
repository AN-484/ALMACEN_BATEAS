import { apiGet } from "../services/api";

export async function verObservacion(obsId) {
  if (!obsId) return;

  try {
    const data = await apiGet(
      `/api/cilindros/observaciones/${obsId}`
    );

    alert(data?.contenido || "Sin observación");

  } catch (error) {
    console.error(error);
    alert("No se pudo cargar la observación");
  }
}


export async function obtenerContenidoObservacion(obsId) {
  if (!obsId) return "";

  try {
    const data = await apiGet(
      `/api/cilindros/observaciones/${obsId}`
    );

    return data?.contenido || "";

  } catch (error) {
    console.error(error);
    return "";
  }
}