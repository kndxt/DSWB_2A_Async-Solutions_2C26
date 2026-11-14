(() => {
  const chat = document.getElementById("chat");

  // La página también puede mostrar el componente para usuarios anónimos.
  // En ese caso no debemos intentar establecer una conexión.
  if (!chat) return;

  const LIMITE_TEXTO = 500;
  const LIMITE_MENSAJES = 200;
  const ESPERA_MAXIMA_GEMINI_MS = 20000;

  // Estos nombres deben coincidir con sockets/eventos.js.
  const EVENTOS = {
    MENSAJE: "chat:mensaje",
    ERROR: "chat:error",
    SESION_EXPIRADA: "chat:sesion-expirada",
  };

  const usuarioId = chat.dataset.usuarioId;

  const estado = document.getElementById("chat-estado");
  const estadoTexto = document.getElementById("chat-estado-texto");
  const contenedorMensajes = document.getElementById("chat-mensajes");
  const mensajeVacio = document.getElementById("chat-vacio");
  const formulario = document.getElementById("chat-formulario");
  const campoTexto = document.getElementById("chat-texto");
  const botonEnviar = document.getElementById("chat-enviar");
  const contador = document.getElementById("chat-contador");
  const error = document.getElementById("chat-error");
  const avisoSesion = document.getElementById("chat-sesion-expirada");
  const geminiEstado = document.getElementById("chat-gemini-estado");
  const botonReconectar = document.getElementById("chat-reconectar");

  let sesionExpirada = false;
  let temporizadorGemini;

  /**
   * Actualiza el indicador visual de conexión.
   */
  function actualizarEstado(nombre, texto) {
    estado.dataset.estado = nombre;
    estadoTexto.textContent = texto;
  }

  /**
   * Habilita o deshabilita el formulario según el estado del socket.
   */
  function actualizarFormulario() {
    const disponible = socket.connected && !sesionExpirada;

    campoTexto.disabled = !disponible;
    botonEnviar.disabled = !disponible;
  }

  /**
   * Muestra un error sin interpretar el contenido como HTML.
   */
  function mostrarError(texto) {
    error.textContent = texto;
    error.hidden = false;
  }

  function limpiarError() {
    error.textContent = "";
    error.hidden = true;
  }

  /**
   * Muestra u oculta el aviso "Gemini está respondiendo…".
   * El temporizador es un respaldo: el backend corta a los 15 s,
   * esto evita que el aviso quede colgado si la respuesta nunca llega.
   */
  function mostrarGeminiPensando(visible) {
    geminiEstado.hidden = !visible;
    clearTimeout(temporizadorGemini);

    if (visible) {
      temporizadorGemini = setTimeout(() => mostrarGeminiPensando(false), ESPERA_MAXIMA_GEMINI_MS);
    }
  }

  /**
   * Bloquea el chat cuando el servidor informa que la sesión expiró
   * o no pudo autenticarse durante el handshake.
   */
  function finalizarSesion() {
    if (sesionExpirada) return;

    sesionExpirada = true;

    mostrarGeminiPensando(false);
    botonReconectar.hidden = true;

    actualizarEstado("error", "Sesión no válida");
    actualizarFormulario();

    avisoSesion.hidden = false;

    socket.disconnect();
  }

  /**
   * Formatea la fecha recibida desde el servidor.
   */
  function formatearFecha(fecha) {
    const fechaMensaje = new Date(fecha);

    if (Number.isNaN(fechaMensaje.getTime())) {
      return "";
    }

    return fechaMensaje.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Construye un elemento de mensaje utilizando exclusivamente
   * textContent y creación de nodos.
   */
  function crearMensaje(mensaje) {
    const elemento = document.createElement("article");
    elemento.classList.add("chat__mensaje");

    if (mensaje.tipo === "sistema") {
      elemento.classList.add("chat__mensaje--sistema");
    } else if (mensaje.tipo === "asistente") {
      elemento.classList.add("chat__mensaje--asistente");
    } else {
      elemento.classList.add("chat__mensaje--usuario");

      if (mensaje.tipo === "usuario" && mensaje.autor && String(mensaje.autor.id) === usuarioId) {
        elemento.classList.add("chat__mensaje--propio");
      }
    }

    const burbuja = document.createElement("div");
    burbuja.classList.add("chat__burbuja");

    // Los mensajes de sistema no tienen autor.
    if (mensaje.tipo !== "sistema") {
      const autor = document.createElement("span");
      autor.classList.add("chat__autor");

      autor.textContent =
        mensaje.tipo === "asistente"
          ? mensaje.autor?.nombre || "Gemini"
          : mensaje.autor?.nombre || "Usuario";

      burbuja.appendChild(autor);
    }

    const texto = document.createElement("p");
    texto.classList.add("chat__texto-mensaje");
    texto.textContent = mensaje.texto;

    burbuja.appendChild(texto);

    // Los avisos del sistema no necesitan mostrar una fecha.
    if (mensaje.tipo !== "sistema") {
      const fecha = document.createElement("time");
      fecha.classList.add("chat__fecha");

      fecha.textContent = formatearFecha(mensaje.fecha);

      if (mensaje.fecha) {
        fecha.dateTime = mensaje.fecha;
      }

      burbuja.appendChild(fecha);
    }

    elemento.appendChild(burbuja);

    return elemento;
  }

  /**
   * Incorpora un mensaje y conserva solamente los últimos 200.
   */
  function agregarMensaje(mensaje) {
    if (!mensaje || typeof mensaje !== "object" || typeof mensaje.texto !== "string") {
      return;
    }

    if (!["usuario", "asistente", "sistema"].includes(mensaje.tipo)) {
      return;
    }

    const elemento = crearMensaje(mensaje);

    contenedorMensajes.appendChild(elemento);

    mensajeVacio.hidden = true;

    while (contenedorMensajes.querySelectorAll(".chat__mensaje").length > LIMITE_MENSAJES) {
      const primerMensaje = contenedorMensajes.querySelector(".chat__mensaje");

      primerMensaje.remove();
    }

    // Mantiene visible el mensaje más reciente.
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
  }

  /**
   * Conecta el cliente al servidor Socket.IO del mismo origen.
   * La cookie HTTP-only se envía automáticamente en el handshake.
   */
  const socket = window.io();

  // Conexión establecida o restablecida.
  socket.on("connect", () => {
    if (sesionExpirada) return;

    botonReconectar.hidden = true;
    actualizarEstado("conectado", "Conectado");
    actualizarFormulario();
    limpiarError();
  });

  // Pérdida de conexión.
  // Si el servidor corta la conexión (exceso de mensajes o de pestañas),
  // Socket.IO no reintenta solo: se ofrece reconectar manualmente.
  socket.on("disconnect", (motivo) => {
    if (sesionExpirada) return;

    actualizarFormulario();
    mostrarGeminiPensando(false);

    if (motivo === "io server disconnect") {
      actualizarEstado("desconectado", "Desconectado");
      botonReconectar.hidden = false;
    } else {
      actualizarEstado("reconectando", "Reconectando...");
    }
  });

  // Error durante el handshake o al intentar conectar.
  socket.on("connect_error", (err) => {
    if (sesionExpirada) return;

    actualizarFormulario();

    if (err.message === "No autorizado") {
      finalizarSesion();
      return;
    }

    actualizarEstado("reconectando", "No se pudo conectar. Reintentando...");
    mostrarError("No se pudo establecer la conexión con el chat.");
  });

  // Recepción de mensajes de usuarios, sistema o asistente.
  // Cuando responde el asistente, se oculta el aviso de espera.
  socket.on(EVENTOS.MENSAJE, (mensaje) => {
    if (mensaje?.tipo === "asistente") {
      mostrarGeminiPensando(false);
    }

    agregarMensaje(mensaje);
  });

  // Errores comunicados por el backend (por ejemplo, el cooldown de Gemini).
  socket.on(EVENTOS.ERROR, (datos) => {
    mostrarGeminiPensando(false);

    const mensaje =
      typeof datos?.mensaje === "string"
        ? datos.mensaje
        : "Ocurrió un error al procesar el mensaje.";

    mostrarError(mensaje);
  });

  // La sesión dejó de ser válida durante la conexión.
  socket.on(EVENTOS.SESION_EXPIRADA, () => {
    finalizarSesion();
  });

  // Reconexión manual después de una desconexión iniciada por el servidor.
  botonReconectar.addEventListener("click", () => {
    botonReconectar.hidden = true;
    limpiarError();
    actualizarEstado("conectando", "Conectando...");
    socket.connect();
  });

  /**
   * Actualiza el contador de caracteres.
   */
  function actualizarContador() {
    contador.textContent = `${campoTexto.value.length}/${LIMITE_TEXTO}`;
  }

  campoTexto.addEventListener("input", actualizarContador);

  /**
   * Envía solamente el texto. El servidor construye el resto
   * de los datos del mensaje y lo difunde a todos los clientes.
   */
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (!socket.connected || sesionExpirada) return;

    const texto = campoTexto.value.trim();

    if (!texto || texto.length > LIMITE_TEXTO) return;

    limpiarError();

    socket.emit(EVENTOS.MENSAJE, { texto });

    // Las consultas a Gemini son asíncronas: se avisa que la respuesta está en camino.
    if (/^@gemini\b/i.test(texto)) {
      mostrarGeminiPensando(true);
    }

    campoTexto.value = "";
    actualizarContador();
    campoTexto.focus();
  });

  /**
   * Enter envía el mensaje.
   * Shift + Enter permite escribir en una nueva línea.
   */
  campoTexto.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      formulario.requestSubmit();
    }
  });

  // Estado inicial.
  actualizarEstado("conectando", "Conectando...");
  actualizarFormulario();
  actualizarContador();
})();
