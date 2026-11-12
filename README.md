# Urbana Cult — Backend

Backend de **Urbana Cult**, una plataforma de gestión para una red de espacios culturales independientes. El sistema centraliza la administración de usuarios, espacios, eventos, reservas y venta de entradas, facilitando la coordinación de las operaciones de la red.

Proyecto desarrollado en el marco de la Tecnicatura Superior en Desarrollo de Software del **IFTS Nº 29**, por el equipo 11 — Async Solutions.

## Proyecto

- **Aplicación desplegada:** [Urbana Cult — Render](https://dswb-2a-async-solutions-2c26.onrender.com/)
- **Repositorio:** [GitHub — Async Solutions](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26)

## Funcionalidades principales

- **Usuarios y autenticación:** registro, inicio y cierre de sesión, autenticación mediante JWT y control de acceso según roles y permisos.
- **Espacios:** gestión de salas y consulta de disponibilidad.
- **Eventos:** creación, consulta, modificación y administración de eventos.
- **Reservas:** gestión de reservas de salas y control de superposición.
- **Entradas:** consulta y compra de entradas, con control de disponibilidad según la capacidad del espacio.
- **Interfaz web:** vistas renderizadas con Pug e integración con la API.
- **Actualizaciones en tiempo real:** comunicación mediante Socket.IO e integración de Gemini en el chat.

## Tecnologías y herramientas

### Entorno y backend

- **Node.js:** entorno de ejecución (versión 20 o superior).
- **Express 4:** framework para la construcción del servidor y la API REST.
- **JavaScript ES Modules:** sistema de módulos utilizado en el proyecto.

### Base de datos y persistencia

- **MongoDB:** base de datos NoSQL.
- **Mongoose 9:** modelado de datos, esquemas y persistencia.

### Interfaz y comunicación

- **Pug:** motor de plantillas para renderizar las vistas del servidor.
- **Socket.IO:** comunicación bidireccional en tiempo real.
- **Socket.IO Client:** cliente para la comunicación con el servidor mediante sockets.

### Autenticación y configuración

- **JSON Web Token (JWT):** generación y validación de tokens de autenticación.
- **bcryptjs:** hashing de contraseñas.
- **cookie-parser:** lectura y procesamiento de cookies HTTP.
- **dotenv:** carga de variables de entorno desde archivos `.env`.

### Integración de inteligencia artificial

- **Google Gen AI SDK (`@google/genai`):** integración con los servicios de inteligencia artificial de Google Gemini.

### Desarrollo y calidad

- **Node.js Test Runner:** ejecución de pruebas automatizadas mediante `node --test`.
- **Prettier:** formateo y verificación de estilo del código.

### Infraestructura y despliegue

- **Render:** plataforma utilizada para desplegar la aplicación.
- **MongoDB Atlas:** servicio de base de datos en la nube utilizado para el entorno desplegado.

## Instalación y ejecución local

### Requisitos

- Node.js 20 o superior.
- npm.
- MongoDB en ejecución o una instancia de MongoDB Atlas.
- Git.

### Instalación

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26.git
   cd DSWB_2A_Async-Solutions_2C26
   ```

2. Instalar las dependencias:

   ```bash
   npm install
   ```

3. Configurar las variables de entorno:

   Crear un archivo `.env` en la raíz del proyecto y completar las variables necesarias para la conexión a la base de datos y el funcionamiento de la aplicación.

   No incluir credenciales ni claves privadas en el repositorio.

4. Iniciar el servidor:

   ```bash
   npm start
   ```

   Para desarrollo, utilizar:

   ```bash
   npm run dev
   ```

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor. |
| `npm run dev` | Inicia el servidor en modo desarrollo con reinicio automático. |
| `npm test` | Ejecuta las pruebas automatizadas. |
| `npm run seed:verificar` | Verifica los datos de seed. |
| `npm run seed:local` | Ejecuta el seed en una base de datos local. |
| `npm run seed` | Ejecuta el seed en MongoDB Atlas. |
| `npm run format` | Formatea los archivos del proyecto con Prettier. |
| `npm run format:check` | Verifica el formato sin modificar los archivos. |
| `npm run probar:gemini` | Ejecuta el script de prueba de integración con Gemini. |

## Documentación

La documentación técnica se encuentra organizada por tema:

| Documento | Contenido |
|---|---|
| [API.md](./API.md) | Endpoints, parámetros, permisos y comportamiento de la API. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Organización interna, capas, responsabilidades y decisiones de arquitectura. |
| [ERRORS.md](./ERRORS.md) | Clases de error, códigos y manejo de excepciones. |
| [tests/README.md](./tests/README.md) | Configuración, ejecución y organización de las pruebas. |
| [Guía de carga de datos de prueba](./scripts/GuiaCarga.md) | Bases de datos, comandos de seed, medidas de seguridad, datos generados y escenarios para verificar las reglas de negocio. |
## Equipo y responsabilidades

**Async Solutions — Grupo 11**

| Integrante | Área de responsabilidad | Issues de trabajo |
|---|---|---|
| **[Federico](https://github.com/federicosd06-dev)** | Refactorización del frontend, organización de vistas y funcionalidades diferenciadas según el rol del usuario. | [#88 — Refactorización del frontend y funcionalidades según el rol](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/88) |
| **[Candelaria](https://github.com/kndxt)** | Infraestructura, configuración de base de datos, datos de prueba y despliegue en Render. También comunicación en tiempo real e integración de Gemini. | [#85 — Infraestructura, seed y despliegue](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/85) · [#89 — Chat en tiempo real e integración de IA](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/89) |
| **[Victoria](https://github.com/mvjhart)** | Refactorización del backend, separación de responsabilidades entre capas y centralización del manejo de errores. | [#87 — Refactorización del backend y manejo de errores](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/87) |
| **[Marcos](https://github.com/Marcos028)** | Autenticación, gestión de usuarios y control de acceso mediante roles y permisos. | [#86 — Autenticación, usuarios y control de acceso](https://github.com/kndxt/DSWB_2A_Async-Solutions_2C26/issues/86) |

Los issues enlazados documentan los objetivos, el alcance y el seguimiento de las tareas correspondientes a cada área de trabajo.

## Limitaciones y mejoras pendientes

- **Ventas concurrentes:** el sistema verifica la disponibilidad de entradas según la capacidad del espacio y las ventas registradas, pero todavía no garantiza la consistencia ante solicitudes simultáneas. Es necesario incorporar mecanismos adicionales para evitar sobreventas en escenarios de concurrencia.