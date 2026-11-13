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

Verifican el comportamiento de los endpoints y su interacción con la base de datos.

- `api/usuarios.test.js`: operaciones de usuarios, autenticación y autorización.
- `api/salas.test.js`: consultas, registro, actualización y reglas de negocio de salas.
- `api/eventos.test.js`: consultas, creación, actualización y reglas de negocio de eventos.
- `api/entradas.test.js`: venta, cancelación y consultas de entradas.
- `api/reservas.test.js`: consultas y permisos de acceso a reservas.
- `api/smoke.test.js`: pruebas generales de funcionamiento de la API.

### Pruebas de Socket.IO

- `sockets/conexion.test.js`: comportamiento de las conexiones, comunicación entre clientes y eventos de Socket.IO.

### Pruebas unitarias

Verifican componentes individuales del backend sin depender de la ejecución completa de la aplicación.

- `unit/errors/traducirError.test.js`: traducción de errores a respuestas y códigos HTTP.
- `unit/middlewares/auth.test.js`: comportamiento del middleware de autenticación y autorización.
- `unit/middlewares/errorHandler.test.js`: manejo centralizado de errores.
- `unit/middlewares/validarDatos.test.js`: validación de datos de entrada.
- `unit/services/aiService.test.js`: servicio de consultas a Gemini mediante un cliente simulado. Incluye respuestas correctas y distintos escenarios de error.
- `unit/sockets/index.test.js`: ciclo de vida de la instancia de Socket.IO (`inicializarSockets`, `obtenerIO` y `cerrarSockets`).
- `unit/utils/cookies.test.js`: utilidades para establecer y limpiar cookies.
- `unit/utils/jwt.test.js`: generación y manejo de tokens JWT.
- `unit/utils/traductoresMongoose.test.js`: traducción de definiciones de atributos a tipos y validadores de Mongoose.

## Alcance y criterios de prueba

La suite prioriza la verificación de:

- Códigos de estado HTTP y estructura de las respuestas.
- Validaciones de datos y reglas de negocio.
- Autenticación, autorización y permisos de acceso.
- Efectos de las operaciones sobre los documentos persistidos.
- Comportamiento de middlewares, servicios y utilidades.
- Conexiones y comunicación mediante Socket.IO.
- Manejo y traducción de errores.

Las pruebas de API utilizan sus propios datos y no dependen de los registros precargados por `seed.js`.

Algunos comportamientos implementados se conservan intencionalmente como línea base, aunque estén identificados para una posible revisión. Si una decisión funcional cambia, debe actualizarse el test correspondiente junto con la implementación.

## Cobertura pendiente de ampliar

La suite cubre los principales componentes y flujos del backend, pero no reemplaza la revisión de todos los casos límite.

Los escenarios pendientes de ampliar deben identificarse a partir de las reglas de negocio y de los casos que todavía no cuenten con pruebas específicas. La incorporación de nuevas pruebas debe acompañar los cambios funcionales y las refactorizaciones.
