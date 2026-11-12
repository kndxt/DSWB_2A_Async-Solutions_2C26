# Pruebas automatizadas de API

Estas pruebas documentan el comportamiento actual de la API y sirven como red de seguridad durante refactorizaciones.

## Requisitos

- Node.js compatible con el proyecto.
- MongoDB local en ejecución.
- Archivo `.env` con `MONGODB_URI` apuntando a la base local que utilizan para desarrollo/pruebas.

## Ejecutar

```bash
npm test
```

Para ejecutar un archivo puntual:

```bash
node --test tests/api/usuarios.test.js
```

## Seguridad de datos

La suite **no ejecuta `seed.js`, no vacía colecciones y no elimina la base**. Cada helper registra los `_id` de los documentos que crea y, al finalizar cada archivo de pruebas, elimina únicamente esos documentos.

Aun así, las pruebas escriben datos en la base indicada por `MONGODB_URI`. Antes de ejecutarlas, verificá que esa variable apunte a tu MongoDB local y no a Atlas ni a una base compartida.

## Organización

- `helpers/environment.js`: conexión, servidor HTTP temporal, clientes de Socket.IO, peticiones y fixtures.
- `api/usuarios.test.js`: endpoints de usuarios.
- `api/salas.test.js`: endpoints de salas.
- `api/eventos.test.js`: endpoints y reglas de eventos.
- `api/entradas.test.js`: venta, cancelación y consultas de entradas.
- `middleware/validarIds.test.js`: comportamiento observable del middleware de IDs.
- `sockets/conexion.test.js`: conexión de clientes, eco, difusión, detección de desconexión y emisión del servidor a todos.
- `unit/sockets/index.test.js`: ciclo de vida de la instancia (inicializarSockets, obtenerIO, cerrarSockets).
- `unit/services/aiService.test.js`: servicio de consultas a Gemini con cliente simulado. Cubre respuesta correcta, timeout, cuota agotada, credenciales inválidas, modelo inválido, respuesta vacía, contenido bloqueado, error desconocido y clave ausente.

## Alcance y criterios

Los tests priorizan status HTTP, estructura de respuesta y efectos persistidos. No dependen de los datos precargados por `seed.js`.

Algunos comportamientos actuales se conservan intencionalmente como línea base, aunque estén marcados para revisar: por ejemplo, `precioReserva = 0` y la modificación de contraseña por PUT. Si una decisión funcional cambia, actualizá el test correspondiente junto con el cambio.

## Limitaciones iniciales

La suite cubre los flujos principales, pero no reemplaza una revisión de todos los casos límite. En particular, los casos de capacidad agotada, sala con eventos próximos al intentar inactivarla, solapamientos y duplicados exactos se pueden ampliar en una siguiente iteración.
