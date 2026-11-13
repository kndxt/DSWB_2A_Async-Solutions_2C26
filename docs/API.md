# API – Documentación de endpoints

## 1. Introducción

Este documento describe los endpoints disponibles en la API del proyecto, sus parámetros, requisitos de acceso, reglas de negocio y respuestas.

La documentación se organiza por módulos funcionales y refleja el comportamiento implementado en el backend.

## 2. Información general

- **Protocolo:** HTTP.
- **Formato de intercambio:** JSON, excepto las rutas destinadas a renderizar vistas.
- **Base de datos:** MongoDB.
- **Autenticación:** sesión mediante cookie.
- **Códigos de estado:** se utilizan los códigos HTTP correspondientes al resultado de cada operación.

### 2.1. Autenticación y autorización

Los endpoints protegidos requieren una sesión autenticada.

Los permisos dependen del rol del usuario:

| Rol       | Descripción                                                |
| --------- | ---------------------------------------------------------- |
| `CLIENTE` | Usuario que realiza operaciones habilitadas para clientes. |
| `ADMIN`   | Usuario con permisos administrativos.                      |

La identidad del usuario autenticado se obtiene de la sesión. Los datos enviados por el cliente no pueden reemplazarla en las operaciones que dependen de esa identidad.

### 2.2. Convenciones de respuestas y errores

Las respuestas exitosas utilizan JSON, salvo los endpoints destinados a renderizar vistas.

Los errores de la API utilizan el siguiente formato:

```json
{
  "error": "Descripción del error"
}
```

Los códigos HTTP y las clases de errores se documentan en [ERRORS.md](./ERRORS.md).

---

## 3. Módulos de la API

### 3.1. Usuarios

Este módulo permite registrar usuarios, consultar y actualizar sus datos, gestionar sus roles y estados, e iniciar o cerrar sesión.

**Prefijo:** `/usuarios`

#### Endpoints

| Método  | Endpoint               | Acceso      | Descripción                              |
| ------- | ---------------------- | ----------- | ---------------------------------------- |
| `POST`  | `/usuarios`            | Público     | Registrar un usuario.                    |
| `POST`  | `/usuarios/login`      | Público     | Iniciar sesión.                          |
| `POST`  | `/usuarios/logout`     | Autenticado | Cerrar la sesión actual.                 |
| `GET`   | `/usuarios`            | ADMIN       | Obtener todos los usuarios.              |
| `GET`   | `/usuarios/:id`        | ADMIN       | Obtener un usuario por su identificador. |
| `PUT`   | `/usuarios/:id`        | ADMIN       | Actualizar los datos de un usuario.      |
| `PATCH` | `/usuarios/:id/estado` | ADMIN       | Cambiar el estado de un usuario.         |
| `PATCH` | `/usuarios/:id/rol`    | ADMIN       | Cambiar el rol de un usuario.            |

#### Registro de usuarios

**`POST /usuarios`**

Permite registrar un nuevo usuario sin iniciar sesión.

**Cuerpo de la solicitud:**

| Campo      | Tipo   | Obligatorio | Restricciones                                       |
| ---------- | ------ | ----------- | --------------------------------------------------- |
| `nombre`   | String | Sí          | No puede estar vacío.                               |
| `apellido` | String | Sí          | No puede estar vacío.                               |
| `email`    | Email  | Sí          | Debe tener un formato válido y no estar registrado. |
| `password` | String | Sí          | No puede estar vacío.                               |
| `telefono` | String | No          | —                                                   |

El estado y el rol iniciales se asignan automáticamente en el servidor.

**Respuesta exitosa:** `201 Created`. Devuelve los datos del usuario creado, sin exponer su contraseña.

**Errores posibles:**

- `400 Bad Request`: faltan datos obligatorios o alguno no cumple las validaciones.
- `409 Conflict`: el email ya se encuentra registrado.

#### Inicio y cierre de sesión

**`POST /usuarios/login`**

Permite iniciar sesión con las credenciales de un usuario registrado.

| Campo      | Tipo   | Obligatorio |
| ---------- | ------ | ----------- |
| `email`    | Email  | Sí          |
| `password` | String | Sí          |

Si las credenciales son correctas y el usuario está activo, se genera un token de autenticación que se establece mediante una cookie.

**Respuesta exitosa:** `200 OK`. Devuelve un mensaje de confirmación y los datos del usuario autenticado.

**Errores posibles:**

- `400 Bad Request`: faltan credenciales o los datos no cumplen las validaciones.
- `401 Unauthorized`: las credenciales son incorrectas.
- `403 Forbidden`: el usuario se encuentra inactivo.

**`POST /usuarios/logout`**

Cierra la sesión del usuario autenticado mediante la eliminación de la cookie de autenticación. No requiere cuerpo de solicitud.

**Respuesta exitosa:** `200 OK`. Devuelve un mensaje de confirmación.

**Error posible:**

- `401 Unauthorized`: no existe una sesión autenticada válida.

#### Consultas de usuarios

**`GET /usuarios`**

Obtiene todos los usuarios registrados.

- **Acceso:** únicamente `ADMIN`.
- **Respuesta exitosa:** `200 OK`. Devuelve un array con los datos de los usuarios, sin incluir contraseñas.

**`GET /usuarios/:id`**

Obtiene un usuario por su identificador.

- **Acceso:** únicamente `ADMIN`.
- **Parámetro:** `id`, identificador del usuario (`ObjectId`).
- **Respuesta exitosa:** `200 OK`. Devuelve los datos del usuario solicitado, sin exponer su contraseña.

**Errores posibles:**

- `400 Bad Request`: identificador inválido.
- `404 Not Found`: usuario inexistente.

#### Actualización de usuarios

**`PUT /usuarios/:id`**

Actualiza los datos editables de un usuario.

- **Acceso:** únicamente `ADMIN`.
- **Parámetro:** `id`, identificador del usuario.
- **Cuerpo:** admite uno o varios de los siguientes campos, todos opcionales.

| Campo      | Tipo   | Restricciones                                                        |
| ---------- | ------ | -------------------------------------------------------------------- |
| `nombre`   | String | No puede estar vacío.                                                |
| `apellido` | String | No puede estar vacío.                                                |
| `email`    | Email  | Debe tener un formato válido y no estar registrado por otro usuario. |
| `telefono` | String | —                                                                    |
| `password` | String | No puede estar vacío.                                                |

Los campos no enviados conservan sus valores actuales. Los campos desconocidos o protegidos, como `id`, `estado` y `rol`, se ignoran.

Si se modifica la contraseña, se almacena su versión cifrada mediante bcrypt.

**Respuesta exitosa:** `200 OK`. Devuelve los datos actualizados, sin exponer la contraseña.

**Errores posibles:**

- `400 Bad Request`: identificador inválido o datos que no cumplen las validaciones.
- `404 Not Found`: usuario inexistente.
- `409 Conflict`: el email ya está registrado por otro usuario.

#### Gestión de estado y rol

Estas operaciones permiten modificar atributos administrativos de manera independiente de los datos personales.

**`PATCH /usuarios/:id/estado`**

Cambia el estado de un usuario.

- **Acceso:** únicamente `ADMIN`.
- **Parámetro:** `id`, identificador del usuario.

| Campo    | Tipo   | Obligatorio | Valores permitidos   |
| -------- | ------ | ----------- | -------------------- |
| `estado` | String | Sí          | `activo`, `inactivo` |

**`PATCH /usuarios/:id/rol`**

Cambia el rol de un usuario.

- **Acceso:** únicamente `ADMIN`.
- **Parámetro:** `id`, identificador del usuario.

| Campo | Tipo   | Obligatorio | Valores permitidos |
| ----- | ------ | ----------- | ------------------ |
| `rol` | String | Sí          | `admin`, `cliente` |

Ambas operaciones responden `200 OK` y devuelven los datos actualizados.

**Errores posibles para ambas operaciones:**

- `400 Bad Request`: identificador inválido, campo obligatorio ausente o valor no permitido.
- `404 Not Found`: usuario inexistente.

#### Consideraciones de seguridad

- El registro y el inicio de sesión son operaciones públicas.
- Las consultas y operaciones de gestión requieren autenticación y rol `ADMIN`.
- El cierre de sesión requiere una sesión autenticada.
- Las contraseñas se almacenan mediante hash con bcrypt y nunca se exponen en las respuestas.
- La autenticación utiliza un token almacenado en una cookie.
- La actualización general no permite modificar el rol ni el estado; estos atributos cuentan con endpoints específicos.

### 3.2. Salas

Este módulo permite consultar, registrar y actualizar salas.

**Prefijo:** `/salas`

Todas las operaciones requieren autenticación y rol `ADMIN`. Los usuarios `CLIENTE` no tienen acceso a las consultas ni a la gestión de salas.

#### Endpoints

| Método  | Endpoint     | Acceso | Descripción                            |
| ------- | ------------ | ------ | -------------------------------------- |
| `GET`   | `/salas`     | ADMIN  | Obtener todas las salas.               |
| `GET`   | `/salas/:id` | ADMIN  | Obtener una sala por su identificador. |
| `POST`  | `/salas`     | ADMIN  | Registrar una sala.                    |
| `PATCH` | `/salas/:id` | ADMIN  | Actualizar parcialmente una sala.      |

#### Consultar salas

**`GET /salas`**

Obtiene todas las salas registradas.

- **Respuesta exitosa:** `200 OK`. Devuelve un array de salas.

**`GET /salas/:id`**

Obtiene una sala por su identificador.

- **Parámetro:** `id`, identificador de la sala (`ObjectId`).
- **Respuesta exitosa:** `200 OK`.

**Errores posibles:**

- `400 Bad Request`: identificador inválido.
- `404 Not Found`: sala inexistente.

#### Registrar una sala

**`POST /salas`**

Registra una nueva sala.

**Cuerpo de la solicitud:**

| Campo           | Tipo   | Obligatorio | Restricciones                                      |
| --------------- | ------ | ----------- | -------------------------------------------------- |
| `nombre`        | String | Sí          | No puede estar vacío.                              |
| `capacidad`     | Number | Sí          | Entero mayor o igual a 1.                          |
| `direccion`     | String | Sí          | No puede estar vacío.                              |
| `precioReserva` | Number | Sí          | Mayor o igual a 0.                                 |
| `responsable`   | Object | Sí          | Debe contener todos los atributos indicados abajo. |

**Objeto `responsable`:**

| Campo      | Tipo   | Obligatorio |
| ---------- | ------ | ----------- |
| `nombre`   | String | Sí          |
| `apellido` | String | Sí          |
| `telefono` | String | Sí          |
| `email`    | String | Sí          |

El estado inicial se asigna automáticamente como `activa` si no se especifica otro valor.

**Respuesta exitosa:** `201 Created`.

**Error posible:**

- `400 Bad Request`: datos obligatorios ausentes, tipos incorrectos o restricciones incumplidas.

Actualmente no se aplican restricciones de unicidad a los datos de las salas, por lo que se permite registrar salas con información repetida.

#### Actualizar una sala

**`PATCH /salas/:id`**

Actualiza parcialmente los datos de una sala.

- **Parámetro:** `id`, identificador de la sala.

**Cuerpo de la solicitud:**

| Campo           | Tipo   | Restricciones                                  |
| --------------- | ------ | ---------------------------------------------- |
| `nombre`        | String | No puede estar vacío.                          |
| `capacidad`     | Number | Entero mayor o igual a 1.                      |
| `direccion`     | String | No puede estar vacío.                          |
| `precioReserva` | Number | Mayor o igual a 0.                             |
| `responsable`   | Object | Permite actualizar sus atributos parcialmente. |
| `estado`        | String | `activa` o `inactiva`.                         |

Todos los campos son opcionales. Los no enviados conservan sus valores actuales. Las actualizaciones parciales de `responsable` modifican únicamente los atributos recibidos. Los campos desconocidos o protegidos se ignoran.

**Regla de negocio:** no se permite cambiar el estado de una sala de `activa` a `inactiva` si tiene eventos próximos en estado `activo`. Los eventos cancelados y los que ya comenzaron o cuya fecha de inicio pasó no impiden la inactivación.

**Respuesta exitosa:** `200 OK`.

**Errores posibles:**

- `400 Bad Request`: identificador inválido, tipos incorrectos o valores que incumplen las restricciones.
- `404 Not Found`: sala inexistente.
- `409 Conflict`: se intenta inactivar una sala que tiene eventos próximos activos.

#### Autenticación y autorización

| Situación                           | Respuesta                           |
| ----------------------------------- | ----------------------------------- |
| Usuario sin sesión                  | `401 Unauthorized`                  |
| Usuario autenticado sin rol `ADMIN` | `403 Forbidden`                     |
| Administrador autorizado            | Se procesa la operación solicitada. |

### 3.3. Eventos

Este módulo permite consultar, crear y actualizar eventos. Cada evento está asociado a una sala y contiene un registro histórico de la reserva generada al momento de su creación.

**Prefijo:** `/eventos`

#### Endpoints

| Método  | Endpoint            | Acceso  | Descripción                                    |
| ------- | ------------------- | ------- | ---------------------------------------------- |
| `GET`   | `/eventos`          | Público | Obtener todos los eventos.                     |
| `GET`   | `/eventos/proximos` | Público | Obtener los próximos eventos no cancelados.    |
| `GET`   | `/eventos/:id`      | Público | Obtener un evento por su identificador.        |
| `POST`  | `/eventos`          | ADMIN   | Crear un evento y generar su reserva asociada. |
| `PATCH` | `/eventos/:id`      | ADMIN   | Actualizar los datos de un evento.             |

#### Consultar eventos

**`GET /eventos`**

Devuelve un array con los eventos registrados.

**`GET /eventos/proximos`**

Devuelve los eventos cuya fecha de inicio todavía no pasó y cuyo estado no sea `cancelado`.

**`GET /eventos/:id`**

Devuelve el evento correspondiente al identificador indicado.

Las respuestas de consulta incluyen los datos del evento, pero no exponen el registro histórico de la reserva asociada.

**Respuesta exitosa para las consultas:** `200 OK`.

**Errores posibles:**

- `400 Bad Request`: identificador inválido.
- `404 Not Found`: evento inexistente.

#### Crear un evento

**`POST /eventos`**

Requiere autenticación y rol `ADMIN`.

**Cuerpo de la solicitud:**

| Campo              | Tipo     | Descripción                                                    |
| ------------------ | -------- | -------------------------------------------------------------- |
| `nombre`           | String   | Nombre del evento.                                             |
| `descripcion`      | String   | Descripción del evento (opcional).                             |
| `tipo`             | String   | Tipo o categoría del evento.                                   |
| `fechaInicio`      | Date     | Fecha y hora de inicio.                                        |
| `fechaFin`         | Date     | Fecha y hora de finalización.                                  |
| `fechaInicioVenta` | Date     | Inicio del período de venta de entradas.                       |
| `fechaFinVenta`    | Date     | Fin del período de venta de entradas.                          |
| `precioEntrada`    | Number   | Precio de la entrada.                                          |
| `salaId`           | ObjectId | Identificador de la sala asociada.                             |
| `usuarioId`        | ObjectId | Identificador del usuario al que se asocia la reserva inicial. |

La reserva se genera en el servidor utilizando el precio de reserva configurado para la sala. Los datos de reserva enviados por el cliente no se utilizan.

**Reglas de negocio:**

- Todos los campos obligatorios deben estar presentes y tener el tipo esperado.
- El precio de entrada no puede ser negativo.
- La fecha de inicio no puede ser anterior al día actual.
- La fecha de finalización no puede ser anterior a la fecha de inicio.
- El período de venta debe ser coherente: su finalización no puede ser anterior al inicio ni posterior al comienzo del evento.
- La sala indicada debe existir y encontrarse activa.
- El usuario indicado debe existir y encontrarse activo.
- No puede existir otro evento con el mismo nombre, sala y fecha de inicio.
- No se permiten períodos superpuestos en una misma sala.
- Se permiten eventos consecutivos en una misma sala y eventos superpuestos en salas diferentes.

**Respuesta exitosa:** `201 Created`. Devuelve los datos del evento creado.

#### Actualizar un evento

**`PATCH /eventos/:id`**

Requiere autenticación y rol `ADMIN`.

Permite modificar parcialmente los datos editables del evento. Los campos desconocidos o protegidos se ignoran. La reserva histórica no puede modificarse mediante esta operación.

**Reglas de negocio:**

- El evento debe existir.
- Su sala actual debe encontrarse activa.
- Si se cambia la sala, la nueva debe existir y estar activa.
- Se mantienen las validaciones de coherencia entre fechas y de precio de entrada.
- Si se modifica la fecha de inicio, no puede establecerse una fecha anterior al día actual.
- La actualización no puede generar duplicados ni superposiciones con otros eventos de la misma sala.
- No se permite modificar un evento cuya sala actual esté inactiva.

**Respuesta exitosa:** `200 OK`. Devuelve los datos del evento actualizado.

#### Errores posibles

| Código HTTP        | Situación                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `400 Bad Request`  | Datos obligatorios ausentes, tipos incorrectos, fechas incoherentes o anteriores al día actual, precio negativo o identificador inválido. |
| `401 Unauthorized` | No se proporcionó una sesión autenticada para una operación protegida.                                                                    |
| `403 Forbidden`    | El usuario autenticado no tiene rol `ADMIN`.                                                                                              |
| `404 Not Found`    | No existe el evento, la sala o el usuario indicado.                                                                                       |
| `409 Conflict`     | Sala o usuario inactivo, evento duplicado o período superpuesto.                                                                          |

Para el formato general de las respuestas de error, consultar [ERRORS.md](./ERRORS.md).

### 3.4. Entradas

Este módulo permite consultar entradas, realizar ventas, cancelar compras y consultar la disponibilidad por evento.

Todos los endpoints requieren autenticación. Algunos están restringidos al rol `ADMIN`.

#### Endpoints

| Método  | Endpoint                          | Acceso          | Descripción                                    |
| ------- | --------------------------------- | --------------- | ---------------------------------------------- |
| `GET`   | `/entradas`                       | CLIENTE / ADMIN | Obtener entradas según el rol del usuario.     |
| `GET`   | `/entradas/:id`                   | CLIENTE / ADMIN | Obtener una entrada por su identificador.      |
| `GET`   | `/entradas/vendidas/:eventoId`    | ADMIN           | Obtener las entradas vendidas de un evento.    |
| `GET`   | `/entradas/disponibles/:eventoId` | ADMIN           | Consultar la cantidad de entradas disponibles. |
| `POST`  | `/entradas`                       | CLIENTE / ADMIN | Registrar la venta de una entrada.             |
| `PATCH` | `/entradas/:id/cancelar`          | CLIENTE / ADMIN | Cancelar una entrada vendida.                  |

#### Modelo de datos

Una entrada contiene los siguientes atributos:

| Campo        | Tipo              | Descripción                              |
| ------------ | ----------------- | ---------------------------------------- |
| `id`         | ObjectId (String) | Identificador de la entrada.             |
| `eventoId`   | ObjectId          | Identificador del evento asociado.       |
| `usuarioId`  | ObjectId          | Identificador del titular de la entrada. |
| `estado`     | String            | Estado: `vendida` o `cancelada`.         |
| `fechaVenta` | Date              | Fecha de creación de la venta.           |

El estado inicial es `vendida` y la fecha de venta se establece automáticamente. En las consultas que incluyen detalles, `eventoId` y `usuarioId` se devuelven con información de los recursos relacionados.

#### Consultar entradas

**`GET /entradas`**

Obtiene las entradas disponibles para el usuario autenticado.

**Parámetro de consulta:**

| Parámetro   | Tipo     | Obligatorio | Descripción                                                 |
| ----------- | -------- | ----------- | ----------------------------------------------------------- |
| `usuarioId` | ObjectId | No          | Filtra por titular. Solo se considera para administradores. |

**Comportamiento según el rol:**

- **ADMIN:** obtiene todas las entradas o filtra por el `usuarioId` solicitado.
- **CLIENTE:** obtiene exclusivamente sus propias entradas. El parámetro `usuarioId` se ignora.

**Respuesta exitosa:** `200 OK`. Devuelve un array de entradas con los detalles del evento y del titular.

**Error posible:**

- `400 Bad Request`: formato inválido de `usuarioId`.

**`GET /entradas/:id`**

Obtiene una entrada por su identificador.

- **Parámetro:** `id`, identificador de la entrada (`ObjectId`).
- **ADMIN:** puede consultar cualquier entrada.
- **CLIENTE:** únicamente puede consultar entradas de las que sea titular.

Si un cliente intenta consultar una entrada ajena, recibe la misma respuesta que si no existiera, para evitar revelar la existencia de recursos a los que no tiene acceso.

**Respuesta exitosa:** `200 OK`. Devuelve la entrada con los detalles del evento y del titular.

**Errores posibles:**

- `400 Bad Request`: identificador inválido.
- `404 Not Found`: entrada inexistente o ajena al cliente autenticado.

#### Consultas administrativas

**`GET /entradas/vendidas/:eventoId`**

Obtiene las entradas cuyo estado es `vendida` y que corresponden al evento indicado.

- **Acceso:** únicamente `ADMIN`.
- **Parámetro:** `eventoId`, identificador del evento (`ObjectId`).
- **Respuesta exitosa:** `200 OK`. Devuelve un array de entradas vendidas.

**`GET /entradas/disponibles/:eventoId`**

Obtiene la cantidad de entradas disponibles para un evento.

- **Acceso:** únicamente `ADMIN`.
- **Parámetro:** `eventoId`, identificador del evento (`ObjectId`).
- **Respuesta exitosa:** `200 OK`.

Devuelve un objeto con el identificador y nombre del evento, y la cantidad disponible:

```json
{
  "eventoId": "672a1b2c3d4e5f6789012345",
  "nombre": "Festival de música",
  "disponibles": 45
}
```

La disponibilidad se calcula restando la cantidad de entradas vendidas a la capacidad de la sala asociada al evento.

**Errores posibles para ambas consultas:**

- `400 Bad Request`: identificador de evento inválido.
- `403 Forbidden`: el usuario no tiene permisos de administrador.
- `404 Not Found`: evento inexistente; para la consulta de disponibilidad, también puede indicar que no existe la sala asociada.

#### Registrar una venta

**`POST /entradas`**

Registra la venta de una entrada para un evento.

**Cuerpo de la solicitud:**

| Campo      | Tipo     | Obligatorio | Descripción                                                |
| ---------- | -------- | ----------- | ---------------------------------------------------------- |
| `eventoId` | ObjectId | Sí          | Identificador del evento para el que se compra la entrada. |

El titular se obtiene de la sesión autenticada. No se permite elegir otro usuario como destinatario de la compra, incluso si se envía un `usuarioId` adicional en el cuerpo.

**Reglas de negocio:**

1. El evento debe existir.
2. El evento debe admitir nuevas ventas.
3. La sala asociada al evento debe existir.
4. Debe haber capacidad disponible en la sala.
5. La entrada se registra a nombre del usuario autenticado.
6. La entrada se crea con estado `vendida` y fecha de venta automática.

**Respuesta exitosa:** `201 Created`. Devuelve la entrada creada.

**Errores posibles:**

- `400 Bad Request`: identificador de evento inválido.
- `401 Unauthorized`: no existe una sesión autenticada.
- `403 Forbidden`: usuario autenticado inactivo.
- `404 Not Found`: evento o sala inexistente.
- `409 Conflict`: el evento no admite nuevas ventas o alcanzó su capacidad máxima.

#### Cancelar una entrada

**`PATCH /entradas/:id/cancelar`**

Cancela una entrada vendida.

- **Acceso:** `CLIENTE` y `ADMIN`.
- **Parámetro:** `id`, identificador de la entrada (`ObjectId`).
- **Cuerpo:** no requiere.

**Comportamiento según el rol:**

- **ADMIN:** puede cancelar cualquier entrada.
- **CLIENTE:** únicamente puede cancelar entradas propias.

Solo se pueden cancelar entradas en estado `vendida`. Una entrada ya cancelada no puede volver a cancelarse.

**Respuesta exitosa:** `200 OK`. Devuelve la entrada actualizada, incluyendo los detalles del evento y del titular.

**Errores posibles:**

- `400 Bad Request`: identificador inválido.
- `404 Not Found`: entrada inexistente o ajena al cliente autenticado.
- `409 Conflict`: la entrada ya está cancelada.

### 3.5. Reservas

Las reservas se generan automáticamente al crear un evento y se almacenan como un registro histórico dentro de este. No se crean, modifican ni eliminan de manera independiente.

**Prefijo:** `/reservas`

Todas las operaciones requieren autenticación. Los permisos de consulta dependen del rol y de la titularidad de la reserva.

#### Endpoints

| Método | Endpoint              | Acceso          | Descripción                                |
| ------ | --------------------- | --------------- | ------------------------------------------ |
| `GET`  | `/reservas`           | CLIENTE / ADMIN | Obtener reservas según el rol del usuario. |
| `GET`  | `/reservas/:eventoId` | CLIENTE / ADMIN | Obtener la reserva asociada a un evento.   |

#### Consultar reservas

**`GET /reservas`**

Obtiene las reservas registradas.

**Parámetro de consulta:**

| Parámetro   | Tipo     | Obligatorio | Descripción                                                                 |
| ----------- | -------- | ----------- | --------------------------------------------------------------------------- |
| `usuarioId` | ObjectId | No          | Filtra las reservas por el titular. Solo tiene efecto para administradores. |

**Comportamiento según el rol:**

- **ADMIN:** puede consultar todas las reservas o filtrar mediante `usuarioId`.
- **CLIENTE:** obtiene únicamente sus propias reservas. Si envía `usuarioId`, el parámetro se ignora y se utiliza el identificador de su cuenta autenticada.

**Respuesta exitosa:** `200 OK`. Devuelve un array de reservas con la siguiente estructura:

| Campo          | Tipo   | Descripción                                                    |
| -------------- | ------ | -------------------------------------------------------------- |
| `usuario`      | Object | Datos del titular: `id`, `nombre`, `apellido` y `email`.       |
| `fechaReserva` | Date   | Fecha en la que se generó la reserva.                          |
| `precioFinal`  | Number | Precio registrado al momento de reservar.                      |
| `evento`       | Object | Datos del evento asociado: `id`, `nombre`, `fecha` y `estado`. |

Si no existen reservas para el usuario o filtro solicitado, devuelve un array vacío.

**Errores posibles:**

- `400 Bad Request`: formato inválido de `usuarioId`.
- `401 Unauthorized`: no existe una sesión autenticada.
- `403 Forbidden`: el rol del usuario no tiene permiso para consultar reservas.

**`GET /reservas/:eventoId`**

Obtiene la reserva asociada a un evento determinado.

- **Acceso:** `CLIENTE` y `ADMIN`.
- **Parámetro:** `eventoId`, identificador del evento (`ObjectId`).
- **ADMIN:** puede consultar la reserva asociada a cualquier evento.
- **CLIENTE:** únicamente puede consultar la reserva asociada a su propia cuenta.

Si el evento no existe, no tiene una reserva asociada o la reserva pertenece a otro usuario, se responde como recurso no encontrado.

**Respuesta exitosa:** `200 OK`. Devuelve un objeto con la misma estructura que cada elemento del listado de reservas.

**Errores posibles:**

- `400 Bad Request`: identificador de evento inválido.
- `401 Unauthorized`: no existe una sesión autenticada.
- `403 Forbidden`: el rol del usuario no tiene permiso para consultar reservas.
- `404 Not Found`: el evento no existe, no tiene una reserva asociada o la reserva no pertenece al cliente autenticado.

#### Consideraciones de acceso y funcionamiento

- Los clientes solo pueden consultar sus propias reservas.
- Los administradores pueden consultar reservas de cualquier titular o filtrar por usuario.
- El precio final y la fecha de reserva se conservan como datos históricos.
- La API no expone directamente el subdocumento de reserva en las respuestas generales de eventos; para consultar estos registros se utilizan los endpoints específicos de reservas.

### 3.6. Vistas

Este módulo reúne las rutas que devuelven páginas HTML renderizadas mediante el servidor, en lugar de respuestas JSON.

Las vistas utilizan autenticación opcional, excepto el resumen de entradas por evento, que requiere autenticación y rol `ADMIN`.

- **Con sesión:** se carga el usuario actual para mostrar la información correspondiente.
- **Sin sesión:** las vistas públicas pueden consultarse igualmente.
- **Resumen de entradas:** requiere una sesión válida y permisos de administrador.

#### Endpoints

| Método | Endpoint                     | Acceso  | Descripción                                  |
| ------ | ---------------------------- | ------- | -------------------------------------------- |
| `GET`  | `/vistas/usuarios`           | Público | Mostrar la vista de usuarios.                |
| `GET`  | `/vistas/salas`              | Público | Mostrar la vista de salas.                   |
| `GET`  | `/vistas/eventos`            | Público | Mostrar la vista de eventos.                 |
| `GET`  | `/vistas/entradas`           | Público | Mostrar la vista general de entradas.        |
| `GET`  | `/vistas/reservas`           | Público | Mostrar la vista de reservas.                |
| `GET`  | `/vistas/login`              | Público | Mostrar el formulario de inicio de sesión.   |
| `GET`  | `/vistas/registro`           | Público | Mostrar el formulario de registro.           |
| `GET`  | `/vistas/inicio`             | Público | Mostrar la página de inicio.                 |
| `GET`  | `/vistas/entradas/:eventoId` | ADMIN   | Mostrar el resumen de entradas de un evento. |

#### Resumen de entradas por evento

**`GET /vistas/entradas/:eventoId`**

Renderiza una vista con la información del evento, su sala, las entradas vendidas y la cantidad disponible según la capacidad de la sala.

- **Acceso:** únicamente `ADMIN`.
- **Parámetro:** `eventoId`, identificador del evento (`ObjectId`).
- **Respuesta exitosa:** `200 OK`. Devuelve una vista HTML renderizada.

**Errores posibles:**

- `400 Bad Request`: identificador del evento inválido.
- `401 Unauthorized`: no existe una sesión válida.
- `403 Forbidden`: el usuario no tiene permisos de administrador.
- `404 Not Found`: no se encontró el evento o su sala asociada.

Las operaciones de consulta y gestión de entradas se documentan en la sección [Entradas](#34-entradas). Esta ruta corresponde exclusivamente a la vista HTML del resumen.

---

## 4. Consideraciones generales

- Los identificadores de recursos se reciben y validan como `ObjectId`.
- Las operaciones protegidas requieren una sesión autenticada.
- Las reglas de autorización y titularidad se aplican en el backend, no se delegan a los datos enviados por el cliente.
- Los errores se centralizan y se devuelven con un formato uniforme.
- Los ejemplos de este documento son ilustrativos y no representan datos reales de la base de datos.

## 5. Documentación relacionada

- [README.md](./README.md): presentación y puesta en marcha del proyecto.
- [ARCHITECTURE.md](./ARCHITECTURE.md): arquitectura y organización interna.
- [ERRORS.md](./ERRORS.md): manejo de errores y códigos HTTP.
