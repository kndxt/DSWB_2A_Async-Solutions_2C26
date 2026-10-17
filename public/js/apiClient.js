
export async function apiFetch(url, options = {}) {
  // C la petición si supera los 15 segundos.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    // Conservamos las opciones existentes y agregamos la señal de cancelación.
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";

    // Leemos el cuerpo como texto para admitir respuestas JSON o texto plano.
    const body = await response.text();

    let data = null;
    let jsonInvalido = false;

    if (body) {
      if (contentType.includes("json")) {
        try {
          data = JSON.parse(body);
        } catch {
          jsonInvalido = true;
          data = body;
        }
      } else {
        data = body;
      }
    }

    if (!response.ok) {
      const message =
        typeof data === "string"
          ? data.replace(/<[^>]*>/g, "").trim().slice(0, 300)
          : data?.error || data?.message;

      throw new Error(message || `Error HTTP ${response.status}`);
    }

    if (jsonInvalido) {
      throw new Error("El servidor devolvió una respuesta JSON inválida.");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La operación tardó demasiado. Intentá nuevamente.");
    }

    if (error instanceof TypeError) {
      throw new Error("No se pudo conectar con el servidor.");
    }

    // Los errores personalizados de la API se conservan.
    throw error;
  } finally {
    // Se ejecuta tanto si la petición funciona como si falla.
    clearTimeout(timeout);
  }
}
