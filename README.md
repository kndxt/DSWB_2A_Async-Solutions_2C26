# Urbana Cult — Sistema de gestión de eventos y entradas

## 1. Descripción

Urbana Cult es un sistema backend desarrollado para centralizar la gestión de eventos culturales y la venta de entradas.

El sistema surge a partir de una problemática en la que la información de eventos y entradas se administra mediante diferentes planillas, dificultando el seguimiento de las ventas y de la disponibilidad de localidades y pudiendo generar situaciones de sobreventa.

Para esta primera entrega se desarrolló una API REST utilizando Node.js y Express, con persistencia mediante archivos JSON. El sistema permite gestionar usuarios, salas, eventos y entradas, además de consultar la disponibilidad de localidades y visualizar determinada información mediante vistas desarrolladas con Pug.

---

## 2. Alcance de la primera entrega

En esta primera etapa se implementaron los siguientes recursos:

* **Usuarios:** registro, consulta, modificación y eliminación.
* **Salas:** registro, consulta y modificación.
* **Eventos:** registro, consulta y modificación, asociados a una sala existente.
* **Entradas:** venta, consulta y cancelación.
* **Consultas:** entradas vendidas, entradas vendidas por evento, entradas disponibles por evento y eventos próximos.
* **Vistas:** visualización de eventos próximos y de información de entradas para un evento mediante Pug.

### Funcionalidades fuera del alcance

El modelo general contempla otras funcionalidades que no fueron implementadas en esta primera entrega, entre ellas:

* Gestión de reservas.
* Roles y permisos de usuarios.
* Persistencia mediante MongoDB.
* Otras funcionalidades previstas para etapas posteriores.

El alcance fue acotado de acuerdo con los requerimientos de esta primera etapa, priorizando el funcionamiento del backend, la persistencia, las rutas, las consultas, las reglas de negocio y el manejo de errores.

---

## 3. Tecnologías utilizadas

| Tecnología                   | Uso                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Node.js**                  | Entorno de ejecución para el backend.                                                                |
| **Express.js**               | Framework utilizado para construir la API REST y gestionar rutas y middleware.                       |
| **JavaScript**               | Lenguaje utilizado para la implementación del backend.                                               |
| **JSON**                     | Mecanismo de persistencia utilizado en esta primera entrega.                                         |
| **Pug**                      | Motor de plantillas utilizado para las vistas del sistema.                                           |
| **Nodemon**                  | Herramienta utilizada durante el desarrollo para reiniciar automáticamente el servidor ante cambios. |
| **Git / GitHub**             | Control de versiones y trabajo colaborativo.                                                         |
| **Thunder Client / Postman** | Herramientas utilizadas para probar los endpoints de la API.                                         |

---

## 4. Estructura del proyecto

El proyecto utiliza una organización basada en MVC, separando las responsabilidades principales de la aplicación.

```text
Urbana-Cult/

├── controllers/
│   ├── usuarioController.js
│   ├── salaController.js
│   ├── eventoController.js
│   ├── entradaController.js
│   └── vistasController.js
│
├── models/
│   ├── usuarioModel.js
│   ├── salaModel.js
│   ├── eventoModel.js
│   └── entradaModel.js
│
├── routes/
│   ├── usuarioRoutes.js
│   ├── salaRoutes.js
│   ├── eventoRoutes.js
│   ├── entradaRoutes.js
│   └── vistasRoutes.js
│
├── data/
│   ├── usuarios.json
│   ├── salas.json
│   ├── eventos.json
│   └── entradas.json
│
├── views/
│   ├── eventos.pug
│   └── entradas.pug
│
├── app.js
├── package.json
└── README.md
```

### Responsabilidad de cada componente

* **Models:** representan las entidades y concentran las operaciones relacionadas con la consulta y persistencia de sus datos.
* **Controllers:** reciben las solicitudes HTTP, coordinan el flujo de cada operación, aplican las validaciones y reglas correspondientes y construyen las respuestas.
* **Routes:** definen las rutas disponibles y las vinculan con los controllers correspondientes.
* **Data:** contiene los archivos JSON utilizados como mecanismo de persistencia.
* **Views:** contienen las plantillas Pug utilizadas para representar información desde el navegador.
* **`app.js`:** configura Express, el middleware JSON, el motor de vistas y las rutas principales de la aplicación.

---

## 5. Instalación y ejecución

### Requisitos

Se requiere tener instalado:

* Node.js
* npm

### Instalación

Clonar el repositorio y acceder a la carpeta del proyecto:

```bash
git clone <URL_DEL_REPOSITORIO>

cd <CARPETA_DEL_PROYECTO>
```

Instalar las dependencias:

```bash
npm install
```

### Ejecución

Para iniciar el servidor:

```bash
node app.js
```

Durante el desarrollo también puede utilizarse Nodemon:

```bash
npm run dev
```

El servidor se ejecuta por defecto en:

```text
http://localhost:3000
```

---

## 6. Persistencia de datos

Para esta primera entrega se utilizó **persistencia mediante archivos JSON**, de acuerdo con el alcance establecido para esta etapa del proyecto.

La información de cada recurso se almacena de forma independiente en archivos correspondientes a los módulos implementados:

* `usuarios.json`
* `salas.json`
* `eventos.json`
* `entradas.json`

Las operaciones de lectura y escritura de estos archivos se encuentran integradas a los respectivos modelos, permitiendo que los controllers trabajen con los datos sin encargarse directamente de la manipulación de los archivos.

---

## 7. Decisiones de diseño

### 7.1 Usuarios en lugar de Clientes

Se contempla que otras personas, como administradores de Urbana Cult, puedan interactuar con el sistema para gestionar salas, eventos u otras funcionalidades.

Por este motivo, se decidió mantener una entidad general que permita representar a las personas que interactúan con el sistema sin asociarla exclusivamente al concepto de cliente.

La diferenciación entre tipos de usuario puede resolverse posteriormente mediante roles y permisos. De esta manera, un mismo usuario podría tener un rol de comprador, administrador u otro que sea necesario incorporar en futuras etapas.

---

### 7.2 Alcance del módulo Salas

Cada sala se considera una unidad administrable y contiene la información necesaria para su gestión, como nombre, capacidad, dirección y datos de su responsable.

Esta decisión permite mantener el modelo enfocado en las funcionalidades requeridas para la entrega y evitar entidades y relaciones que no son necesarias dentro del alcance definido para esta etapa.

Por este motivo, no se creó un modelo separado para `Responsable`, ya que sus datos forman parte de la información propia de cada sala y no requieren una gestión independiente de acuerdo al alcance definido para este proyecto.

---

### 7.3 Creación de entradas al momento de la compra

En este modelo, cada registro de `Entrada` representa una **compra concreta** y queda asociado a un usuario y a un evento.

La disponibilidad no se representa mediante registros de entradas previamente creados, sino que se calcula a partir de la capacidad de la sala y de la cantidad de entradas actualmente vendidas para el evento.

Cuando una entrada se cancela, el registro se conserva con estado `cancelada`. Al dejar de contabilizarse como entrada vendida, el lugar vuelve a estar disponible.

Esta decisión se tomó considerando la necesidad planteada en el caso de contar con un sistema simple para gestionar eventos y venta de entradas. De esta manera, se evita incorporar estructuras adicionales para representar localidades antes de que sean vendidas, manteniendo el modelo acotado a las funcionalidades requeridas.

---

### 7.4 Distribución de responsabilidades dentro de MVC

El equipo decidió que los modelos no se limitarían a representar la estructura de las entidades, sino que también concentrarían las operaciones necesarias para consultar y persistir sus propios datos.

De esta manera, las operaciones relacionadas con los datos de una entidad permanecen agrupadas dentro de su modelo, mientras que los controllers se encargan de coordinar las solicitudes HTTP, aplicar las reglas correspondientes al flujo de cada operación y construir las respuestas de la API.

Esta distribución permite reutilizar las operaciones de los modelos desde distintos controllers sin duplicar la lógica de acceso a los datos.

Si el sistema creciera y las operaciones de acceso a datos adquirieran mayor complejidad, podría resultar conveniente incorporar una capa adicional, como un Repository. Esta posibilidad queda fuera del alcance de la primera entrega para mantener la estructura simple y adecuada al tamaño actual del proyecto.

---

### 7.5 Definición de estados

Los estados posibles de las entidades se definieron como constantes fuera de sus respectivas clases.

Por ejemplo:

* `ESTADOS_ENTRADA` define los estados posibles de una entrada.
* `ESTADOS_EVENTO` define los estados posibles de un evento.

Esta decisión permite centralizar los valores utilizados por el sistema y evita repetir directamente cadenas como `"vendida"`, `"cancelada"` o `"activo"` a lo largo del código.

En el caso de los eventos, se utiliza `Object.values(ESTADOS_EVENTO)` para obtener el conjunto de estados válidos mediante `ESTADOS_VALIDOS`.

Mantener esta convención en los distintos modelos permite conservar una estructura coherente y uniforme.

---

### 7.6 Eliminación de usuarios

Para esta primera entrega se implementó la eliminación de usuarios mediante `DELETE`, dentro de las operaciones CRUD requeridas para el módulo.

Durante el análisis del modelo se identificó que la eliminación física de un usuario puede generar problemas a medida que el sistema crezca, especialmente cuando existen entradas u otros registros asociados.

Por este motivo, para una futura versión se evalúa incorporar un atributo de estado que permita desactivar un usuario sin eliminar físicamente su registro.

Esta alternativa permitiría conservar información histórica y mantener las relaciones existentes.

La definición de este mecanismo queda para una etapa posterior, junto con la evolución del modelo y la migración de la persistencia a MongoDB.

---

### 7.7 Timestamps

Se evaluó incorporar los campos `created_at` y `updated_at` en las entidades del sistema, ya que pueden resultar útiles para seguimiento, auditoría, debugging o implementación de logs.

Sin embargo, se decidió no incorporarlos en esta primera entrega porque no forman parte de los requerimientos actuales.

Los timestamps podrán incorporarse posteriormente si la evolución del sistema genera una necesidad concreta de contar con información temporal adicional.

---

## 8. Endpoints

### Usuarios

| Método | Ruta            | Descripción                 |
| ------ | --------------- | --------------------------- |
| GET    | `/usuarios`     | Obtener todos los usuarios. |
| GET    | `/usuarios/:id` | Obtener un usuario por ID.  |
| POST   | `/usuarios`     | Registrar un nuevo usuario. |
| PUT    | `/usuarios/:id` | Modificar un usuario.       |
| DELETE | `/usuarios/:id` | Eliminar un usuario.        |

### Salas

| Método | Ruta         | Descripción               |
| ------ | ------------ | ------------------------- |
| GET    | `/salas`     | Obtener todas las salas.  |
| GET    | `/salas/:id` | Obtener una sala por ID.  |
| POST   | `/salas`     | Registrar una nueva sala. |
| PUT    | `/salas/:id` | Modificar una sala.       |

### Eventos

| Método | Ruta                | Descripción                   |
| ------ | ------------------- | ----------------------------- |
| GET    | `/eventos`          | Obtener todos los eventos.    |
| GET    | `/eventos/:id`      | Obtener un evento por ID.     |
| POST   | `/eventos`          | Registrar un nuevo evento.    |
| PUT    | `/eventos/:id`      | Modificar un evento.          |
| GET    | `/eventos/proximos` | Obtener los eventos próximos. |

### Entradas

| Método | Ruta                              | Descripción                                                 |
| ------ | --------------------------------- | ----------------------------------------------------------- |
| GET    | `/entradas`                       | Obtener todas las entradas registradas.                     |
| GET    | `/entradas/:id`                   | Obtener una entrada por ID.                                 |
| POST   | `/entradas`                       | Registrar la venta de una entrada.                          |
| PATCH  | `/entradas/:id/cancelar`          | Cancelar una entrada.                                       |
| GET    | `/entradas/vendidas`              | Obtener todas las entradas vendidas vigentes.            |
| GET    | `/entradas/vendidas/:eventoId`    | Obtener las entradas vendidas de un evento.                 |
| GET    | `/entradas/disponibles/:eventoId` | Obtener la cantidad de entradas disponibles para un evento. |


### Vistas

Las vistas utilizan rutas independientes de los endpoints de la API:

| Método | Ruta                         | Descripción                                                               |
| ------ | ---------------------------- | ------------------------------------------------------------------------- |
| GET    | `/vistas/eventos`            | Visualizar los eventos próximos mediante Pug.                             |
| GET    | `/vistas/entradas/:eventoId` | Visualizar información de entradas vendidas y disponibles para un evento. |

---

## 9. Reglas de negocio

Las principales reglas implementadas son las siguientes:

### Eventos

* Todo evento debe estar asociado a una sala existente.
* La fecha de finalización del evento no puede ser anterior a la fecha de inicio.
* El período de venta debe tener fechas coherentes.
* La fecha de finalización de venta no puede superar el inicio del evento.
* El precio de entrada debe ser válido.
* El estado del evento debe pertenecer a los estados definidos por el sistema.
* El evento debe encontrarse activo y dentro de su período de prueba para permitir nuevas ventas de entradas.

### Entradas

Para registrar una venta:

1. El evento debe existir.
2. El usuario debe existir.
3. La sala asociada al evento debe existir.
4. Debe existir disponibilidad de localidades.
5. Las entradas solamente pueden venderse cuando el evento se encuentra activo y dentro de su período de venta.

La cantidad disponible se obtiene a partir de la capacidad de la sala y de las entradas actualmente vendidas para el evento.

Las entradas canceladas no se consideran vendidas y, por lo tanto, vuelven a liberar disponibilidad.

Una entrada que ya se encuentra cancelada no puede volver a cancelarse.

---

## 10. Manejo de errores

La API utiliza códigos HTTP para informar el resultado de las operaciones.

| Código                        | Uso                                                         |
| ----------------------------- | ----------------------------------------------------------- |
| **200 OK**                    | Operación realizada correctamente.                          |
| **201 Created**               | Recurso creado correctamente.                               |
| **400 Bad Request**           | Datos o condiciones de la operación no permiten realizarla. |
| **404 Not Found**             | El recurso solicitado no existe.                            |
| **500 Internal Server Error** | Se produjo un error interno durante el procesamiento.       |

Los errores se devuelven en las respuestas de la API mediante mensajes que permiten identificar la situación.

Algunos ejemplos:

* Evento inexistente.
* Usuario inexistente.
* Sala inexistente.
* Entrada inexistente.
* Evento sin disponibilidad.
* Evento que no permite nuevas ventas.
* Entrada que ya fue cancelada.
* Datos obligatorios no recibidos.

---

## 11. Vistas con Pug

Se incorporó **Pug** como motor de plantillas para demostrar la integración entre el backend y una representación visual básica de la información.

Las vistas desarrolladas son:

### Eventos próximos

Ruta:

```text
GET /vistas/eventos
```

Permite visualizar los eventos próximos obtenidos mediante la consulta correspondiente del módulo `Eventos`.

### Entradas de un evento

Ruta:

```text
GET /vistas/entradas/:eventoId
```

Permite visualizar información del evento seleccionado, su sala, las entradas vendidas y la cantidad de entradas disponibles.

Las vistas tienen un propósito principalmente funcional y demostrativo. El diseño visual no constituye el foco de esta primera entrega.

---

## 12. Participación y responsabilidades dentro del repositorio

El desarrollo se distribuyó entre los integrantes del equipo de acuerdo con los módulos y tareas de la primera entrega.

* **[@federicosd06-dev](https://github.com/federicosd06-dev) — Usuarios y configuración inicial:** implementación del módulo de Usuarios. Participación en la configuración inicial del proyecto, instalación y actualización de dependencias, resolución de vulnerabilidades detectadas, incorporación de Pug y Nodemon, definición de la estructura inicial de carpetas y primera distribución de tareas.

* **[@kndxt](https://github.com/kndxt) — Salas, Eventos y administración del repositorio:** implementación de los módulos de Salas y Eventos. Creación y administración del repositorio de GitHub, configuración inicial de Express y revisión de la uniformidad de los datos utilizados en el proyecto, incluyendo la normalización del formato de fechas.

* **[@mvjhart](https://github.com/mvjhart) — Entradas, reglas de negocio y documentación:** implementación del módulo de Entradas, incluyendo la venta y cancelación, control de disponibilidad y reglas de negocio asociadas. Elaboración de la documentación general de la entrega y del README.

* **[@Marcos028](https://github.com/Marcos028) — Consultas y vistas:** implementación de las consultas requeridas por el caso y configuración de Pug como motor de plantillas. Desarrollo de las vistas y rutas necesarias para mostrar los eventos próximos y la información de entradas vendidas y disponibles para un evento.

