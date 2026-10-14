# Carga de datos de prueba

El archivo `db-testing.js` permite poblar la base de datos de Urbana Cult con datos de prueba directamente desde MongoDB, sin depender de los modelos ni schemas de Mongoose.

## Requisitos

- Tener MongoDB accesible.
- Tener instalado `mongosh`.
- Contar con el archivo `db-testing.js`.

## Ejecución

Desde una terminal, ejecutar el siguiente comando, reemplazando la URI por la correspondiente a la base de datos:

```bash
mongosh "URI_DE_CONEXION/NOMBRE_DE_LA_DB" --file db-testing.js
```

Por ejemplo, si se utiliza una instancia local:

```bash
mongosh "mongodb://localhost:27017/urbana_cult" --file db-testing.js
```

El comando se ejecuta desde la terminal del sistema, no desde la consola interactiva de `mongosh`. Si el archivo está en otra ubicación, indicar su ruta.

## Datos generados

El script crea:

- 20 usuarios.
- 20 salas, incluidas 5 inactivas.
- 20 eventos con distintos estados y fechas.
- Entradas vendidas y canceladas para probar la disponibilidad de cupos.

## Importante

**Cada ejecución elimina los documentos existentes** en las colecciones `usuarios`, `salas`, `eventos` y `entradas` antes de cargar los nuevos datos.

No se eliminan documentos de otras colecciones. Sin embargo, se recomienda ejecutar el script únicamente en una base de datos de desarrollo o pruebas, ya que los datos eliminados de esas cuatro colecciones no se conservan.

El script utiliza inserciones directas en MongoDB, por lo que no ejecuta las validaciones de los schemas de Mongoose. Los nombres de las colecciones, campos y estados deben mantenerse compatibles con los que utiliza la aplicación.