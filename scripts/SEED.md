# Carga de datos de prueba

Esta guía explica cómo cargar los datos de prueba de Urbana Cult, qué contiene cada conjunto y cómo reproducir los escenarios que sirven para verificar las reglas de negocio.

Los datos se generan con código (`scripts/seeds/`), se validan contra los esquemas de Mongoose y se insertan con `scripts/seed.js`. Ya no se usa `mongosh`: alcanza con Node y la URI de la base.

## Bases de datos

El proyecto usa bases separadas para que las pruebas no afecten al sitio desplegado.

| Base              | Uso                                                    |
| ----------------- | ------------------------------------------------------ |
| `urbana_cult`     | Producción: la usa el servicio desplegado en Render.   |
| `urbana_cult_dev` | Desarrollo: la usa cada integrante en su `.env` local. |

Para trabajar sin Atlas, `npm run seed:local` carga una base MongoDB instalada en la propia máquina.

## Comandos

| Comando                      | Qué hace                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run seed:verificar`     | Genera y valida los datos sin conectarse a ninguna base. Sirve para comprobar que siguen siendo compatibles con los modelos.     |
| `npm run seed`               | Carga los datos en la base que indica `MONGODB_URI` (destino `atlas`).                                                           |
| `npm run seed:local`         | Carga los datos en una base local. Usa `MONGODB_URI_LOCAL` si está definida; si no, `mongodb://127.0.0.1:27017/urbana_cult_dev`. |
| `node scripts/db-testing.js` | Atajo equivalente a `npm run seed:local`.                                                                                        |

Para cargar la base de producción hay que apuntar `MONGODB_URI` a `urbana_cult` y agregar `--permitir-produccion`. Conviene hacerlo sin modificar el `.env`, definiendo la variable solo para ese comando (en Git Bash, con comillas simples):

```bash
MONGODB_URI='mongodb+srv://USUARIO:CLAVE@CLUSTER.mongodb.net/urbana_cult?retryWrites=true&w=majority' npm run seed -- --permitir-produccion
```

## Medidas de seguridad del script

El script borra datos, así que tiene varias protecciones, aplicadas en este orden:

1. Exige indicar el destino (`--destino=local` o `--destino=atlas`). Sin destino no hace nada.
2. Genera y valida los datos antes de conectarse: si hay un error en los datos, no se borra nada.
3. Se conecta y muestra el destino, el nombre de la base y el host (nunca la URI completa) antes de modificar algo.
4. En el destino `atlas` se niega a operar sobre una base cuyo nombre no termine en `_dev`, salvo que se agregue `--permitir-produccion`.
5. Pide escribir el nombre de la base para confirmar. Solo el destino local admite `--yes` para omitir la confirmación.

Cada ejecución elimina todos los documentos de las colecciones `usuarios`, `salas`, `eventos` y `entradas` de la base elegida y las vuelve a cargar. No toca otras colecciones. Los datos eliminados no se conservan.

Las inserciones usan `insertMany`: los documentos se validan contra los esquemas, pero no se ejecutan los hooks de guardado (`pre("save")`). Por eso el módulo `scripts/seeds/usuarios.js` hashea las contraseñas con `bcrypt` antes de insertarlas.

## Datos generados

Se cargan 20 usuarios, 20 salas, 20 eventos y 167 entradas. La reserva de cada evento se guarda embebida dentro del evento, no en una colección aparte.

Las fechas se calculan respecto del momento en que se ejecuta el seed. Un evento "normal" cargado hoy puede estar cerrado dentro de unas semanas, por eso conviene volver a ejecutarlo poco antes de una demostración.

### Usuarios

Hay 20 usuarios. Los últimos dos (`usuario19` y `usuario20`) están inactivos.

| Dato       | Valor                                                               |
| ---------- | ------------------------------------------------------------------- |
| Email      | `usuario1@example.com` a `usuario20@example.com`                    |
| Contraseña | `Prueba001!` a `Prueba020!` (el número coincide con el del usuario) |
| Estado     | activos del 1 al 18, inactivos 19 y 20                              |
| Rol        | `usuario1` es administrador; del 2 al 20 son clientes               |

El primer usuario (`usuario1@example.com`) es administrador y el resto son clientes. Las contraseñas se almacenan hasheadas con bcrypt, igual que las que se crean desde la aplicación (el hash se genera en `scripts/seeds/usuarios.js`). La contraseña de cada usuario es `Prueba` seguido de su número con tres dígitos y un signo de exclamación: `Prueba001!` para el usuario 1, `Prueba002!` para el 2, y así sucesivamente.

### Salas

Hay 20 salas llamadas `Sala de prueba 1` a `Sala de prueba 20`.

- **Sala de prueba 1** tiene capacidad 30 y es la que usan el evento con pocos cupos y el evento agotado. Las demás tienen capacidad de 45 en adelante (de 5 en 5).
- Las salas 16 a 20 están **inactivas**.
- Hay 7 responsables, cada uno a cargo de hasta 3 salas.
- Las salas 9, 10 y 11 solo tienen eventos cancelados, y las salas 12 y 13 no tienen ningún evento.

### Eventos

El nombre de cada evento indica su escenario.

| Evento                         | Cantidad | Estado y fechas                                   | Entradas vendidas         |
| ------------------------------ | -------- | ------------------------------------------------- | ------------------------- |
| `Evento finalizado 1` a `5`    | 5        | estado `finalizado`, fechas pasadas               | 5 cada uno                |
| `Evento venta vencida 6` y `7` | 2        | `activo`, evento futuro, venta cerrada ayer       | 5 cada uno                |
| `Evento cancelado 8` a `10`    | 3        | estado `cancelado`, evento futuro                 | 5 cada uno                |
| `Evento pocos cupos 11`        | 1        | `activo`, venta abierta, en la sala de 30 lugares | 27 (quedan 3 disponibles) |
| `Evento agotado 12`            | 1        | `activo`, venta abierta, en la sala de 30 lugares | 30 (quedan 0 disponibles) |
| `Evento normal 13` a `20`      | 8        | `activo`, venta abierta                           | 5 cada uno                |

Cada evento dura 3 horas y empieza a las 20:00. Además de las vendidas, cada evento tiene una entrada cancelada, que no ocupa lugar.

La reserva de cada evento está a nombre de un usuario activo, con la fecha en el pasado y el precio de reserva vigente de la sala.

## Escenarios de prueba

Los resultados esperados corresponden al comportamiento actual del backend. Los mensajes de error pueden ajustarse con futuras refactorizaciones; lo que debe mantenerse es el código de estado y el motivo del rechazo.

Todas las operaciones sobre entradas, reservas, salas y usuarios requieren una sesión. Primero hay que iniciar sesión con `POST /usuarios/login` (o desde `/vistas/login`) y reutilizar la cookie `token` en las siguientes peticiones. Para las consultas administrativas se usa `usuario1@example.com`; para las operaciones de cliente, cualquier usuario del 2 al 18.

Las entradas se compran siempre a nombre de quien tiene la sesión iniciada: el body solo lleva `eventoId`. Para operar sobre un evento hace falta su `id`, que se obtiene con `GET /eventos` o desde `/vistas/eventos`. Para cancelar una entrada hace falta el `id` de la entrada, que se obtiene con `GET /entradas`.

### Entradas y disponibilidad

| Escenario                      | Cómo reproducirlo                                                                                          | Resultado esperado                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Disponibilidad con pocos cupos | Como admin, `GET /entradas/disponibles/:id` de `Evento pocos cupos 11`                                     | `disponibles: 3`                                          |
| Evento agotado                 | Como admin, `GET /entradas/disponibles/:id` de `Evento agotado 12`                                         | `disponibles: 0`                                          |
| Venta con evento agotado       | Como cliente, `POST /entradas` con el `eventoId` de `Evento agotado 12`                                    | 409, el evento ya alcanzó su capacidad máxima             |
| Llenar los últimos cupos       | Comprar 3 entradas de `Evento pocos cupos 11` y una cuarta                                                 | Las tres primeras responden 201; la cuarta, 409           |
| Cancelar libera el lugar       | `PATCH /entradas/:id/cancelar` sobre una entrada vendida del evento agotado y volver a consultar           | La disponibilidad pasa de 0 a 1; se puede vender de nuevo |
| Cancelar dos veces             | Repetir la cancelación de la misma entrada                                                                 | 409, la entrada ya está cancelada                         |
| Evento finalizado              | `POST /entradas` sobre `Evento finalizado 1`                                                               | 409, el evento no permite nuevas ventas                   |
| Venta vencida                  | `POST /entradas` sobre `Evento venta vencida 6`                                                            | 409, el evento no permite nuevas ventas                   |
| Evento cancelado               | `POST /entradas` sobre `Evento cancelado 8`                                                                | 409, el evento no permite nuevas ventas                   |
| Venta normal                   | `POST /entradas` sobre `Evento normal 13`                                                                  | 201, y baja un cupo la disponibilidad                     |

### Autenticación y permisos

| Escenario                         | Cómo reproducirlo                                                                                       | Resultado esperado                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Login correcto                    | `POST /usuarios/login` con `usuario1@example.com` y `Prueba001!`                                        | 200 y cookie `token`                                     |
| Login de usuario inactivo         | `POST /usuarios/login` con `usuario19@example.com` y `Prueba019!`                                       | 403, el usuario se encuentra inactivo                    |
| Credenciales incorrectas          | `POST /usuarios/login` con una contraseña equivocada                                                    | 401, credenciales incorrectas                            |
| Sesión de un usuario desactivado  | Iniciar sesión como cliente, desactivarlo como admin con `PATCH /usuarios/:id/estado` y reutilizar su cookie | 403 en cualquier ruta protegida                          |
| Cliente en rutas de administración| Como cliente, `GET /salas` o `GET /usuarios`                                                           | 403                                                      |
| Cliente consulta entradas ajenas  | Como cliente, `GET /entradas?usuarioId=<otro>`                                                          | 200, pero solo devuelve sus propias entradas             |
| Cancelar una entrada ajena        | Como cliente, `PATCH /entradas/:id/cancelar` con la entrada de otro usuario                             | 404, entrada no encontrada                               |
| Autocambio de rol o estado        | Como admin, `PATCH /usuarios/:id/rol` o `/estado` con el `id` del propio administrador                 | 403                                                      |

### Eventos, salas y reservas

| Escenario                         | Cómo reproducirlo                                                                                  | Resultado esperado                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Sala inactiva                     | Como admin, `POST /eventos` con el `id` de `Sala de prueba 16`                                     | 409, no se puede crear un evento en una sala inactiva       |
| Superposición de eventos          | Como admin, `POST /eventos` en `Sala de prueba 1` con fechas que se pisen con `Evento pocos cupos 11` | 409, el evento se superpone con otro de la misma sala       |
| Baja de sala con eventos próximos | Como admin, `PATCH /salas/:id` con `estado: "inactiva"` sobre `Sala de prueba 2`                   | 409, tiene eventos próximos activos                         |
| Baja de sala sin eventos próximos | El mismo pedido sobre `Sala de prueba 12` o `Sala de prueba 9`                                     | 200                                                         |
| Reservas como administrador       | Como admin, `GET /reservas`                                                                        | 20 reservas, una por evento, a nombre de usuarios activos   |
| Reservas como cliente             | Como cliente, `GET /reservas`                                                                      | Solo las reservas a su nombre (puede ser un array vacío)    |

## Pendientes

- ~~**Roles y permisos (F7).**~~ **Implementado en F7.2.** El seed ya crea un administrador (`usuario1@example.com`) y 19 clientes. Los roles se asignan al generar los usuarios (`scripts/seeds/usuarios.js`).
- ~~**Hash de contraseñas (F7.2).**~~ **Implementado en F7.2.** El módulo `scripts/seeds/usuarios.js` hashea las contraseñas con `bcrypt` antes de insertarlas. Las credenciales de prueba siguen siendo las mismas (`Prueba001!` a `Prueba020!`).
- **Entradas y reservas a nombre de un cliente (F9).** Cuando se defina cómo se registra quién realizó la operación y quién es el titular, el seed debe incluir entradas registradas por un administrador.
