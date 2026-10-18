# Urbana Cult — Sistema de gestión de eventos y entradas

## 1. Descripción

Urbana Cult es un sistema backend desarrollado para centralizar la gestión de eventos culturales y la venta de entradas.

El sistema surge a partir de una problemática en la que la información de eventos y entradas se administra mediante diferentes planillas, dificultando el seguimiento de las ventas y de la disponibilidad de localidades.

En esta segunda entrega se continuó el desarrollo de una API REST con Node.js y Express, reemplazando la persistencia mediante archivos JSON por MongoDB, utilizando Mongoose para definir los modelos y operar sobre la base de datos. También se incorporaron middlewares para centralizar el manejo de errores y se ampliaron las vistas desarrolladas con Pug, que permiten consultar información y realizar operaciones mediante solicitudes fetch a la API.

---

## 2. Alcance de la segunda entrega

En esta etapa se continuó el desarrollo de los módulos existentes y se incorporaron nuevas funcionalidades y mejoras técnicas.

- **Usuarios:** registro, consulta, modificación, inicio de sesión y activación o desactivación de usuarios.
- **Salas:** registro, consulta y modificación de salas, con validaciones relacionadas con su estado y los eventos asociados.
- **Eventos:** registro, consulta y modificación de eventos, consulta de próximos eventos y validaciones sobre fechas, períodos de venta, sala asociada y posibles superposiciones.
- **Reservas:** generación automática de una reserva al crear un evento y consulta de las reservas registradas.
- **Entradas:** venta, consulta y cancelación de entradas, consulta de entradas vendidas y control de disponibilidad.
- **Persistencia:** migración de archivos JSON a MongoDB mediante Mongoose.
- **Manejo de errores:** incorporación de middlewares para gestionar rutas inexistentes y centralizar los errores propagados por las operaciones asíncronas.
- **Vistas:** desarrollo de interfaces con Pug para interactuar con los distintos módulos mediante `fetch`, sin necesidad de realizar las operaciones directamente desde una herramienta de prueba de API.

El desarrollo se realizó a partir de la estructura y las reglas de negocio de la primera entrega, adaptándolas al nuevo mecanismo de persistencia e incorporando las funcionalidades previstas para esta etapa.


### Funcionalidades fuera del alcance y aspectos pendientes

Algunas funcionalidades y tareas de validación se identificaron como necesarias para completar el sistema, pero quedaron pendientes para una etapa posterior.

- **Autenticación y autorización:** no se implementaron un sistema completo de autenticación, sesiones ni gestión de roles y permisos. El endpoint de inicio de sesión permite validar credenciales, pero no mantiene una sesión autenticada ni controla permisos de acceso.
- **Protección frente a ventas concurrentes:** la disponibilidad se calcula a partir de la capacidad de la sala y de las entradas vendidas para el evento. La validación existente no garantiza la integridad del cupo ante solicitudes simultáneas. Se decidió no incorporar mecanismos adicionales de concurrencia en esta etapa y dejar documentada esta limitación para una evaluación futura.
- **Integración y validación de las vistas:** si bien se desarrollaron las vistas de los distintos módulos y su interacción con la API mediante `fetch`, quedó pendiente completar las pruebas de integración del flujo principal desde el navegador. Esta tarea incluye verificar la navegación entre módulos, el funcionamiento de las operaciones, la actualización de los listados y la disponibilidad, la consistencia de los mensajes y el manejo de errores, así como corregir posibles inconsistencias entre las vistas y la API.

Estas tareas se retomarán en la siguiente etapa para completar la integración y validar el funcionamiento del sistema desde el navegador.

---

## 3. Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| **Node.js** | Entorno de ejecución del backend. |
| **Express.js** | Framework utilizado para construir la API REST, gestionar rutas y configurar middlewares. |
| **JavaScript (ES Modules)** | Lenguaje y sistema de módulos utilizados en el backend. |
| **MongoDB** | Base de datos utilizada para almacenar la información del sistema. |
| **Mongoose** | ODM utilizado para definir esquemas y modelos, establecer referencias entre documentos y realizar operaciones sobre MongoDB. |
| **dotenv** | Carga de variables de entorno desde un archivo `.env`, para separar la configuración del entorno del código de la aplicación. |
| **Pug** | Motor de plantillas utilizado para generar las vistas de la aplicación. |
| **HTML y CSS** | Estructura y estilos de las interfaces. |
| **JavaScript (Fetch API)** | Consumo de los endpoints de la API desde el navegador mediante solicitudes asíncronas. |
| **npm** | Gestión de dependencias y ejecución de scripts definidos en `package.json`. |
| **Git / GitHub** | Control de versiones, gestión de ramas y colaboración entre los integrantes. |
| **Thunder Client / Postman** | Herramientas para probar los endpoints de la API. |

                                     |

---

## 4. Estructura del proyecto

## 4. Estructura del proyecto

El proyecto utiliza una organización basada en el patrón MVC (Modelo-Vista-Controlador), complementada con rutas, middlewares y módulos auxiliares para la configuración de la base de datos, la interacción con la API y la carga de datos de prueba.

```text
Urbana-Cult/
├── app.js
├── config/
│   └── db.js
├── controllers/
│   ├── entradaController.js
│   ├── eventoController.js
│   ├── reservaController.js
│   ├── salaController.js
│   ├── usuarioController.js
│   └── vistasController.js
├── data/
│   ├── entradas.json
│   ├── eventos.json
│   ├── salas.json
│   └── usuarios.json
├── middlewares/
│   ├── asyncHandler.js
│   ├── errorHandler.js
│   ├── notFound.js
│   └── validarIds.js
├── models/
│   ├── entradaModel.js
│   ├── eventoModel.js
│   ├── reservaModel.js
│   ├── salaModel.js
│   └── usuarioModel.js
├── public/
│   ├── css/
│   │   └── general.css
│   └── js/
│       ├── apiClient.js
│       ├── entradas.js
│       ├── eventos.js
│       ├── login.js
│       ├── mensajes.js
│       ├── reservas.js
│       ├── salas.js
│       ├── tabla.js
│       └── usuarios.js
├── routes/
│   ├── entradaRoutes.js
│   ├── eventoRoutes.js
│   ├── reservaRoutes.js
│   ├── salaRoutes.js
│   ├── usuarioRoutes.js
│   └── vistasRoutes.js
├── scripts/
│   ├── db-testing.js
│   ├── GuiaCarga.md
│   └── seed.js
├── views/
│   ├── entradas/
│   │   └── index.pug
│   ├── includes/
│   │   ├── mensajes.pug
│   │   └── navbar.pug
│   ├── mixins/
│   │   └── tabla.pug
│   ├── entradas.pug
│   ├── error.pug
│   ├── eventos.pug
│   ├── inicio.pug
│   ├── layout.pug
│   ├── login.pug
│   ├── reservas.pug
│   ├── salas.pug
│   └── usuarios.pug
├── package.json
├── package-lock.json
└── README.md
```

### Responsabilidad de cada componente

- **`app.js`:** configura Express, registra los middlewares generales, establece el motor de vistas, monta las rutas y configura el manejo de errores.
- **`config/`:** contiene la configuración de la conexión a MongoDB.
- **`controllers/`:** coordinan las solicitudes HTTP, aplican las reglas de negocio correspondientes y construyen las respuestas de la API. `vistasController.js` gestiona las rutas destinadas a renderizar las vistas.
- **`models/`:** definen los esquemas y las operaciones de acceso a datos mediante Mongoose. `reservaModel.js` representa la estructura de la reserva asociada a un evento.
- **`routes/`:** definen los endpoints de la API y las rutas utilizadas para acceder a las vistas.
- **`middlewares/`:** agrupan funcionalidades transversales, como la propagación de errores asíncronos, el manejo centralizado de errores, las respuestas para rutas inexistentes y la validación de identificadores.
- **`public/`:** contiene los recursos estáticos accesibles desde el navegador. `css/` reúne los estilos y `js/` contiene los scripts que consumen la API, gestionan los mensajes y construyen las interfaces.
- **`views/`:** contiene las plantillas Pug de los módulos, el diseño compartido, la navegación, los mensajes y los recursos reutilizables.
- **`scripts/`:** reúne herramientas auxiliares para probar la conexión y preparar datos de prueba para MongoDB. `GuiaCarga.md` documenta el procedimiento de carga.
- **`package.json` y `package-lock.json`:** definen las dependencias del proyecto y registran sus versiones resueltas, respectivamente.
- **`README.md`:** documenta la configuración, ejecución y funcionamiento del proyecto, junto con las instrucciones necesarias para trabajar con la base de datos.

---

## 5. Instalación y ejecución

### Requisitos

- Node.js
- npm
- MongoDB en ejecución, con una instancia local accesible.
- `mongosh`, para cargar los datos de prueba.

### Instalación

Clonar el repositorio e instalar las dependencias:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <CARPETA_DEL_PROYECTO>
npm install
```

### Configuración del entorno

Crear un archivo `.env` en la raíz del proyecto con las variables de entorno necesarias:

```env
MONGODB_URI=mongodb://localhost:27017/urbana_cult
PORT=3000
```

- `MONGODB_URI`: URI de conexión a MongoDB. El ejemplo corresponde a una instancia local que utiliza la base de datos `urbana_cult`.
- `PORT`: puerto en el que se inicia el servidor. Si no se define, la aplicación utiliza el puerto `3000`.

La aplicación establece la conexión con MongoDB antes de iniciar el servidor. Si la conexión falla o no se define `MONGODB_URI`, el servidor no se inicia correctamente.

### Carga de datos de prueba

El proyecto incluye `scripts/db-testing.js`, un script que permite cargar datos de prueba directamente en MongoDB mediante `mongosh`, sin utilizar los modelos ni los esquemas de Mongoose.

Desde la raíz del proyecto, ejecutar:

```bash
mongosh "mongodb://localhost:27017/urbana_cult" --file scripts/db-testing.js
```

El script genera usuarios, salas, eventos y entradas con distintos estados para probar las funcionalidades del sistema.

**Importante:** cada ejecución elimina primero los documentos existentes en las colecciones `usuarios`, `salas`, `eventos` y `entradas`, y luego carga los nuevos datos. Por eso, debe utilizarse únicamente en una base de datos de desarrollo o pruebas.

Las inserciones se realizan directamente en MongoDB, por lo que no se ejecutan las validaciones definidas en los esquemas de Mongoose.

### Ejecución de la aplicación

Desde la raíz del proyecto, iniciar el servidor:

```bash
node app.js
```

La aplicación estará disponible en `http://localhost:3000`, siempre que el servidor esté configurado para utilizar ese puerto.
---

## 6. Persistencia de datos

En esta segunda entrega se reemplazó la persistencia mediante archivos JSON por **MongoDB**, utilizando **Mongoose** como ODM para definir los esquemas y modelos, establecer referencias entre documentos y realizar operaciones sobre la base de datos.

La información se organiza en colecciones correspondientes a los principales recursos del sistema:

- `usuarios`
- `salas`
- `eventos`
- `entradas`

Las operaciones de acceso y modificación de datos se encuentran encapsuladas en los modelos, permitiendo que los controllers coordinen las solicitudes, apliquen las reglas de negocio y gestionen las respuestas sin encargarse directamente de las consultas a MongoDB.

Las reservas se almacenan como documentos embebidos dentro de los eventos, ya que su creación está vinculada a la creación de un evento y no tienen un ciclo de vida independiente. Aunque se consultan mediante endpoints específicos, no cuentan con una colección propia.

---

## 7. Decisiones de diseño

### 7.1 Modelo de usuarios

Se utiliza una entidad general `Usuario` para representar a las personas registradas en el sistema, sin limitarla exclusivamente al rol de comprador. Esto permite ampliar las funcionalidades en futuras etapas sin necesidad de introducir una entidad distinta para cada tipo de usuario.

Los usuarios pueden estar activos o inactivos. Se optó por conservar sus registros y modificar su estado en lugar de eliminarlos físicamente, para mantener la información histórica y las referencias desde otros documentos.

El endpoint de inicio de sesión permite validar credenciales, pero no implementa sesiones persistentes ni mecanismos de autorización basados en roles y permisos. Estas funcionalidades quedan fuera del alcance de esta entrega.

---

### 7.2 Estructura del modelo de salas

Los datos del responsable se almacenan dentro del documento de `Sala`, como un subdocumento, sin crear una colección ni un modelo independiente para esta información.

Esta decisión responde al alcance actual del sistema: los datos del responsable forman parte de la información de la sala y no requieren operaciones ni un ciclo de vida propios. De esta manera, se evita agregar complejidad al modelo sin una necesidad funcional que lo justifique.

---

### 7.3 Modelo de entradas y conservación de registros

Cada documento de `Entrada` representa una entrada asociada a un evento y a un usuario. Los lugares disponibles no se representan mediante registros creados previamente, sino que se calculan a partir de la capacidad de la sala y de las entradas vendidas para el evento.

Cuando una entrada se cancela, el documento se conserva y su estado cambia a `cancelada`. Este enfoque permite mantener un registro de las operaciones realizadas y distinguir las entradas vendidas de las canceladas sin eliminar información histórica.

Se aplica un criterio similar a los eventos cancelados: se conserva el documento y su información asociada, en lugar de eliminarlo físicamente.

---

### 7.4 Persistencia y relaciones entre documentos

En esta entrega se reemplazó la persistencia mediante archivos JSON por MongoDB, utilizando Mongoose para definir esquemas y modelos, validar datos y realizar operaciones sobre la base de datos.

Las entidades que necesitan identificarse y consultarse de manera independiente se almacenan en sus propias colecciones. Las relaciones entre usuarios, salas, eventos y entradas se representan mediante referencias entre documentos.

Las reservas, en cambio, se almacenan como subdocumentos dentro de los eventos. Se tomó esta decisión porque una reserva se genera al crear un evento y no tiene un ciclo de vida independiente dentro del sistema. Aunque la información de las reservas se consulta mediante endpoints específicos, no requiere una colección propia.

Esta estructura busca mantener un equilibrio entre la separación de las entidades que se administran de manera independiente y la incorporación de información que forma parte de un mismo registro.

---

### 7.5 Arquitectura del backend: separación de responsabilidades y reutilización

La aplicación organiza sus responsabilidades mediante una estructura basada en modelos, controllers, rutas y middlewares.

- **Modelos:** concentran las operaciones de acceso y persistencia de datos, junto con las definiciones correspondientes a cada entidad.
- **Controllers:** coordinan las solicitudes HTTP, aplican las reglas correspondientes a cada operación y construyen las respuestas de la API.
- **Rutas:** definen los endpoints disponibles y los vinculan con sus respectivos controllers.
- **Middlewares:** permiten reutilizar comportamientos transversales, como la validación de identificadores, la gestión de rutas inexistentes y el manejo de errores.

Esta distribución permite mantener agrupadas las responsabilidades relacionadas y reducir la duplicación de código. También facilita reutilizar operaciones de los modelos desde distintos controllers sin repetir las consultas a la base de datos.

Para el manejo de errores asíncronos se incorporó `asyncHandler`, que permite propagar los errores de los controllers al middleware centralizado `errorHandler`. De esta manera, se separa la gestión general de los errores de las responsabilidades particulares de cada operación, sin impedir que las validaciones y los errores esperados se resuelvan en la capa correspondiente.

---

### 7.6 Arquitectura de las vistas: Pug y Fetch API

La interfaz combina plantillas renderizadas en el servidor con operaciones realizadas desde el navegador.

Se utiliza Pug para generar las páginas HTML y reutilizar elementos compartidos, como la estructura general, la navegación y los mensajes. Una vez cargadas las páginas, los scripts de JavaScript utilizan la API Fetch para consultar información y realizar operaciones sobre los recursos mediante los endpoints de la aplicación.

Esta combinación permite separar la presentación de las operaciones de la API, reutilizar componentes de interfaz y actualizar información a partir de las respuestas del servidor sin depender exclusivamente de formularios tradicionales o recargas completas de la página.

La integración y validación completa de los flujos desde el navegador queda sujeta a las pruebas pendientes de esta etapa.

---

## 8. Endpoints

La aplicación expone una API REST para gestionar usuarios, salas, eventos, reservas y entradas. Las rutas de la API se encuentran en `routes/` y se vinculan con sus respectivos controllers.

Además, se dispone de rutas para renderizar las interfaces mediante Pug. Las operaciones de la interfaz que requieren consultar o modificar datos consumen la API desde el navegador mediante `fetch`.

### 8.1 Usuarios

Prefijo: `/usuarios`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/usuarios` | Obtener todos los usuarios. |
| `GET` | `/usuarios/:id` | Obtener un usuario por su identificador. |
| `POST` | `/usuarios` | Registrar un usuario. |
| `POST` | `/usuarios/login` | Validar las credenciales de inicio de sesión. |
| `PUT` | `/usuarios/:id` | Actualizar los datos de un usuario. |
| `PATCH` | `/usuarios/:id/estado` | Activar o desactivar un usuario. |

El inicio de sesión valida las credenciales, pero no establece una sesión persistente ni implementa autorización mediante roles y permisos.

### 8.2 Salas

Prefijo: `/salas`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/salas` | Obtener todas las salas. |
| `GET` | `/salas/:id` | Obtener una sala por su identificador. |
| `POST` | `/salas` | Registrar una sala. |
| `PUT` | `/salas/:id` | Actualizar los datos de una sala. |

### 8.3 Eventos

Prefijo: `/eventos`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/eventos` | Obtener todos los eventos. |
| `GET` | `/eventos/proximos` | Obtener los próximos eventos. |
| `GET` | `/eventos/:id` | Obtener un evento por su identificador. |
| `POST` | `/eventos` | Crear un evento y generar su reserva asociada. |
| `PUT` | `/eventos/:id` | Actualizar los datos de un evento. |

### 8.4 Reservas

Prefijo: `/reservas`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/reservas` | Obtener las reservas registradas. |
| `GET` | `/reservas/:eventoId` | Obtener la reserva asociada a un evento. |

Las reservas se generan al crear un evento y se almacenan como subdocumentos dentro de este. El módulo permite consultarlas, pero no dispone de endpoints para crearlas, modificarlas o eliminarlas de manera independiente.

### 8.5 Entradas

Prefijo: `/entradas`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/entradas` | Obtener las entradas con información detallada. |
| `GET` | `/entradas/:id` | Obtener una entrada por su identificador. |
| `GET` | `/entradas/vendidas/:eventoId` | Obtener las entradas vendidas de un evento. |
| `GET` | `/entradas/disponibles/:eventoId` | Consultar la disponibilidad de entradas de un evento. |
| `POST` | `/entradas` | Vender una entrada. |
| `PATCH` | `/entradas/:id/cancelar` | Cancelar una entrada. |

La disponibilidad se calcula a partir de la capacidad de la sala y de las entradas vendidas para el evento. Las entradas canceladas se conservan en la base de datos, pero dejan de contabilizarse como vendidas.

### 8.6 Rutas de las vistas

Prefijo: `/vistas`

Estas rutas renderizan las páginas de la interfaz mediante Pug.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/vistas/inicio` | Mostrar la página de inicio. |
| `GET` | `/vistas/login` | Mostrar la página de inicio de sesión. |
| `GET` | `/vistas/usuarios` | Mostrar la interfaz de usuarios. |
| `GET` | `/vistas/salas` | Mostrar la interfaz de salas. |
| `GET` | `/vistas/eventos` | Mostrar la interfaz de eventos. |
| `GET` | `/vistas/entradas` | Mostrar la interfaz de entradas. |
| `GET` | `/vistas/entradas/:eventoId` | Mostrar las entradas asociadas a un evento. |
| `GET` | `/vistas/reservas` | Mostrar la interfaz de consulta de reservas. |

### 8.7 Ruta raíz

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/` | Redirigir a `/vistas/inicio`. |

### 8.8 Manejo de rutas inexistentes

Las solicitudes a rutas que no están definidas se procesan mediante el middleware `notFound`, que devuelve una respuesta con estado HTTP `404`. Los errores se derivan al middleware centralizado `errorHandler` para su tratamiento.

---

## 9. Reglas de negocio

Las principales reglas de negocio implementadas en la API se organizan según los módulos del sistema.

### Usuarios

- El nombre, apellido, correo electrónico y contraseña son obligatorios al registrar un usuario.
- El correo electrónico debe ser único y se normaliza para evitar diferencias por mayúsculas o espacios.
- Los usuarios pueden estar activos o inactivos.
- El inicio de sesión requiere correo electrónico y contraseña. Si las credenciales no coinciden, devuelve un error de autenticación; si son correctas pero el usuario está inactivo, rechaza el inicio de sesión.
- Para crear eventos o vender entradas, el usuario indicado debe existir y encontrarse activo.
- La contraseña no se incluye en las respuestas de la API.
- Los usuarios se desactivan en lugar de eliminarse físicamente, para conservar sus registros y las referencias asociadas.

### Salas

- La capacidad debe ser un número mayor que cero.
- El precio de reserva debe ser un número mayor o igual a cero.
- Los datos del responsable deben incluir nombre, apellido, teléfono y correo electrónico.
- El estado de la sala debe corresponder a uno de los estados admitidos por el sistema.
- No se puede desactivar una sala si tiene eventos activos cuya fecha de inicio sea igual o posterior al momento de la operación.

### Eventos

- Para crear un evento, la sala asociada debe existir y encontrarse activa.
- El usuario que realiza la reserva asociada debe existir y encontrarse activo.
- La fecha de finalización del evento no puede ser anterior a la fecha de inicio.
- La fecha de finalización del período de venta no puede ser anterior a su fecha de inicio.
- La venta de entradas debe finalizar como máximo en la fecha de inicio del evento.
- Las fechas deben tener un formato válido.
- El precio de entrada debe ser un número mayor que cero.
- El estado del evento debe pertenecer a los valores admitidos por el sistema.
- No se permite crear un evento con el mismo nombre, sala y fecha de inicio que otro evento existente.
- No se permiten eventos cuyos períodos se superpongan en una misma sala. Esta validación también se aplica al modificar un evento, excluyendo al propio evento de la comparación.
- Para actualizar un evento, su sala actual no debe estar inactiva. Si se cambia la sala asociada, la nueva sala debe existir y estar activa.
- Al crear un evento, el sistema genera automáticamente una reserva con el usuario validado, la fecha de creación y el precio de reserva vigente de la sala. Los datos de la reserva enviados en el cuerpo de la solicitud no se utilizan.

### Reservas

- Las reservas se generan al crear un evento y se almacenan como subdocumentos dentro de este.
- Cada reserva conserva el usuario asociado, la fecha de reserva y el precio final.
- La reserva no se modifica desde el endpoint de actualización del evento.
- La cancelación de un evento no elimina el registro de la reserva asociada.

### Entradas

Para registrar una venta, deben cumplirse las siguientes condiciones:

1. El evento debe existir y permitir nuevas ventas, lo que requiere que se encuentre activo y dentro de su período de venta.
2. El usuario destinatario debe existir y encontrarse activo.
3. La sala asociada al evento debe existir para determinar su capacidad.
4. Debe haber disponibilidad de localidades.

La disponibilidad se calcula a partir de la capacidad de la sala y de las entradas vendidas para el evento.

- Las entradas nuevas se registran con estado `vendida`.
- Al cancelar una entrada, el registro se conserva y su estado cambia a `cancelada`.
- Las entradas canceladas dejan de contabilizarse como vendidas y liberan disponibilidad.
- No se puede cancelar una entrada inexistente ni una que ya esté cancelada.
- La consulta de entradas vendidas y de disponibilidad requiere que el evento exista. Para calcular la disponibilidad, también debe existir la sala asociada.

### Conservación de registros

- Los usuarios se desactivan en lugar de eliminarse físicamente.
- Las entradas canceladas se conservan en la base de datos.
- Los eventos cancelados conservan su registro y la reserva asociada.

Estas decisiones permiten preservar información histórica y mantener las relaciones entre los documentos del sistema.

---

## 10. Manejo de errores

La API utiliza códigos de estado HTTP para indicar el resultado de las operaciones y distinguir entre respuestas exitosas y errores.

| Código | Uso |
|---|---|
| **200 OK** | Operación realizada correctamente. |
| **201 Created** | Recurso creado correctamente. |
| **400 Bad Request** | Datos inválidos o condiciones de negocio que impiden realizar la operación. |
| **401 Unauthorized** | Credenciales incorrectas durante el inicio de sesión. |
| **403 Forbidden** | Inicio de sesión rechazado porque el usuario está inactivo. |
| **404 Not Found** | Recurso o ruta solicitada no encontrada. |
| **500 Internal Server Error** | Error interno inesperado durante el procesamiento. |

Los errores esperados, como las validaciones y las condiciones que impiden realizar una operación, se responden desde la capa correspondiente. Para los errores asíncronos no resueltos por los controladores, `asyncHandler` permite derivarlos al middleware centralizado `errorHandler`, que determina el código HTTP de respuesta.

Las rutas inexistentes son gestionadas por el middleware `notFound`. Las respuestas incluyen mensajes descriptivos para facilitar la identificación del problema.

---

## 11. Organización del trabajo

Durante esta segunda entrega, el equipo organizó el desarrollo mediante GitHub Issues, definiendo objetivos y tareas específicas para facilitar el seguimiento del trabajo. La asignación fue flexible, permitiendo que los integrantes asumieran tareas según su disponibilidad y procurando favorecer el trabajo en paralelo.

Los principales objetivos se organizaron en los siguientes issues:

- [F1 — Migrar el proyecto de CommonJS a ESM y validar la aplicación](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/20#issue-5785821402)
- [F2 — Implementar middlewares para el manejo centralizado de errores](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/27#issue-5786205796)
- [F3 — Migrar la persistencia JSON a MongoDB con Mongoose](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/33#issue-5793029124)
- [F4 — Implementar login básico en el backend](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/44#issue-5796487590)
- [F5 — Implementar las vistas Pug con fetch](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/52#issue-5838459915)

Cada issue agrupa las tareas específicas asociadas a su objetivo. Los cambios se desarrollaron en ramas de trabajo y se integraron mediante pull requests, sujetos a revisión antes de incorporarse a la rama principal.

### Colaboradores

- [@federicosd06-dev](https://github.com/federicosd06-dev)
- [@kndxt](https://github.com/kndxt)
- [@mvjhart](https://github.com/mvjhart)
- [@Marcos028](https://github.com/Marcos028)


