# Chat en tiempo real

## 1. Objetivo y alcance

Urbana Cult cuenta con un chat en tiempo real que permite a los usuarios autenticados intercambiar mensajes y recibir notificaciones sobre la conexión y desconexión de otros participantes.

El chat está implementado con Socket.IO e incluye una integración con Gemini que permite realizar consultas desde la conversación mediante la mención `@gemini`.

Los mensajes se difunden a los clientes conectados, pero no se almacenan en una base de datos ni se mantiene un historial persistente.

## 2. Arquitectura y funcionamiento

### Conexión y autenticación

Socket.IO utiliza el mismo servidor HTTP que Express. De esta manera, la aplicación comparte el servidor para las rutas HTTP y la comunicación en tiempo real.

El cliente establece la conexión mediante el mismo origen de la aplicación. Durante el handshake, el servidor obtiene el token de la cookie HTTP-only y valida la sesión.

Si la autenticación es correcta, los datos mínimos del usuario se guardan en `socket.data`. La sesión también se revalida antes de aceptar cada mensaje, para comprobar que el token no haya expirado y que el usuario continúe activo.

### Conexiones y presencia

El servidor admite hasta tres conexiones simultáneas por usuario.

Los avisos de presencia se gestionan considerando las conexiones activas:

- Cuando se conecta el primer socket de un usuario, se difunde un mensaje de sistema indicando su ingreso.
- Cuando se desconecta su último socket, se difunde un mensaje indicando su salida.

Esto evita generar avisos duplicados cuando un mismo usuario tiene varias pestañas o dispositivos conectados.

### Envío y difusión de mensajes

El cliente envía únicamente el texto del mensaje. El servidor valida el contenido y construye el resto de los datos, incluyendo identificador, tipo, autor y fecha.

Una vez validado, el mensaje se difunde a todos los clientes conectados mediante `io.emit`.

El servidor es responsable de determinar la identidad del autor. El cliente no puede establecer arbitrariamente el identificador, nombre o fecha del mensaje.

### Manejo de errores

Los handlers asíncronos de Socket.IO utilizan un wrapper que deriva los errores al manejador centralizado.

El tratamiento depende del tipo de error:

- Los errores de autenticación o autorización provocan la emisión de `chat:sesion-expirada` y la desconexión del socket.
- Los errores operativos de cliente se comunican mediante `chat:error`.
- Los errores internos se registran en el servidor y se informa al cliente mediante un mensaje genérico, sin exponer detalles técnicos.

## 3. Eventos y estructura de mensajes

Los nombres de los eventos y los tipos de mensajes se centralizan en `sockets/eventos.js`.

### Eventos

| Evento                 | Dirección           | Descripción                                        |
| ---------------------- | ------------------- | -------------------------------------------------- |
| `chat:mensaje`         | Cliente → servidor  | Envía un mensaje de texto.                         |
| `chat:mensaje`         | Servidor → clientes | Difunde mensajes de usuarios, sistema o asistente. |
| `chat:error`           | Servidor → cliente  | Comunica un error.                                 |
| `chat:sesion-expirada` | Servidor → cliente  | Indica que la sesión dejó de ser válida.           |

### Payload de entrada

El cliente debe enviar un objeto plano que contenga únicamente la propiedad `texto`:

```js
{
  texto: "Hola, ¿cómo están?";
}
```

El servidor rechaza payloads que no respeten esta estructura, incluyendo propiedades adicionales, arreglos, objetos que no sean planos o valores de texto que no sean cadenas.

Los mensajes vacíos o que superen la longitud permitida también son rechazados.

### Mensajes difundidos

Los mensajes construidos por el servidor tienen la siguiente estructura general:

```js
{
  id: "identificador único",
  tipo: "usuario",
  autor: {
    id: "identificador del usuario",
    nombre: "Nombre"
  },
  texto: "Contenido del mensaje",
  fecha: "fecha en formato ISO"
}
```

Existen tres tipos de mensajes:

| Tipo        | Descripción                          | Autor                            |
| ----------- | ------------------------------------ | -------------------------------- |
| `usuario`   | Mensaje enviado por un participante. | Datos del usuario autenticado.   |
| `asistente` | Respuesta generada por Gemini.       | `{ id: null, nombre: "Gemini" }` |
| `sistema`   | Aviso de conexión o desconexión.     | `null`                           |

Los mensajes de sistema no incluyen información de autor ni necesitan mostrar una fecha en la interfaz.

### Errores comunicados al cliente

Los errores enviados mediante `chat:error` utilizan esta estructura:

```js
{
  mensaje: "Descripción del error";
}
```

## 4. Validaciones y límites

El servidor aplica límites para controlar el uso del chat y evitar el envío excesivo de mensajes.

| Aspecto                             | Límite o comportamiento                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Longitud del mensaje                | 500 caracteres.                                                          |
| Frecuencia de mensajes              | 5 mensajes cada 10 segundos por usuario.                                 |
| Rechazos por exceso                 | Al tercer rechazo se desconecta el socket que realizó el último intento. |
| Conexiones simultáneas              | Máximo de 3 por usuario.                                                 |
| Cooldown de Gemini                  | 10 segundos por usuario.                                                 |
| Tamaño máximo del paquete           | 16 KiB.                                                                  |
| Mensajes conservados en la interfaz | Últimos 200.                                                             |

El límite de 16 KiB corresponde al tamaño máximo del paquete configurado en Socket.IO mediante `maxHttpBufferSize`. Es independiente del límite de 500 caracteres aplicado al texto del mensaje.

El control de frecuencia se comparte entre las conexiones de un mismo usuario. Los intentos con payloads inválidos también cuentan para ese límite.

Los rechazos se acumulan por usuario y, al alcanzar el máximo configurado, se desconecta el socket que realizó el intento correspondiente.

Los límites de frecuencia, las conexiones activas y el cooldown se mantienen en memoria del servidor. No se almacenan en MongoDB.

## 5. Integración con Gemini

El chat permite solicitar respuestas de Gemini mediante la mención `@gemini` al comienzo de un mensaje.

### Detección de menciones

La función `extraerConsultaGemini`, ubicada en `sockets/mencionGemini.js`, identifica las consultas dirigidas al asistente.

La detección cumple las siguientes condiciones:

- La mención debe aparecer al comienzo del mensaje.
- No distingue entre mayúsculas y minúsculas.
- Debe estar seguida de una consulta no vacía.
- El resto del mensaje se utiliza como contenido de la consulta.

Ejemplo:

```text
@gemini ¿Qué es Urbana Cult?
```

Si la mención no cumple estas condiciones, la función devuelve `null` y no se realiza una consulta al asistente.

### Procesamiento de consultas

Cuando el servidor recibe un mensaje válido que contiene una consulta dirigida a Gemini:

1. Difunde primero el mensaje original del usuario.
2. Comprueba el cooldown correspondiente.
3. Inicia la consulta de manera asíncrona.
4. Recibe la respuesta del servicio.
5. Difunde un nuevo mensaje de tipo `asistente`.

La consulta a Gemini no bloquea el procesamiento de otros mensajes del chat.

El servicio se encuentra separado de la lógica de Socket.IO en `services/aiService.js`. Recibe un texto y devuelve una respuesta, sin depender directamente de los sockets ni de la interfaz.

### Configuración del servicio

El servicio utiliza la biblioteca `@google/genai` y requiere una clave de API configurada mediante la variable de entorno `GEMINI_API_KEY`.

La variable `GEMINI_MODEL` permite seleccionar el modelo. Si no está definida, se utiliza el modelo predeterminado configurado en el servicio: `gemini-3.5-flash-lite`.

El servicio también establece los siguientes límites:

| Parámetro                    | Valor            |
| ---------------------------- | ---------------- |
| Tiempo máximo de espera      | 15 segundos.     |
| Longitud máxima de consulta  | 1000 caracteres. |
| Longitud máxima de respuesta | 1500 caracteres. |
| Máximo de tokens de salida   | 1024.            |
| Reintentos automáticos       | No se realizan.  |

El contexto y las instrucciones del asistente se encuentran en `prompts/asistente.md`.

Si Gemini no está disponible o se produce un error durante la consulta, el servidor informa que no fue posible obtener una respuesta. El chat continúa funcionando independientemente de ese fallo.

## 6. Reconexión y persistencia

El cliente utiliza el mecanismo de reconexión automática predeterminado de Socket.IO.

Cuando se pierde la conexión, la interfaz actualiza el estado del chat y deshabilita el formulario. Cuando se restablece, vuelve a habilitar el envío de mensajes.

Cada nueva conexión requiere un nuevo handshake, durante el cual el servidor vuelve a validar la sesión mediante la cookie HTTP-only.

Si el servidor informa que la sesión expiró o no es válida, el cliente bloquea el chat y no intenta continuar la conexión.

### Persistencia de mensajes

El chat no implementa almacenamiento persistente de mensajes ni recuperación del historial.

La interfaz conserva únicamente los últimos 200 mensajes recibidos durante la sesión actual de la página. Al recargarla, no se recuperan los mensajes anteriores.

Tampoco existe una cola de mensajes pendientes. Mientras el socket está desconectado, el formulario permanece deshabilitado y no permite enviar mensajes desde la interfaz.

Por lo tanto, no se garantiza la entrega ni la recuperación de mensajes durante una interrupción de la conexión.

## 7. Pruebas automatizadas

El proyecto utiliza el test runner incorporado de Node.js.

La documentación general sobre requisitos, ejecución, organización y alcance de las pruebas se encuentra en `tests/README.md`.

Para ejecutar toda la suite:

```bash
npm test
```

Para ejecutar las pruebas relacionadas con Socket.IO:

```bash
node --test tests/sockets/conexion.test.js
node --test tests/sockets/auth.test.js
node --test tests/sockets/error.test.js
node --test tests/sockets/geminiSocket.test.js
```

Para ejecutar las pruebas unitarias del servicio de Gemini:

```bash
node --test tests/unit/services/aiService.test.js
```

Estas pruebas cubren la autenticación, la validación de mensajes, los límites de conexión y frecuencia, la difusión de mensajes, el manejo de errores, la detección de menciones y la integración del servicio de Gemini.
