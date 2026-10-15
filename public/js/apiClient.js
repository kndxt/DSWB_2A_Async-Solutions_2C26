export async function apiFetch(url, options = {}) {

  const response = await fetch(url, options);

  const contentType = response.headers.get("content-type") || "";

// Leemos el cuerpo como texto porque algunos controladores pueden responder
// texto plano en lugar de JSON. Después interpretamos el formato según Content-Type.
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
}