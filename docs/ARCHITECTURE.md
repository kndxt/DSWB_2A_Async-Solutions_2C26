# Arquitectura del Backend

## 1. Propósito

Este documento describe la organización del backend, las responsabilidades de sus principales componentes y los criterios de diseño utilizados para mantener una separación clara entre las distintas partes de la aplicación.

Su objetivo es servir como referencia para desarrollar, modificar y refactorizar funcionalidades, procurando mantener una estructura consistente y evitar la duplicación de responsabilidades.

La arquitectura busca separar el manejo de las solicitudes HTTP, las reglas de negocio y las operaciones de persistencia, sin agregar capas o abstracciones que no aporten una responsabilidad concreta.

## 2. Organización general

El backend utiliza **Node.js, Express y MongoDB con Mongoose**.

La aplicación se organiza en módulos y capas con responsabilidades diferenciadas:

- **Routes:** definen los endpoints y los middlewares que intervienen en cada operación.
- **Controllers:** gestionan la interacción HTTP y construyen las respuestas.
- **Services:** implementan los casos de uso, aplican reglas de negocio y coordinan operaciones.
- **Models:** definen los esquemas de persistencia y encapsulan las operaciones sobre MongoDB.
- **Middlewares:** implementan validaciones y otros comportamientos transversales.
- **Definitions:** centralizan las definiciones declarativas de atributos y operaciones.
- **Errors:** centralizan los errores de aplicación y la traducción de errores técnicos.

No todas las operaciones necesitan atravesar todas las capas. La estructura debe responder a las responsabilidades reales de cada operación, evitando crear componentes intermedios sin una necesidad concreta.

## 3. Responsabilidades de las capas

### 3.1. Routes

Los archivos de `routes/` definen los endpoints de la aplicación y conectan los middlewares con los controllers correspondientes.

Sus responsabilidades son:

- Definir métodos HTTP y rutas.
- Asociar las validaciones correspondientes a cada operación.
- Envolver los controllers asíncronos mediante `asyncHandler`.

Las rutas no deben contener reglas de negocio ni operaciones de persistencia.

### 3.2. Controllers

Los controllers gestionan la comunicación entre HTTP y los servicios.

Sus responsabilidades son:

- Recibir los parámetros y datos de la solicitud.
- Invocar la operación correspondiente del servicio.
- Construir la respuesta HTTP con el estado y los datos adecuados.

Los controllers no deben implementar reglas de negocio ni consultar directamente los modelos cuando la operación corresponde a un servicio.

La lógica de aplicación debe permanecer fuera de esta capa para evitar que las responsabilidades HTTP y de negocio queden acopladas.

### 3.3. Services

Los servicios implementan los casos de uso de la aplicación.

Sus responsabilidades incluyen:

- Aplicar reglas de negocio.
- Comprobar condiciones que dependen del estado del sistema o de otros recursos.
- Coordinar operaciones entre distintos modelos o servicios.
- Interpretar los resultados de las operaciones de persistencia.
- Generar los errores de aplicación correspondientes cuando una operación no puede realizarse.

Los servicios no deben depender de Express ni construir respuestas HTTP.

No es necesario crear un servicio para cada modelo o entidad. Se justifica cuando existe una responsabilidad de aplicación que necesita ser encapsulada, especialmente cuando una operación involucra varias consultas, validaciones de negocio o coordinación entre componentes.

Cuando una operación puede resolverse directamente mediante una operación de persistencia y no requiere lógica adicional, no es necesario agregar una capa de servicio solamente por uniformidad.

### 3.4. Models

Los modelos encapsulan la estructura y las operaciones de persistencia de MongoDB mediante Mongoose.

Sus responsabilidades son:

- Definir los esquemas y subesquemas.
- Establecer referencias entre documentos.
- Configurar validaciones propias de persistencia.
- Definir índices y restricciones de almacenamiento.
- Encapsular consultas, creaciones y actualizaciones mediante métodos del modelo.

Las operaciones reutilizables de persistencia pueden exponerse mediante `statics` del esquema.

Los modelos no deben implementar respuestas HTTP ni decidir qué error de negocio corresponde a cada caso de uso. Devuelven los resultados de persistencia para que los servicios los interpreten cuando corresponda.

Las validaciones del esquema Mongoose complementan las validaciones de entrada y las reglas de negocio: protegen la integridad de los documentos independientemente del origen de los datos.

## 4. Definiciones compartidas

El directorio `definitions/` contiene definiciones declarativas reutilizadas por distintas partes del backend.

Estas definiciones permiten centralizar información como:

- Atributos de las entidades.
- Tipos de datos y referencias.
- Campos obligatorios y valores predeterminados.
- Restricciones de atributos.
- Valores permitidos para determinados campos.
- Parámetros esperados por las operaciones.
- Campos requeridos y opcionales de cada solicitud.
- Relaciones entre atributos.

Las definiciones no ejecutan operaciones ni contienen reglas de negocio. Describen estructuras y contratos que pueden ser utilizados por los middlewares y los modelos, evitando mantener configuraciones duplicadas.

Por ejemplo, `eventoDefinicion` reutiliza la definición de `usuarioId` de `reservaDefinicion`, en lugar de volver a declarar su estructura.

## 5. Validaciones

Las validaciones se distribuyen según su responsabilidad.

### 5.1. Validaciones de entrada

`middlewares/validarDatos.js` implementa un middleware configurable a partir de una definición y una operación.

Comprueba aspectos como:

- Presencia de campos obligatorios.
- Tipos de datos.
- Restricciones declaradas para los atributos.
- Relaciones entre atributos cuando los datos necesarios están presentes.

Las rutas utilizan este middleware indicando la operación correspondiente de `definitions/`.

En las actualizaciones parciales mediante PATCH, las relaciones se comprueban cuando están presentes los valores necesarios para realizar la comparación. Esto permite validar los cambios sin exigir que el cliente envíe nuevamente todos los atributos.

`middlewares/validarIds.js` también proporciona validaciones de identificadores para los casos en los que se utiliza.

### 5.2. Reglas de negocio

Las condiciones que dependen del estado del sistema, de la existencia de otros recursos o de las reglas propias de una operación corresponden a los servicios.

Por ejemplo:

- Comprobar que una sala esté activa antes de asignarle un evento.
- Verificar que un usuario pueda realizar una operación.
- Evitar la superposición de eventos en una misma sala.
- Impedir la inactivación de una sala con eventos próximos activos.
- Comprobar la disponibilidad antes de vender una entrada.

Estas comprobaciones no corresponden al middleware de validación de solicitudes porque requieren consultar información y aplicar reglas propias del caso de uso.

### 5.3. Validaciones de persistencia

Los modelos Mongoose definen restricciones adicionales mediante las opciones del esquema, como `required`, `enum`, `min` y validadores personalizados.

Estas validaciones protegen la integridad de los documentos almacenados.

## 6. Manejo de errores

El manejo de errores se centraliza mediante las clases definidas en `errors/errores.js` y los middlewares correspondientes.

La aplicación utiliza errores de aplicación para representar situaciones como datos inválidos, falta de autenticación, permisos insuficientes, recursos inexistentes y conflictos con el estado del sistema.

Los errores técnicos conocidos pueden traducirse a errores de aplicación mediante `errors/traducirError.js`.

`middlewares/asyncHandler.js` permite propagar los errores producidos por handlers asíncronos, mientras que `middlewares/errorHandler.js` centraliza su tratamiento y la construcción de las respuestas HTTP.

Los criterios de selección, reutilización y propagación de errores se encuentran documentados en [Manejo de errores](ERRORES.md).

## 7. Comunicación entre servicios y modelos

Los servicios pueden utilizar operaciones de otros servicios cuando necesitan reutilizar un caso de uso o una consulta que incluye condiciones de aplicación.

También pueden acceder directamente a un modelo cuando necesitan una operación puntual de persistencia que no requiere pasar por otro servicio.

El criterio es evitar dependencias innecesarias y mantener claras las responsabilidades de cada componente.

No se debe introducir una dependencia entre servicios solamente para mantener una uniformidad formal. También conviene evitar dependencias circulares, ya que dificultan la comprensión, las pruebas y la inicialización de los módulos.

## 8. Persistencia y relaciones

La persistencia se realiza mediante MongoDB y Mongoose.

Los modelos pueden representar relaciones mediante referencias entre documentos o mediante subdocumentos embebidos, según la naturaleza de la información.

Por ejemplo, `Evento` contiene una referencia a `Sala` y un subdocumento `reserva` que registra los datos históricos de la reserva inicial.

Las actualizaciones de documentos existentes pueden realizarse recuperando el documento, aplicando los cambios y guardándolo mediante Mongoose. Esto permite aprovechar las validaciones del esquema.

Para las actualizaciones parciales de estructuras anidadas, deben evitarse reemplazos accidentales de subdocumentos completos cuando solo se necesita modificar alguno de sus atributos.

## 9. Inicialización e infraestructura

La inicialización de la aplicación se encuentra separada de la configuración de Express.

- `app.js` configura Express, registra los middlewares y monta las rutas.
- `server.js` carga las variables de entorno, crea el servidor HTTP, inicializa Socket.IO, establece la conexión con MongoDB y comienza a escuchar solicitudes.
- `config/db.js` centraliza la conexión con la base de datos y el seguimiento de su estado.
- `sockets/` contiene la inicialización y el acceso a la instancia de Socket.IO.

Express y Socket.IO comparten el servidor HTTP, pero mantienen sus propios mecanismos de comunicación.

## 10. Criterios generales de desarrollo

Al incorporar o modificar funcionalidades, se deben considerar los siguientes criterios:

1. Mantener cada responsabilidad en la capa correspondiente.
2. Evitar consultas directas a modelos desde controllers cuando corresponda utilizar un servicio.
3. No trasladar reglas de negocio a los middlewares de validación.
4. Reutilizar las definiciones compartidas en lugar de duplicar estructuras.
5. Centralizar el manejo de errores y evitar respuestas de error particulares en cada controller.
6. Encapsular las operaciones de persistencia en los modelos cuando sean reutilizables o formen parte de su responsabilidad.
7. Crear servicios y abstracciones cuando exista una responsabilidad concreta que lo justifique, no solamente para mantener una estructura uniforme.
8. Preservar el comportamiento existente de la aplicación al refactorizar, salvo que el cambio funcional forme parte del alcance acordado.

La organización debe facilitar que los módulos puedan evolucionar sin mezclar responsabilidades ni generar dependencias innecesarias.
