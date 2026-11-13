# Pruebas automatizadas

Las pruebas automatizadas documentan el comportamiento actual del backend y funcionan como una red de seguridad para detectar regresiones durante el desarrollo y las refactorizaciones.

## Requisitos

- Node.js compatible con el proyecto.
- MongoDB local en ejecución.
- Archivo `.env` con `MONGODB_URI` apuntando a la base de datos local destinada a desarrollo y pruebas.

## Ejecución

Para ejecutar toda la suite:

```bash
npm test
```

Para ejecutar un archivo puntual:

```bash
node --test tests/api/usuarios.test.js
```

Se puede reemplazar la ruta por la del archivo que se quiera ejecutar.

## Seguridad de los datos

La suite **no ejecuta `seed.js`, no vacía colecciones ni elimina la base de datos**.

Los helpers registran los `_id` de los documentos que crean y, al finalizar cada archivo de pruebas, eliminan únicamente esos documentos.

Aun así, las pruebas escriben datos en la base indicada por `MONGODB_URI`. Antes de ejecutarlas, verificá que esa variable apunte a tu MongoDB local y no a Atlas ni a una base compartida.

## Organización

Las pruebas se distribuyen en las siguientes categorías:

### Helpers

- `helpers/environment.js`: administra la conexión a MongoDB, el servidor HTTP temporal, los clientes de Socket.IO, las peticiones y los datos de prueba.

### Pruebas de API

Verifican el comportamiento de los endpoints, las vistas y su interacción con la aplicación y la base de datos.

- `api/auth.test.js`: operaciones y comportamiento de los endpoints relacionados con la autenticación.
- `api/usuarios.test.js`: operaciones de usuarios y reglas de acceso.
- `api/salas.test.js`: consultas, registro, actualización y reglas de negocio de salas.
- `api/eventos.test.js`: consultas, creación, actualización y reglas de negocio de eventos.
- `api/entradas.test.js`: venta, cancelación y consultas de entradas.
- `api/reservas.test.js`: consultas y permisos de acceso a reservas.
- `api/vistas.test.js`: comportamiento de las rutas que renderizan las vistas de la aplicación.
- `api/smoke.test.js`: pruebas generales de funcionamiento de la API.

### Pruebas de Socket.IO

Verifican la autenticación de conexiones, la comunicación entre clientes, los eventos y el comportamiento del chat.

- `sockets/auth.test.js`: autenticación de conexiones y validación de sesiones durante el handshake.
- `sockets/conexion.test.js`: conexiones simultáneas, comunicación entre clientes, validación de mensajes y límites de uso.
- `sockets/error.test.js`: manejo de errores en las conexiones y operaciones de Socket.IO.
- `sockets/geminiSocket.test.js`: integración del servicio de Gemini con el chat, respuestas del asistente, errores y restricciones de uso.

### Pruebas unitarias

Verifican componentes individuales del backend y sus comportamientos específicos.

**Errores**

- `unit/errors/traducirError.test.js`: traducción de errores a respuestas y códigos HTTP.

**Middlewares**

- `unit/middlewares/auth.test.js`: comportamiento del middleware de autenticación y autorización.
- `unit/middlewares/errorHandler.test.js`: manejo centralizado de errores HTTP.
- `unit/middlewares/validarDatos.test.js`: validación de datos de entrada.

**Servicios**

- `unit/services/aiService.test.js`: servicio de consultas a Gemini mediante un cliente simulado. Incluye respuestas correctas, validaciones y distintos escenarios de error.
- `unit/services/authService.test.js`: comportamiento del servicio de autenticación.

**Socket.IO**

- `unit/sockets/index.test.js`: ciclo de vida de la instancia de Socket.IO (`inicializarSockets`, `obtenerIO` y `cerrarSockets`).
- `unit/sockets/mencionGemini.test.js`: detección y extracción de consultas dirigidas a Gemini dentro de los mensajes.

**Utilidades**

- `unit/utils/cookies.test.js`: utilidades para establecer y limpiar cookies.
- `unit/utils/jwt.test.js`: generación y manejo de tokens JWT.
- `unit/utils/traductoresMongoose.test.js`: traducción de definiciones de atributos a tipos y validadores de Mongoose.

## Alcance y criterios de prueba

La suite prioriza la verificación de:

- Códigos de estado HTTP y estructura de las respuestas.
- Validaciones de datos y reglas de negocio.
- Autenticación, autorización y permisos de acceso.
- Efectos de las operaciones sobre los documentos persistidos.
- Renderizado de vistas.
- Comportamiento de middlewares, servicios y utilidades.
- Autenticación, conexiones y comunicación mediante Socket.IO.
- Integración del asistente de Gemini con el chat.
- Manejo y traducción de errores.

Las pruebas de API utilizan sus propios datos y no dependen de los registros precargados por `seed.js`.

Las pruebas unitarias del servicio de Gemini utilizan un cliente simulado, por lo que no requieren realizar consultas reales a la API para verificar su comportamiento.

Algunos comportamientos implementados se conservan intencionalmente como línea base, aunque estén identificados para una posible revisión. Si una decisión funcional cambia, debe actualizarse el test correspondiente junto con la implementación.

## Cobertura pendiente de ampliar

La suite cubre los principales componentes y flujos del backend, pero no reemplaza la revisión de todos los casos límite ni las verificaciones manuales de la aplicación.

Los escenarios pendientes de ampliar deben identificarse a partir de las reglas de negocio y de los casos que todavía no cuenten con pruebas específicas. La incorporación de nuevas pruebas debe acompañar los cambios funcionales y las refactorizaciones.
