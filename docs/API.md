# API – Documentación de endpoints

## 1. Introducción

Este documento describe los endpoints disponibles en la API del proyecto, sus parámetros, requisitos de acceso, reglas de negocio y respuestas.

La documentación se organiza por módulos funcionales y se basa en el comportamiento implementado en el backend.

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

Los errores de la API tienen el siguiente formato:

```json
{
  "error": "Descripción del error"
}
```

Los códigos HTTP y las clases de errores se documentan en [ERRORS.md](./ERRORS.md).

---

## 3. Módulos de la API

### 3.1. Usuarios

> Pendiente de documentar.

### 3.2. Salas

**Prefijo:** `/salas`

Todas las operaciones del módulo requieren autenticación y rol de **administrador**. Los usuarios clientes no tienen acceso a las consultas ni a las operaciones de gestión de salas.

#### GET `/salas`

Obtiene todas las salas registradas.

- **Acceso:** administrador.
- **Respuesta exitosa:** `200 OK`.
- **Contenido:** array de salas.

#### GET `/salas/:id`

Obtiene una sala por su identificador.

- **Acceso:** administrador.
- **Parámetros:**
  - `id`: identificador de la sala.
- **Respuesta exitosa:** `200 OK`.
- **Errores:**
  - `400 Bad Request`: identificador inválido.
  - `404 Not Found`: sala inexistente.

#### POST `/salas`

Registra una nueva sala.

- **Acceso:** administrador.
- **Body:**

| Campo           | Tipo   | Requerido | Restricciones                                      |
| --------------- | ------ | --------- | -------------------------------------------------- |
| `nombre`        | String | Sí        | No puede estar vacío.                              |
| `capacidad`     | Number | Sí        | Entero mayor o igual a 1.                          |
| `direccion`     | String | Sí        | No puede estar vacío.                              |
| `precioReserva` | Number | Sí        | Mayor o igual a 0.                                 |
| `responsable`   | Object | Sí        | Debe contener todos los atributos indicados abajo. |

**Objeto `responsable`:**

| Campo      | Tipo   | Requerido |
| ---------- | ------ | --------- |
| `nombre`   | String | Sí        |
| `apellido` | String | Sí        |
| `telefono` | String | Sí        |
| `email`    | String | Sí        |

- **Estado inicial:** se asigna automáticamente `activa` si no se especifica otro valor.
- **Respuesta exitosa:** `201 Created`.
- **Errores:**
  - `400 Bad Request`: datos obligatorios ausentes, tipos incorrectos o restricciones incumplidas.

No se aplican restricciones de unicidad a los datos de las salas: actualmente se permite registrar salas con información repetida.

#### PATCH `/salas/:id`

Actualiza parcialmente los datos de una sala.

- **Acceso:** administrador.
- **Parámetros:**
  - `id`: identificador de la sala.
- **Body:** admite los siguientes campos opcionales:

| Campo           | Tipo   | Restricciones                                  |
| --------------- | ------ | ---------------------------------------------- |
| `nombre`        | String | No puede estar vacío.                          |
| `capacidad`     | Number | Entero mayor o igual a 1.                      |
| `direccion`     | String | No puede estar vacío.                          |
| `precioReserva` | Number | Mayor o igual a 0.                             |
| `responsable`   | Object | Permite actualizar sus atributos parcialmente. |
| `estado`        | String | Valores permitidos: `activa`, `inactiva`.      |

Los campos no enviados conservan sus valores actuales. Las actualizaciones parciales de `responsable` modifican únicamente los atributos recibidos, sin reemplazar el resto del objeto.

Los campos desconocidos o protegidos se ignoran.

**Regla de negocio para la baja de salas:**

No se permite cambiar el estado de una sala de `activa` a `inactiva` si tiene eventos próximos en estado `activo`. En ese caso, la operación se rechaza para evitar inactivar espacios que todavía tienen eventos programados.

Los eventos cancelados y los que ya comenzaron o cuya fecha de inicio pasó no impiden la inactivación.

- **Respuesta exitosa:** `200 OK`.
- **Errores:**
  - `400 Bad Request`: identificador inválido, tipos incorrectos o valores que incumplen las restricciones.
  - `404 Not Found`: sala inexistente.
  - `409 Conflict`: se intenta inactivar una sala que tiene eventos próximos activos.

#### Autenticación y autorización

Todas las rutas de Salas aplican los siguientes controles:

| Situación                                    | Respuesta                          |
| -------------------------------------------- | ---------------------------------- |
| Usuario sin sesión                           | `401 Unauthorized`                 |
| Usuario autenticado sin rol de administrador | `403 Forbidden`                    |
| Administrador autorizado                     | Se procesa la operación solicitada |

### 3.3. Eventos

Prefijo: `/eventos`

Este módulo permite consultar, crear y actualizar eventos. Cada evento está asociado a una sala y contiene un registro histórico de la reserva generada al momento de su creación.

**#### Endpoints**

| Método  | Endpoint            | Acceso        | Descripción                                           |
| ------- | ------------------- | ------------- | ----------------------------------------------------- |
| `GET`   | `/eventos`          | Público       | Obtener todos los eventos.                            |
| `GET`   | `/eventos/proximos` | Público       | Obtener los próximos eventos que no estén cancelados. |
| `GET`   | `/eventos/:id`      | Público       | Obtener un evento por su identificador.               |
| `POST`  | `/eventos`          | Administrador | Crear un evento y generar su reserva asociada.        |
| `PATCH` | `/eventos/:id`      | Administrador | Actualizar los datos de un evento.                    |

**#### Consultar eventos**

**`GET /eventos`**

Devuelve un array con los eventos registrados.

**`GET /eventos/proximos`**

Devuelve los eventos cuya fecha de inicio todavía no pasó y cuyo estado no sea `cancelado`.

**`GET /eventos/:id`**

Devuelve el evento correspondiente al identificador indicado.

- Si el identificador no tiene un formato válido, responde `400`.
- Si no existe un evento con ese identificador, responde `404`.

Las respuestas de consulta incluyen los datos del evento, pero no exponen el registro histórico de la reserva asociada.

**#### Crear un evento**

**`POST /eventos`**

Requiere autenticación y rol de administrador.

Recibe en el cuerpo de la solicitud los datos del evento:

| Campo              | Tipo     | Descripción                                                    |
| ------------------ | -------- | -------------------------------------------------------------- |
| `nombre`           | string   | Nombre del evento.                                             |
| `descripcion`      | string   | Descripción del evento (opcional).                             |
| `tipo`             | string   | Tipo o categoría del evento.                                   |
| `fechaInicio`      | date     | Fecha y hora de inicio.                                        |
| `fechaFin`         | date     | Fecha y hora de finalización.                                  |
| `fechaInicioVenta` | date     | Inicio del período de venta de entradas.                       |
| `fechaFinVenta`    | date     | Fin del período de venta de entradas.                          |
| `precioEntrada`    | number   | Precio de la entrada.                                          |
| `salaId`           | ObjectId | Identificador de la sala asociada.                             |
| `usuarioId`        | ObjectId | Identificador del usuario al que se asocia la reserva inicial. |

La reserva se genera en el servidor utilizando el precio de reserva configurado para la sala. Los datos de reserva enviados por el cliente no se utilizan.

Si la creación es exitosa, responde `201 Created` con los datos del evento creado.

**Reglas de negocio y validaciones:**

- Todos los campos obligatorios deben estar presentes y tener el tipo de dato esperado.
- El precio de entrada no puede ser negativo.
- La fecha de inicio no puede ser anterior al día actual.
- La fecha de finalización no puede ser anterior a la fecha de inicio.
- El período de venta debe ser coherente: su finalización no puede ser anterior al inicio ni posterior al comienzo del evento.
- La sala indicada debe existir y encontrarse activa.
- El usuario indicado debe existir y encontrarse activo.
- No puede existir otro evento con el mismo nombre, sala y fecha de inicio.
- No se permiten eventos con períodos superpuestos en una misma sala.
- Se permiten eventos consecutivos en una misma sala y eventos superpuestos en salas diferentes.

**#### Actualizar un evento**

**`PATCH /eventos/:id`**

Requiere autenticación y rol de administrador.

Permite modificar parcialmente los datos del evento. Solo se aceptan los campos editables del evento; los campos desconocidos o protegidos se ignoran.

La reserva histórica no puede modificarse mediante esta operación.

**Reglas de negocio y validaciones:**

- El evento debe existir.
- Su sala actual debe encontrarse activa.
- Si se cambia la sala, la nueva sala debe existir y estar activa.
- Se mantienen las validaciones de coherencia entre fechas y de precio de entrada.
- Si se modifica la fecha de inicio, no puede establecerse una fecha anterior al día actual.
- La actualización no puede generar duplicados ni superposiciones con otros eventos de la misma sala.
- No se permite modificar un evento cuya sala actual esté inactiva.

Si la actualización es exitosa, responde `200 OK` con los datos del evento actualizado.

**#### Errores posibles**

| Código HTTP        | Situación                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `400 Bad Request`  | Datos obligatorios ausentes, tipos incorrectos, fechas incoherentes o anteriores al día actual, precio negativo o identificador inválido. |
| `401 Unauthorized` | No se proporcionó una sesión autenticada para una operación protegida.                                                                    |
| `403 Forbidden`    | El usuario autenticado no tiene rol de administrador.                                                                                     |
| `404 Not Found`    | No existe el evento, la sala o el usuario indicado.                                                                                       |
| `409 Conflict`     | Sala o usuario inactivo, evento duplicado o período superpuesto.                                                                          |

Para conocer el formato general de las respuestas de error, consultar [ERRORS.md](./ERRORS.md).

### 3.4. Entradas

Este módulo permite consultar entradas, realizar ventas, cancelar compras y consultar la disponibilidad de entradas por evento.

Todos los endpoints requieren autenticación. Algunos están restringidos al rol `ADMIN`.

#### 3.4.1. Modelo de datos

Una entrada contiene los siguientes atributos:

| Campo        | Tipo              | Descripción                                    |
| ------------ | ----------------- | ---------------------------------------------- |
| `id`         | ObjectId (string) | Identificador de la entrada.                   |
| `eventoId`   | ObjectId          | Identificador del evento asociado.             |
| `usuarioId`  | ObjectId          | Identificador del titular de la entrada.       |
| `estado`     | String            | Estado de la entrada: `vendida` o `cancelada`. |
| `fechaVenta` | Date              | Fecha de creación de la venta.                 |

El estado inicial de una entrada es `vendida` y la fecha de venta se establece automáticamente.

En las consultas que incluyen detalles, `eventoId` y `usuarioId` se devuelven con información de los recursos relacionados.

#### 3.4.2. Endpoints

##### GET `/entradas`

Obtiene las entradas disponibles para el usuario autenticado.

**Acceso:** `CLIENTE` y `ADMIN`.

**Parámetros de consulta:**

| Parámetro   | Tipo     | Obligatorio | Descripción                                                                       |
| ----------- | -------- | ----------- | --------------------------------------------------------------------------------- |
| `usuarioId` | ObjectId | No          | Permite filtrar las entradas por titular. Solo se considera para administradores. |

**Comportamiento según el rol:**

- **ADMIN:** obtiene todas las entradas o filtra por el `usuarioId` solicitado.
- **CLIENTE:** obtiene exclusivamente sus propias entradas. El parámetro `usuarioId` enviado en la consulta se ignora.

**Respuesta exitosa:** `200 OK`.

Devuelve un array de entradas, incluyendo los detalles del evento y del titular.

Ejemplo representativo:

```json
[
  {
    "id": "672a1b2c3d4e5f6789012345",
    "eventoId": {
      "nombre": "Festival de música"
    },
    "usuarioId": {
      "nombre": "María",
      "apellido": "Gómez"
    },
    "estado": "vendida",
    "fechaVenta": "2026-11-12T14:30:00.000Z"
  }
]
```

**Errores posibles:**

- `400 Bad Request`: formato inválido de `usuarioId`.

##### GET `/entradas/:id`

Obtiene una entrada por su identificador.

**Acceso:** `CLIENTE` y `ADMIN`.

**Parámetros de ruta:**

| Parámetro | Tipo     | Obligatorio | Descripción                  |
| --------- | -------- | ----------- | ---------------------------- |
| `id`      | ObjectId | Sí          | Identificador de la entrada. |

**Comportamiento según el rol:**

- **ADMIN:** puede consultar cualquier entrada.
- **CLIENTE:** únicamente puede consultar entradas de las que sea titular.

Si un cliente intenta consultar una entrada ajena, recibe la misma respuesta que si la entrada no existiera. Esto evita revelar la existencia de recursos a los que no tiene acceso.

**Respuesta exitosa:** `200 OK`.

Devuelve la entrada con los detalles del evento y del titular.

**Errores posibles:**

- `400 Bad Request`: identificador inválido.
- `404 Not Found`: entrada inexistente o ajena al cliente autenticado.

##### GET `/entradas/vendidas/:eventoId`

Obtiene las entradas vendidas de un evento.

**Acceso:** únicamente `ADMIN`.

**Parámetros de ruta:**

| Parámetro  | Tipo     | Obligatorio | Descripción               |
| ---------- | -------- | ----------- | ------------------------- |
| `eventoId` | ObjectId | Sí          | Identificador del evento. |

**Respuesta exitosa:** `200 OK`.

Devuelve un array con las entradas cuyo estado es `vendida` y que corresponden al evento indicado.

**Errores posibles:**

- `400 Bad Request`: identificador de evento inválido.
- `403 Forbidden`: el usuario no tiene permisos de administrador.
- `404 Not Found`: evento inexistente.

##### GET `/entradas/disponibles/:eventoId`

Obtiene la cantidad de entradas disponibles para un evento.

**Acceso:** únicamente `ADMIN`.

**Parámetros de ruta:**

| Parámetro  | Tipo     | Obligatorio | Descripción               |
| ---------- | -------- | ----------- | ------------------------- |
| `eventoId` | ObjectId | Sí          | Identificador del evento. |

**Respuesta exitosa:** `200 OK`.

Devuelve un objeto con el identificador y nombre del evento, y la cantidad de entradas disponibles.

Ejemplo:

```json
{
  "eventoId": "672a1b2c3d4e5f6789012345",
  "nombre": "Festival de música",
  "disponibles": 45
}
```

La disponibilidad se calcula restando la cantidad de entradas vendidas a la capacidad de la sala asociada al evento.

**Errores posibles:**

- `400 Bad Request`: identificador de evento inválido.
- `403 Forbidden`: el usuario no tiene permisos de administrador.
- `404 Not Found`: evento o sala inexistente.

##### POST `/entradas`

Registra la venta de una entrada para un evento.

**Acceso:** `CLIENTE` y `ADMIN`.

**Cuerpo de la solicitud:**

| Campo      | Tipo     | Obligatorio | Descripción                                                |
| ---------- | -------- | ----------- | ---------------------------------------------------------- |
| `eventoId` | ObjectId | Sí          | Identificador del evento para el que se compra la entrada. |

Ejemplo:

```json
{
  "eventoId": "672a1b2c3d4e5f6789012345"
}
```

El titular se obtiene de la sesión autenticada. No se permite elegir otro usuario como destinatario de la compra, incluso si se envía un `usuarioId` adicional en el cuerpo de la solicitud.

**Reglas de negocio:**

1. El evento debe existir.
2. El evento debe admitir nuevas ventas.
3. La sala asociada al evento debe existir.
4. Debe haber capacidad disponible en la sala.
5. La entrada se registra a nombre del usuario autenticado.
6. La entrada se crea con estado `vendida` y fecha de venta automática.

**Respuesta exitosa:** `201 Created`.

Devuelve la entrada creada.

Ejemplo representativo:

```json
{
  "id": "672a1b2c3d4e5f6789012345",
  "eventoId": "672a1b2c3d4e5f6789012346",
  "usuarioId": "672a1b2c3d4e5f6789012347",
  "estado": "vendida",
  "fechaVenta": "2026-11-12T14:30:00.000Z"
}
```

**Errores posibles:**

- `400 Bad Request`: identificador de evento inválido.
- `401 Unauthorized`: no existe una sesión autenticada.
- `403 Forbidden`: usuario autenticado inactivo.
- `404 Not Found`: evento o sala inexistente.
- `409 Conflict`: el evento no admite nuevas ventas o alcanzó su capacidad máxima.

##### PATCH `/entradas/:id/cancelar`

Cancela una entrada vendida.

**Acceso:** `CLIENTE` y `ADMIN`.

**Parámetros de ruta:**

| Parámetro | Tipo     | Obligatorio | Descripción                                        |
| --------- | -------- | ----------- | -------------------------------------------------- |
| `id`      | ObjectId | Sí          | Identificador de la entrada que se desea cancelar. |

No requiere cuerpo de solicitud.

**Comportamiento según el rol:**

- **ADMIN:** puede cancelar cualquier entrada.
- **CLIENTE:** únicamente puede cancelar entradas propias.

La operación solo permite cancelar entradas que se encuentren en estado `vendida`. Una entrada ya cancelada no puede volver a cancelarse.

**Respuesta exitosa:** `200 OK`.

Devuelve la entrada actualizada, incluyendo los detalles del evento y del titular.

Ejemplo representativo:

```json
{
  "id": "672a1b2c3d4e5f6789012345",
  "eventoId": {
    "nombre": "Festival de música"
  },
  "usuarioId": {
    "nombre": "María",
    "apellido": "Gómez"
  },
  "estado": "cancelada",
  "fechaVenta": "2026-11-12T14:30:00.000Z"
}
```

**Errores posibles:**

- `400 Bad Request`: identificador inválido.
- `404 Not Found`: entrada inexistente o ajena al cliente autenticado.
- `409 Conflict`: la entrada ya está cancelada.

#### 3.4.3. Resumen de entradas en vistas

##### GET `/vistas/entradas/:eventoId`

Renderiza la vista del resumen de entradas de un evento.

**Acceso:** únicamente `ADMIN`.

**Parámetros de ruta:**

| Parámetro  | Tipo     | Obligatorio | Descripción               |
| ---------- | -------- | ----------- | ------------------------- |
| `eventoId` | ObjectId | Sí          | Identificador del evento. |

**Contenido:** presenta la información del evento, su sala, las entradas vendidas y la cantidad de entradas disponibles.

A diferencia de los endpoints anteriores, esta ruta renderiza una vista y no devuelve una respuesta JSON.

**Errores posibles:**

- `400 Bad Request`: identificador de evento inválido.
- `401 Unauthorized`: no existe una sesión autenticada.
- `403 Forbidden`: el usuario no tiene permisos de administrador.
- `404 Not Found`: evento o sala inexistente.

---

### 3.5. Reservas

Las reservas se generan automáticamente al crear un evento y se almacenan como un registro histórico dentro de este. No se crean, modifican ni eliminan de manera independiente.

**Prefijo:** `/reservas`

Todas las operaciones requieren autenticación. Los permisos de consulta dependen del rol del usuario y de la titularidad de la reserva.

#### GET `/reservas`

Obtiene las reservas registradas.

**Acceso:** usuarios autenticados con rol `ADMIN` o `CLIENTE`.

**Query params:**

| Parámetro   | Tipo     | Requerido | Descripción                                                                                   |
| ----------- | -------- | --------- | --------------------------------------------------------------------------------------------- |
| `usuarioId` | ObjectId | No        | Filtra las reservas por el identificador del titular. Solo tiene efecto para administradores. |

**Comportamiento según el rol:**

- **ADMIN:** puede consultar todas las reservas o filtrar los resultados mediante `usuarioId`.
- **CLIENTE:** obtiene únicamente sus propias reservas. Si envía `usuarioId`, el parámetro se ignora y se utiliza el identificador de su cuenta autenticada.

**Respuesta exitosa:** `200 OK`

Devuelve un array de reservas con la siguiente estructura:

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

#### GET `/reservas/:eventoId`

Obtiene la reserva asociada a un evento determinado.

**Acceso:** usuarios autenticados con rol `ADMIN` o `CLIENTE`.

**Parámetros de ruta:**

| Parámetro  | Tipo     | Requerido | Descripción                                               |
| ---------- | -------- | --------- | --------------------------------------------------------- |
| `eventoId` | ObjectId | Sí        | Identificador del evento cuya reserva se desea consultar. |

**Comportamiento según el rol:**

- **ADMIN:** puede consultar la reserva asociada a cualquier evento.
- **CLIENTE:** únicamente puede consultar la reserva asociada a su propia cuenta.

Si el evento no existe, no tiene una reserva asociada o la reserva pertenece a otro usuario, se responde como recurso no encontrado.

**Respuesta exitosa:** `200 OK`

Devuelve un objeto con la misma estructura que cada elemento del listado de reservas:

| Campo          | Tipo   | Descripción                                                    |
| -------------- | ------ | -------------------------------------------------------------- |
| `usuario`      | Object | Datos del titular: `id`, `nombre`, `apellido` y `email`.       |
| `fechaReserva` | Date   | Fecha en la que se generó la reserva.                          |
| `precioFinal`  | Number | Precio registrado al momento de reservar.                      |
| `evento`       | Object | Datos del evento asociado: `id`, `nombre`, `fecha` y `estado`. |

**Errores posibles:**

- `400 Bad Request`: identificador de evento inválido.
- `401 Unauthorized`: no existe una sesión autenticada.
- `403 Forbidden`: el rol del usuario no tiene permiso para consultar reservas.
- `404 Not Found`: el evento no existe, no tiene una reserva asociada o la reserva no pertenece al cliente autenticado.

#### Autenticación y autorización

| Situación                                            | Respuesta          |
| ---------------------------------------------------- | ------------------ |
| Usuario sin sesión autenticada                       | `401 Unauthorized` |
| Cliente consulta sus propias reservas                | Permitido          |
| Cliente intenta consultar reservas de otro usuario   | `404 Not Found`    |
| Administrador consulta reservas de cualquier titular | Permitido          |
| Usuario con un rol no autorizado                     | `403 Forbidden`    |

**Consideraciones:**

- Las reservas se generan automáticamente al crear un evento.
- El precio final y la fecha de reserva se conservan como datos históricos.
- Los clientes no pueden consultar reservas ajenas ni modificar el titular mediante parámetros de consulta.
- Los administradores pueden consultar todas las reservas o limitar los resultados a un titular específico.
- La API no expone directamente el subdocumento de reserva dentro de las respuestas generales de eventos; para consultar estos registros se utilizan los endpoints específicos de reservas.

### 3.6. Vistas

Estas rutas permiten acceder a las páginas HTML de la aplicación. A diferencia de los endpoints de la API, devuelven vistas renderizadas mediante el servidor.

#### Autenticación

Las rutas de vistas utilizan autenticación opcional, excepto el resumen de entradas por evento, que requiere autenticación y rol `ADMIN`.

- **Con sesión:** se carga el usuario actual para mostrar la información correspondiente en las vistas.
- **Sin sesión:** las vistas públicas pueden consultarse igualmente.
- **Resumen de entradas:** requiere una sesión válida y permisos de administrador.

#### Endpoints

| Método | Endpoint                     | Descripción                                  | Acceso  |
| ------ | ---------------------------- | -------------------------------------------- | ------- |
| GET    | `/vistas/usuarios`           | Muestra la vista de usuarios.                | Público |
| GET    | `/vistas/salas`              | Muestra la vista de salas.                   | Público |
| GET    | `/vistas/eventos`            | Muestra la vista de eventos.                 | Público |
| GET    | `/vistas/entradas`           | Muestra la vista general de entradas.        | Público |
| GET    | `/vistas/reservas`           | Muestra la vista de reservas.                | Público |
| GET    | `/vistas/login`              | Muestra el formulario de inicio de sesión.   | Público |
| GET    | `/vistas/registro`           | Muestra el formulario de registro.           | Público |
| GET    | `/vistas/inicio`             | Muestra la página de inicio.                 | Público |
| GET    | `/vistas/entradas/:eventoId` | Muestra el resumen de entradas de un evento. | ADMIN   |

#### Resumen de entradas por evento

**GET** `/vistas/entradas/:eventoId`

Permite consultar un resumen de las entradas de un evento, incluyendo la información del evento, su sala, las entradas vendidas y las disponibles según la capacidad de la sala.

**Parámetros de ruta:**

| Parámetro  | Tipo     | Descripción               |
| ---------- | -------- | ------------------------- |
| `eventoId` | ObjectId | Identificador del evento. |

**Permisos:** requiere autenticación y rol `ADMIN`.

**Respuestas y errores:**

| Código | Descripción                                             |
| ------ | ------------------------------------------------------- |
| 200    | Vista renderizada correctamente.                        |
| 400    | El identificador del evento no tiene un formato válido. |
| 401    | No existe una sesión válida.                            |
| 403    | El usuario no tiene permisos de administrador.          |
| 404    | No se encontró el evento o su sala asociada.            |

**Nota:** los endpoints de consulta y gestión de entradas se documentan en la sección [Entradas](#entradas). Esta ruta corresponde exclusivamente a la vista HTML del resumen.

---

## 4. Consideraciones generales

- Los identificadores de recursos se reciben y validan como ObjectId.
- Las operaciones protegidas requieren una sesión autenticada.
- Las reglas de autorización y titularidad se aplican en el backend, no se delegan a los datos enviados por el cliente.
- Los errores se centralizan y se devuelven con un formato uniforme.
- Los ejemplos de este documento son ilustrativos; no representan datos reales de la base de datos.

## 5. Documentación relacionada

- [README.md](./README.md): presentación y puesta en marcha del proyecto.
- [ARCHITECTURE.md](./ARCHITECTURE.md): arquitectura y organización interna.
- [ERRORS.md](./ERRORS.md): manejo de errores y códigos HTTP.
