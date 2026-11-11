# Manejo de errores

## 1. Propósito

Este documento establece los criterios para crear, reutilizar y propagar errores dentro del backend.

El objetivo es mantener un tratamiento consistente de los errores de aplicación y evitar respuestas HTTP duplicadas o implementaciones particulares en cada módulo.

## 2. Organización

El manejo de errores se distribuye entre:

- `errors/errores.js`: clases de errores de aplicación.
- `errors/traducirError.js`: traducción de determinados errores técnicos.
- `middlewares/asyncHandler.js`: propagación de errores de operaciones asíncronas.
- `middlewares/errorHandler.js`: tratamiento centralizado y respuesta HTTP.

## 3. Errores de aplicación

Las clases disponibles heredan de `AppError`.

| Clase | Código HTTP | Utilización |
|---|---:|---|
| `ValidationError` | 400 | Datos de entrada inválidos. |
| `UnauthorizedError` | 401 | No existe una autenticación válida. |
| `ForbiddenError` | 403 | El usuario autenticado no tiene permisos. |
| `NotFoundError` | 404 | El recurso no existe o no puede ser encontrado según las reglas de acceso. |
| `ConflictError` | 409 | La operación no puede realizarse por el estado actual del recurso o una regla de negocio. |

## 4. Cuándo utilizar cada error

### 4.1. ValidationError

Se utiliza cuando los datos recibidos no cumplen las condiciones esperadas para una operación.

No debe utilizarse para representar conflictos con el estado del sistema.

### 4.2. UnauthorizedError

Se utiliza cuando no se puede establecer una identidad autenticada válida.

Por ejemplo:
- No se proporcionó una sesión.
- El token es inválido o expiró.
- El usuario asociado al token no existe.

### 4.3. ForbiddenError

Se utiliza cuando el usuario está autenticado, pero no tiene autorización para realizar una operación.

No debe confundirse con la falta de autenticación.

### 4.4. NotFoundError

Se utiliza cuando un recurso requerido no existe.

También puede utilizarse cuando una regla de acceso requiere ocultar la existencia de un recurso a otro usuario.

### 4.5. ConflictError

Se utiliza cuando la operación entra en conflicto con el estado actual del sistema.

Por ejemplo:
- Intentar vender una entrada cuando el evento no permite ventas.
- Intentar realizar una operación sobre un recurso cuyo estado no lo permite.

## 5. Cómo reutilizar los errores

Las clases deben importarse desde `errors/errores.js`.

Ejemplo:

```js
import {
  NotFoundError,
  ConflictError,
} from "../errors/errores.js";
```

Dentro de un service:

```js
const evento = await Evento.obtenerPorId(eventoId);

if (!evento) {
  throw new NotFoundError("El evento no existe");
}

if (!Evento.puedeVenderEntradas(evento)) {
  throw new ConflictError("El evento no permite ventas");
}
```

Para autenticación y autorización:

```js
import {
  UnauthorizedError,
  ForbiddenError,
} from "../errors/errores.js";
```

Los middlewares y servicios deben utilizar las clases existentes según la situación. No se deben crear clases equivalentes, duplicar códigos HTTP ni responder directamente con JSON desde un service.

## 6. Propagación de errores

Los errores deben propagarse hasta el manejador centralizado.

- Los services lanzan los errores de aplicación cuando una operación no puede completarse.
- Los controllers no deben capturar errores para construir respuestas particulares.
- `asyncHandler` permite propagar errores de handlers asíncronos.
- `errorHandler` centraliza su tratamiento y genera la respuesta HTTP correspondiente.

Los errores técnicos conocidos pueden ser convertidos mediante `traducirError.js`.

Los errores desconocidos deben conservar su tratamiento como errores internos.

## 7. Formato de respuesta

Las solicitudes de la API reciben respuestas JSON con el formato:

```json
{
  "error": "Descripción del error"
}
```

En producción no se debe exponer información interna, trazas ni detalles de implementación.

## 8. Criterios generales

1. Reutilizar las clases existentes antes de incorporar una nueva.
2. No utilizar un error HTTP únicamente porque su código parezca adecuado: considerar la naturaleza del problema.
3. Mantener las reglas de negocio y sus errores en los services.
4. No duplicar el manejo de errores en controllers.
5. No responder manualmente desde cada middleware cuando corresponde propagar el error.
6. Incorporar una nueva clase solamente cuando exista una situación diferenciada que justifique su uso.