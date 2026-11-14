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

El primer usuario (`usuario1@example.com`) es **administrador** y el resto son **clientes**. Las contraseñas de prueba son ficticias pero están **hasheadas con bcrypt** desde F7.2. La contraseña de prueba es `Prueba001!` para el usuario 1, `Prueba002!` para el 2, y así sucesivamente.

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

Los resultados esperados corresponden a las reglas de negocio vigentes. Los mensajes exactos pueden cambiar con la refactorización del backend (F8); lo que no cambia es el código de estado y el motivo del rechazo.

Para operar sobre un evento hace falta su `id`: se obtiene con `GET /eventos` o desde `/vistas/eventos`.

| Escenario                         | Cómo reproducirlo                                                                                | Resultado esperado                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Disponibilidad con pocos cupos    | `GET /entradas/disponibles/:id` de `Evento pocos cupos 11`                                       | `disponibles: 3`                                          |
| Evento agotado                    | `GET /entradas/disponibles/:id` de `Evento agotado 12`                                           | `disponibles: 0`                                          |
| Venta con evento agotado          | `POST /entradas` con ese evento y un usuario activo                                              | 400, el evento alcanzó su capacidad máxima                |
| Llenar los últimos cupos          | Vender 3 entradas del evento con pocos cupos y una cuarta                                        | Las tres primeras responden 201; la cuarta, 400           |
| Cancelar libera el lugar          | `PATCH /entradas/:id/cancelar` sobre una entrada vendida del evento agotado y volver a consultar | La disponibilidad pasa de 0 a 1; se puede vender de nuevo |
| Cancelar dos veces                | Repetir la cancelación de la misma entrada                                                       | 400, la entrada ya está cancelada                         |
| Evento finalizado                 | `POST /entradas` sobre `Evento finalizado 1`                                                     | 400, el evento no permite nuevas ventas                   |
| Venta vencida                     | `POST /entradas` sobre `Evento venta vencida 6`                                                  | 400, el evento no permite nuevas ventas                   |
| Evento cancelado                  | `POST /entradas` sobre `Evento cancelado 8`                                                      | 400, el evento no permite nuevas ventas                   |
| Cliente inactivo                  | `POST /entradas` sobre un evento normal con el `id` de `usuario19`                               | 400, el cliente está inactivo                             |
| Venta normal                      | `POST /entradas` sobre `Evento normal 13` con un usuario activo                                  | 201, y baja un cupo la disponibilidad                     |
| Login de usuario inactivo         | `POST /usuarios/login` con `usuario19@example.com` y `Prueba019!`                                | 403, usuario inactivo                                     |
| Login correcto                    | `POST /usuarios/login` con `usuario1@example.com` y `Prueba001!`                                 | 200                                                       |
| Sala inactiva                     | `POST /eventos` con el `id` de `Sala de prueba 16`                                               | 400, la sala está inactiva                                |
| Superposición de eventos          | `POST /eventos` en `Sala de prueba 1` con fechas que se pisen con las del evento con pocos cupos | 400, el evento se superpone con otro                      |
| Baja de sala con eventos próximos | `PATCH /salas/:id` con `estado: "inactiva"` sobre `Sala de prueba 2`                             | 409, tiene eventos próximos activos                       |
| Baja de sala sin eventos próximos | El mismo pedido sobre `Sala de prueba 12` o `Sala de prueba 9`                                   | 200                                                       |
| Reservas                          | `GET /reservas`                                                                                  | 20 reservas, una por evento, a nombre de usuarios activos |

## Pendientes

- ~~**Roles y permisos (F7).**~~ **Implementado en F7.2.** El seed ya crea un administrador (`usuario1@example.com`) y 19 clientes. Los roles se asignan al generar los usuarios (`scripts/seeds/usuarios.js`).
- ~~**Hash de contraseñas (F7.2).**~~ **Implementado en F7.2.** El módulo `scripts/seeds/usuarios.js` hashea las contraseñas con `bcrypt` antes de insertarlas. Las credenciales de prueba siguen siendo las mismas (`Prueba001!` a `Prueba020!`).
- **Entradas y reservas a nombre de un cliente (F9).** Cuando se defina cómo se registra quién realizó la operación y quién es el titular, el seed debe incluir entradas registradas por un administrador.
