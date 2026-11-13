# Arquitectura del proyecto

## 1. Propósito

El proyecto utiliza una arquitectura modular por capas para separar responsabilidades, facilitar el mantenimiento y evitar que la lógica de negocio dependa directamente de las rutas o de la interfaz.

La organización permite desarrollar y modificar funcionalidades sin concentrar toda la lógica en un único módulo.

## 2. Organización general

| Directorio / archivo | Responsabilidad                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/`            | Define los endpoints y vincula cada ruta con su controlador y los middlewares correspondientes.                                                                        |
| `controllers/`       | Recibe las solicitudes, coordina la operación y construye las respuestas HTTP.                                                                                         |
| `services/`          | Contiene la lógica de negocio y coordina las operaciones sobre los datos y los servicios externos, como el servicio de Gemini.                                         |
| `models/`            | Define los esquemas de Mongoose y las estructuras persistidas en MongoDB.                                                                                              |
| `definitions/`       | Centraliza definiciones y estructuras compartidas por las distintas entidades.                                                                                         |
| `middlewares/`       | Gestiona autenticación, validación de datos, manejo de errores y operaciones asíncronas HTTP.                                                                          |
| `errors/`            | Define los errores propios de la aplicación y traduce errores de persistencia.                                                                                         |
| `utils/`             | Agrupa funciones reutilizables, como el manejo de cookies, JWT y traducción de errores de Mongoose.                                                                    |
| `sockets/`           | Configura Socket.IO y organiza la autenticación y revalidación de sesiones, la gestión de conexiones, los límites de uso, los eventos y el manejo de errores del chat. |
| `config/`            | Contiene la configuración de servicios externos, como la conexión a MongoDB.                                                                                           |
| `views/`             | Contiene las vistas Pug utilizadas para renderizar la interfaz.                                                                                                        |
| `public/`            | Almacena los recursos estáticos y los scripts del navegador.                                                                                                           |
| `scripts/`           | Incluye herramientas para generar, validar y cargar datos de prueba, además de scripts auxiliares.                                                                     |
| `tests/`             | Organiza las pruebas de API, unitarias y de Socket.IO.                                                                                                                 |
| `prompts/`           | Contiene las instrucciones de contexto utilizadas por el servicio de Gemini.                                                                                           |

## 3. Responsabilidades y flujo de ejecución

La aplicación separa el procesamiento de las solicitudes HTTP en distintas responsabilidades:

- **Rutas:** determinan qué operación corresponde a cada endpoint.
- **Controladores:** reciben los datos de la solicitud, invocan la operación necesaria y devuelven la respuesta.
- **Servicios:** aplican las reglas de negocio y coordinan las operaciones necesarias.
- **Modelos:** gestionan la estructura, las validaciones y la persistencia de los datos.

No todas las operaciones necesitan atravesar todas las capas. Se incorporan servicios y módulos auxiliares cuando la responsabilidad lo justifica, evitando abstracciones innecesarias.

### Comunicación en tiempo real

El chat utiliza Socket.IO sobre el mismo servidor HTTP que Express, pero su funcionamiento es independiente del flujo de solicitudes HTTP.

Las conexiones se autentican durante el handshake y las operaciones posteriores se procesan mediante manejadores de eventos.

El módulo de sockets coordina la validación de mensajes, la revalidación de sesiones, la gestión de conexiones, la difusión de eventos y la integración con el servicio de Gemini.

Las consultas a Gemini se ejecutan de manera asíncrona, evitando bloquear el procesamiento de otros mensajes del chat.

En consecuencia, el proyecto contempla dos flujos principales:

- **HTTP:** rutas → controladores → servicios → modelos, según las necesidades de cada operación.
- **Socket.IO:** conexión autenticada → manejadores de eventos → servicios cuando corresponde.

## 4. Definiciones y validaciones

Las definiciones de `definitions/` centralizan estructuras y valores compartidos para mantener criterios consistentes entre los módulos.

Las validaciones se distribuyen según su responsabilidad:

- **Entrada de datos:** los middlewares de `validarDatos.js` comprueban los datos recibidos y los identificadores cuando corresponde.
- **Reglas de negocio:** los servicios verifican las condiciones necesarias para realizar cada operación.
- **Persistencia:** los esquemas de Mongoose aplican las validaciones correspondientes antes de guardar los datos.

Esta separación evita concentrar todas las validaciones en un único lugar.

## 5. Manejo de errores

El manejo de errores está centralizado para mantener respuestas consistentes:

- `errors/errores.js`: define las clases de errores propias de la aplicación.
- `middlewares/asyncHandler.js`: facilita el manejo de errores en operaciones asíncronas HTTP.
- `middlewares/errorHandler.js`: centraliza el tratamiento de errores y las respuestas HTTP.
- `errors/traducirError.js`: traduce errores de persistencia a errores comprensibles para la aplicación.
- `sockets/asyncHandlerSocket.js`: permite manejar errores de operaciones asíncronas en los manejadores de eventos de Socket.IO.
- `sockets/errorSocket.js`: centraliza el tratamiento de errores del chat, diferenciando errores controlados de fallos inesperados y gestionando los avisos al cliente y las desconexiones cuando corresponde.

Los errores de Socket.IO se gestionan mediante un mecanismo propio, separado del middleware de errores HTTP, aunque ambos siguen criterios comunes de centralización y respuestas controladas.

El detalle de los tipos de errores y sus respuestas HTTP se encuentra en [ERRORS.md](./ERRORS.md).

## 6. Persistencia de datos

La aplicación utiliza MongoDB como base de datos y Mongoose como herramienta de modelado y acceso a los datos.

Las relaciones entre entidades se representan mediante referencias o subdocumentos embebidos, según las necesidades del dominio.

Por ejemplo, un evento referencia una sala y contiene la información de su reserva como subdocumento. Esta decisión permite mantener vinculados los datos que forman parte del mismo contexto.

Las operaciones de actualización deben respetar las validaciones del modelo y evitar reemplazar estructuras anidadas innecesariamente.

## 7. Inicialización e infraestructura

La inicialización de la aplicación se distribuye entre los siguientes módulos:

- `app.js`: configura Express, los middlewares, las rutas, las vistas y los recursos estáticos.
- `server.js`: carga la configuración de entorno, crea el servidor HTTP compartido, inicializa Socket.IO, establece la conexión con la base de datos y finalmente inicia la escucha de solicitudes.
- `config/db.js`: administra la conexión con MongoDB.
- `sockets/`: configura Socket.IO sobre el servidor HTTP existente y registra los mecanismos de autenticación y los manejadores de eventos.

Express y Socket.IO comparten el mismo servidor HTTP.

El funcionamiento específico del chat, sus eventos, validaciones, límites, reconexión e integración con Gemini se documenta en [CHAT.md](./docs/CHAT.md).

## 8. Criterios de desarrollo

Para mantener la arquitectura consistente, se siguen estos criterios:

- Mantener cada módulo enfocado en una responsabilidad.
- Evitar duplicar reglas de negocio y validaciones.
- Centralizar el manejo de errores.
- Respetar las validaciones y la integridad de los datos.
- Evitar dependencias circulares y acoplamiento innecesario.
- Incorporar abstracciones únicamente cuando aporten claridad o reutilización.
- Preservar el comportamiento existente al refactorizar.

La estructura busca favorecer un desarrollo modular, mantenible y coherente con las necesidades del sistema.
