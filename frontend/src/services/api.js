const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3001";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-user-nombre": localStorage.getItem("nombre") || "",
    "x-user-codigo": localStorage.getItem("codigo") || ""
  };
}

export async function apiGet(endpoint) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: getHeaders()
  });

  if (!res.ok) {
    throw new Error("Error en consulta API");
  }

  return await res.json();
}

export async function apiPost(endpoint, data) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error en envío API");
  }

  return await res.json();
}

export async function apiPut(endpoint, data) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al actualizar");
  }

  return await res.json();
}

export async function apiDelete(endpoint) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "DELETE",
    headers: getHeaders()
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Error al eliminar");
  }

  return await res.json();
}