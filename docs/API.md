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

> Pendiente de documentar.

### 3.3. Eventos

> Pendiente de documentar.

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

> Pendiente de documentar.

### 3.6. Vistas

> Pendiente de documentar las demás rutas que renderizan páginas HTML.

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
