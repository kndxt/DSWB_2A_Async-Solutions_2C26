// ============================================================
// SEED DE DATOS DE PRUEBA - URBANA CULT
// ============================================================
// Ejecutar con: npm run seed
//
// IMPORTANTE:
// - Borra los documentos existentes en las cuatro colecciones.
// - Vuelve a generar usuarios, salas, eventos y entradas.
// - No elimina otras colecciones de la base de datos.
// - Utiliza los modelos de Mongoose para validar las inserciones.
// ============================================================

// ------------------------------------------------------------
// 1. IMPORTACIONES Y CONEXIÓN
// ------------------------------------------------------------

import "dotenv/config";
import mongoose from "mongoose";

import Usuario from "../models/usuarioModel.js";
import Sala from "../models/salaModel.js";
import Evento from "../models/eventoModel.js";
import Entrada from "../models/entradaModel.js";

// ------------------------------------------------------------
// 2. CONFIGURACIÓN DE LOS DATOS DE PRUEBA
// ------------------------------------------------------------

const CANTIDAD_USUARIOS = 20;
const CANTIDAD_SALAS = 20;
const CANTIDAD_EVENTOS = 20;

const SALAS_INACTIVAS = 5;

// El primer evento tendrá únicamente 3 lugares disponibles.
// La sala asociada a ese evento tendrá capacidad para 30 personas.
const CAPACIDAD_EVENTO_ESPECIAL = 30;

// Estados de las entradas.
// Deben coincidir con los valores admitidos por el schema.
const ESTADOS_ENTRADA = {
  VENDIDA: "vendida",
  CANCELADA: "cancelada",
};

// ------------------------------------------------------------
// 3. DATOS BASE PARA GENERAR LOS USUARIOS
// ------------------------------------------------------------

const nombres = [
  "Lucía",
  "Mateo",
  "Sofía",
  "Tomás",
  "Valentina",
  "Joaquín",
  "Camila",
  "Benjamín",
  "Martina",
  "Nicolás",
  "Julieta",
  "Santiago",
  "Agustina",
  "Facundo",
  "Florencia",
  "Lautaro",
  "Emilia",
  "Franco",
  "Catalina",
  "Bruno",
];

const apellidos = [
  "Gómez",
  "Pérez",
  "Rodríguez",
  "Fernández",
  "López",
  "Martínez",
  "Díaz",
  "Sánchez",
  "Romero",
  "Torres",
  "Álvarez",
  "Ruiz",
  "Acosta",
  "Medina",
  "Herrera",
  "Castro",
  "Suárez",
  "Rojas",
  "Silva",
  "Molina",
];

// ------------------------------------------------------------
// 4. RESPONSABLES DE LAS SALAS
// ------------------------------------------------------------
// Hay 7 responsables para 20 salas.
// Se asignan en grupos de hasta 3 salas por persona.
// ------------------------------------------------------------

const responsables = [
  {
    nombre: "Andrea",
    apellido: "Morales",
    telefono: "1100000001",
    mail: "andrea.morales@example.com",
  },
  {
    nombre: "Pablo",
    apellido: "Benítez",
    telefono: "1100000002",
    mail: "pablo.benitez@example.com",
  },
  {
    nombre: "Carolina",
    apellido: "Vega",
    telefono: "1100000003",
    mail: "carolina.vega@example.com",
  },
  {
    nombre: "Diego",
    apellido: "Navarro",
    telefono: "1100000004",
    mail: "diego.navarro@example.com",
  },
  {
    nombre: "Mariana",
    apellido: "Ortiz",
    telefono: "1100000005",
    mail: "mariana.ortiz@example.com",
  },
  {
    nombre: "Gabriel",
    apellido: "Suárez",
    telefono: "1100000006",
    mail: "gabriel.suarez@example.com",
  },
  {
    nombre: "Paula",
    apellido: "Ibarra",
    telefono: "1100000007",
    mail: "paula.ibarra@example.com",
  },
];

// ------------------------------------------------------------
// 5. FUNCIONES AUXILIARES PARA LAS FECHAS
// ------------------------------------------------------------

// Devuelve una fecha sumando una cantidad de días.
const sumarDias = (fecha, dias) => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
};

// Devuelve una fecha sumando una cantidad de horas.
const sumarHoras = (fecha, horas) => {
  const resultado = new Date(fecha);
  resultado.setHours(resultado.getHours() + horas);
  return resultado;
};

// ------------------------------------------------------------
// 6. GENERACIÓN DE USUARIOS
// ------------------------------------------------------------

const generarUsuarios = () => {
  return Array.from({ length: CANTIDAD_USUARIOS }, (_, i) => ({
    nombre: nombres[i],
    apellido: apellidos[i],
    email: `usuario${i + 1}@example.com`,
    telefono: `119000${String(i + 1).padStart(4, "0")}`,

    // Todos activos salvo los que necesites cambiar para probar.
    estado: i < 18 ? "activo" : "inactivo",

    // Credenciales ficticias, exclusivamente para pruebas.
    // AJUSTAR si el schema utiliza "password" en lugar de "clave".
    clave: `Prueba${String(i + 1).padStart(3, "0")}!`,
  }));
};

// ------------------------------------------------------------
// 7. GENERACIÓN DE SALAS
// ------------------------------------------------------------

const generarSalas = () => {
  return Array.from({ length: CANTIDAD_SALAS }, (_, i) => ({
    nombre: `Sala de prueba ${i + 1}`,

    // La primera sala tiene capacidad 30 para el evento especial.
    capacidad:
      i === 0
        ? CAPACIDAD_EVENTO_ESPECIAL
        : 40 + i * 5,

    direccion: `Calle de prueba ${100 + i}, CABA`,

    precio_reserva: 10000 + i * 1500,

    // Las últimas cinco salas estarán inactivas.
    estado:
      i >= CANTIDAD_SALAS - SALAS_INACTIVAS
        ? "inactivo"
        : "activo",

    // Tres salas como máximo por responsable.
    responsable: {
      ...responsables[Math.floor(i / 3)],
    },
  }));
};

// ------------------------------------------------------------
// 8. GENERACIÓN DE EVENTOS
// ------------------------------------------------------------

// Distribución:
//  0-4  : finalizados (5)
//  5-6  : venta finalizada, evento futuro (2)
//  7-9  : cancelados (3)
//  10   : activo con exactamente 3 cupos disponibles (1)
// 11-19 : normales (9)
//
// Los eventos duran 3 horas.
// Las fechas se calculan respecto del momento de ejecución del seed.

const generarEventos = (usuarios, salas) => {
  const ahora = new Date();

  // Usamos las 20:00 como horario base para los eventos.
  const base = new Date(ahora);
  base.setHours(20, 0, 0, 0);

  return Array.from({ length: CANTIDAD_EVENTOS }, (_, i) => {
    let fechaInicio;
    let ventaInicio;
    let ventaFin;
    let estado = "activo";

    // --------------------------------------------------------
    // GRUPO 1: EVENTOS FINALIZADOS (índices 0 a 4)
    // --------------------------------------------------------

    if (i <= 4) {
      fechaInicio = sumarDias(base, -(20 + i * 3));

      ventaInicio = sumarDias(fechaInicio, -15);
      ventaFin = sumarDias(fechaInicio, -1);

      estado = "finalizado";
    }

    // --------------------------------------------------------
    // GRUPO 2: VENTA VENCIDA, EVENTO FUTURO (índices 5 y 6)
    // --------------------------------------------------------

    else if (i <= 6) {
      fechaInicio = sumarDias(base, 7 + (i - 5) * 3);

      // La venta terminó ayer, pero el evento aún no comenzó.
      ventaInicio = sumarDias(ahora, -15);
      ventaFin = sumarDias(ahora, -1);
    }

    // --------------------------------------------------------
    // GRUPO 3: EVENTOS CANCELADOS (índices 7 a 9)
    // --------------------------------------------------------

    else if (i <= 9) {
      fechaInicio = sumarDias(base, 15 + (i - 7) * 3);

      ventaInicio = sumarDias(ahora, -3);
      ventaFin = sumarDias(fechaInicio, -1);

      estado = "cancelado";
    }

    // --------------------------------------------------------
    // GRUPO 4: EVENTO CON POCOS CUPOS (índice 10)
    // --------------------------------------------------------

    else if (i === 10) {
      fechaInicio = sumarDias(base, 25);

      ventaInicio = sumarDias(ahora, -3);
      ventaFin = sumarDias(fechaInicio, -1);

      estado = "activo";
    }

    // --------------------------------------------------------
    // GRUPO 5: EVENTOS NORMALES (índices 11 a 19)
    // --------------------------------------------------------

    else {
      fechaInicio = sumarDias(base, 30 + (i - 11) * 3);

      ventaInicio = sumarDias(ahora, -3);
      ventaFin = sumarDias(fechaInicio, -1);

      estado = "activo";
    }

    const fechaFin = sumarHoras(fechaInicio, 3);

    // El evento especial usa la primera sala, cuya capacidad
    // es 30 según la función generarSalas del seed anterior.
    // Los demás utilizan salas activas (índices 1 a 14).
    const sala =
      i === 10
        ? salas[0]
        : salas[(i % 14) + 1];

    return {
      sala_id: sala._id,

      nombre: `Evento de prueba ${i + 1}`,
      descripcion: `Descripción ficticia del evento ${i + 1}.`,

      tipo: ["musica", "teatro", "danza", "cine", "taller"][i % 5],

      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,

      venta_inicio: ventaInicio,
      venta_fin: ventaFin,

      precio_entrada: 5000 + i * 500,

      estado,

      reserva: {
        usuarioId: usuarios[i]._id,
        fecha_reserva: sumarDias(fechaInicio, -10),
        precio_final: sala.precio_reserva,
      },
    };
  });
};

// ------------------------------------------------------------
// 9. GENERACIÓN DE ENTRADAS
// ------------------------------------------------------------

const generarEntradas = (usuarios, eventos, salas) => {
  const entradas = [];

  eventos.forEach((evento, i) => {
    const sala = salas.find((s) =>
      s._id.equals(evento.sala_id)
    );

    if (!sala) {
      throw new Error(
        `No se encontró la sala del evento ${evento.nombre}`
      );
    }

    // El evento número 11 (índice 10) tendrá capacidad - 3
    // entradas vendidas. Los otros tendrán 5 vendidas.
    const cantidadVendidas =
      i === 10 ? sala.capacidad - 3 : 5;

    // Entradas vendidas.
    for (let j = 0; j < cantidadVendidas; j++) {
      entradas.push({
        eventoId: evento._id,
        usuarioId: usuarios[(i + j) % usuarios.length]._id,
        estado: ESTADOS_ENTRADA.VENDIDA,
        fechaVenta: sumarDias(evento.fecha_inicio, -2),
      });
    }

    // Una entrada cancelada por evento.
    entradas.push({
      eventoId: evento._id,
      usuarioId: usuarios[(i + 10) % usuarios.length]._id,
      estado: ESTADOS_ENTRADA.CANCELADA,
      fechaVenta: sumarDias(evento.fecha_inicio, -3),
    });
  });

  return entradas;
};

// ------------------------------------------------------------
// 10. EJECUCIÓN DEL SEED
// ------------------------------------------------------------

const seed = async () => {
  try {
    // Conectarse a la base de datos.
    if (!process.env.MONGODB_URI) {
      throw new Error("Falta configurar MONGODB_URI en el archivo .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Conexión a MongoDB establecida.");

    // --------------------------------------------------------
    // 10.1. LIMPIAR LOS DATOS ANTERIORES
    // --------------------------------------------------------
    // Se eliminan primero los documentos dependientes.
    // No se eliminan otras colecciones de la base de datos.
    // --------------------------------------------------------

    await Entrada.deleteMany({});
    await Evento.deleteMany({});
    await Sala.deleteMany({});
    await Usuario.deleteMany({});

    console.log("Datos anteriores eliminados.");

    // --------------------------------------------------------
    // 10.2. CREAR USUARIOS
    // --------------------------------------------------------

    const usuarios = await Usuario.insertMany(generarUsuarios());

    console.log(`Usuarios creados: ${usuarios.length}`);

    // --------------------------------------------------------
    // 10.3. CREAR SALAS
    // --------------------------------------------------------

    const salas = await Sala.insertMany(generarSalas());

    console.log(`Salas creadas: ${salas.length}`);

    // --------------------------------------------------------
    // 10.4. CREAR EVENTOS
    // --------------------------------------------------------
    // Se utilizan los _id reales devueltos por MongoDB.
    // --------------------------------------------------------

    const eventosData = generarEventos(usuarios, salas);
    const eventos = await Evento.insertMany(eventosData);

    console.log(`Eventos creados: ${eventos.length}`);

    // --------------------------------------------------------
    // 10.5. CREAR ENTRADAS
    // --------------------------------------------------------

    const entradasData = generarEntradas(usuarios, eventos, salas);
    const entradas = await Entrada.insertMany(entradasData);

    console.log(`Entradas creadas: ${entradas.length}`);

    // --------------------------------------------------------
    // 10.6. RESUMEN FINAL
    // --------------------------------------------------------

    console.log("\nSeed completado correctamente.");
    console.log("--------------------------------");
    console.log(`Usuarios: ${usuarios.length}`);
    console.log(`Salas: ${salas.length}`);
    console.log(`Eventos: ${eventos.length}`);
    console.log(
      `Entradas vendidas: ${
        entradas.filter((e) => e.estado === ESTADOS_ENTRADA.VENDIDA).length
      }`
    );
    console.log(
      `Entradas canceladas: ${
        entradas.filter((e) => e.estado === ESTADOS_ENTRADA.CANCELADA).length
      }`
    );
  } catch (error) {
    console.error("\nError al ejecutar el seed:");
    console.error(error);

    // Indica que el proceso terminó con error.
    process.exitCode = 1;
  } finally {
    // Cerrar la conexión incluso si alguna operación falla.
    await mongoose.disconnect();
    console.log("Conexión a MongoDB cerrada.");
  }
};

// Ejecutar el seed.
await seed();