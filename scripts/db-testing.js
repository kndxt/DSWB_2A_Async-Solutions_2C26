// ============================================================
// DATOS DE PRUEBA - URBANA CULT (MongoDB directo)
// ============================================================
// Ejecutar con:
// mongosh "mongodb://localhost:27017/urbana_cult" --file seed-urbana-cult.js
//
// IMPORTANTE:
// - No utiliza Mongoose ni importa schemas.
// - Borra únicamente usuarios, salas, eventos y entradas.
// - Genera ObjectId y conserva las referencias entre documentos.
// ============================================================

const dbSeed = db;

const CANTIDAD_USUARIOS = 20;
const CANTIDAD_SALAS = 20;
const CANTIDAD_EVENTOS = 20;
const SALAS_INACTIVAS = 5;
const CAPACIDAD_EVENTO_ESPECIAL = 30;

const ESTADOS_ENTRADA = {
  VENDIDA: "vendida",
  CANCELADA: "cancelada",
};

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

const sumarDias = (fecha, dias) => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
};

const sumarHoras = (fecha, horas) => {
  const resultado = new Date(fecha);
  resultado.setHours(resultado.getHours() + horas);
  return resultado;
};

// Calcula una fecha dentro del período de venta.
const fechaDentroDeVenta = (evento, proporcion = 0.5) => {
  const inicio = evento.venta_inicio.getTime();
  const fin = evento.venta_fin.getTime();
  return new Date(inicio + (fin - inicio) * proporcion);
};

// ------------------------------------------------------------
// USUARIOS
// ------------------------------------------------------------

const generarUsuarios = () =>
  Array.from({ length: CANTIDAD_USUARIOS }, (_, i) => ({
    _id: new ObjectId(),
    nombre: nombres[i],
    apellido: apellidos[i],
    email: `usuario${i + 1}@example.com`,
    telefono: `119000${String(i + 1).padStart(4, "0")}`,
    estado: i < 18 ? "activo" : "inactivo",
    password: `Prueba${String(i + 1).padStart(3, "0")}!`,
  }));

// ------------------------------------------------------------
// SALAS
// ------------------------------------------------------------

const generarSalas = () =>
  Array.from({ length: CANTIDAD_SALAS }, (_, i) => ({
    _id: new ObjectId(),
    nombre: `Sala de prueba ${i + 1}`,
    capacidad: i === 0 ? CAPACIDAD_EVENTO_ESPECIAL : 40 + i * 5,
    direccion: `Calle de prueba ${100 + i}, CABA`,
    precio_reserva: 10000 + i * 1500,
    estado: i >= CANTIDAD_SALAS - SALAS_INACTIVAS ? "inactivo" : "activo",
    responsable: { ...responsables[Math.floor(i / 3)] },
  }));

// ------------------------------------------------------------
// EVENTOS
// ------------------------------------------------------------

const generarEventos = (usuarios, salas) => {
  const ahora = new Date();
  const base = new Date(ahora);
  base.setHours(20, 0, 0, 0);

  return Array.from({ length: CANTIDAD_EVENTOS }, (_, i) => {
    let fechaInicio;
    let ventaInicio;
    let ventaFin;
    let estado = "activo";

    // 5 finalizados: evento y ventas en el pasado.
    if (i <= 4) {
      fechaInicio = sumarDias(base, -(20 + i * 3));
      ventaInicio = sumarDias(fechaInicio, -15);
      ventaFin = sumarDias(fechaInicio, -1);
      estado = "finalizado";
    }
    // 2 con ventas vencidas y evento futuro.
    else if (i <= 6) {
      fechaInicio = sumarDias(base, 7 + (i - 5) * 3);
      ventaInicio = sumarDias(ahora, -15);
      ventaFin = sumarDias(ahora, -1);
    }
    // 3 cancelados.
    else if (i <= 9) {
      fechaInicio = sumarDias(base, 15 + (i - 7) * 3);
      ventaInicio = sumarDias(ahora, -3);
      ventaFin = sumarDias(fechaInicio, -1);
      estado = "cancelado";
    }
    // 1 evento especial con 3 cupos libres.
    else if (i === 10) {
      fechaInicio = sumarDias(base, 25);
      ventaInicio = sumarDias(ahora, -3);
      ventaFin = sumarDias(fechaInicio, -1);
    }
    // 9 eventos futuros normales.
    else {
      fechaInicio = sumarDias(base, 30 + (i - 11) * 3);
      ventaInicio = sumarDias(ahora, -3);
      ventaFin = sumarDias(fechaInicio, -1);
    }

    const sala = i === 10 ? salas[0] : salas[(i % 14) + 1];

    return {
      _id: new ObjectId(),
      sala_id: sala._id,
      nombre: `Evento de prueba ${i + 1}`,
      descripcion: `Descripción ficticia del evento ${i + 1}.`,
      tipo: ["musica", "teatro", "danza", "cine", "taller"][i % 5],
      fecha_inicio: fechaInicio,
      fecha_fin: sumarHoras(fechaInicio, 3),
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
// ENTRADAS
// ------------------------------------------------------------

const generarEntradas = (usuarios, eventos, salas) => {
  const entradas = [];

  eventos.forEach((evento, i) => {
    const sala = salas.find((s) => s._id.equals(evento.sala_id));

    if (!sala) {
      throw new Error(`No se encontró la sala del evento ${evento.nombre}`);
    }

    const cantidadVendidas = i === 10 ? sala.capacidad - 3 : 5;

    for (let j = 0; j < cantidadVendidas; j++) {
      entradas.push({
        _id: new ObjectId(),
        eventoId: evento._id,
        usuarioId: usuarios[(i + j) % usuarios.length]._id,
        estado: ESTADOS_ENTRADA.VENDIDA,
        fechaVenta: fechaDentroDeVenta(evento, 0.6),
      });
    }

    entradas.push({
      _id: new ObjectId(),
      eventoId: evento._id,
      usuarioId: usuarios[(i + 10) % usuarios.length]._id,
      estado: ESTADOS_ENTRADA.CANCELADA,
      fechaVenta: fechaDentroDeVenta(evento, 0.8),
    });
  });

  return entradas;
};

// ------------------------------------------------------------
// EJECUCIÓN
// ------------------------------------------------------------

const seed = () => {
  print(`Base de datos seleccionada: ${dbSeed.getName()}`);
  print("Se limpiarán usuarios, salas, eventos y entradas.");

  // Se eliminan primero los documentos dependientes.
  dbSeed.entradas.deleteMany({});
  dbSeed.eventos.deleteMany({});
  dbSeed.salas.deleteMany({});
  dbSeed.usuarios.deleteMany({});

  const usuarios = generarUsuarios();
  const salas = generarSalas();
  const eventos = generarEventos(usuarios, salas);
  const entradas = generarEntradas(usuarios, eventos, salas);

  dbSeed.usuarios.insertMany(usuarios);
  dbSeed.salas.insertMany(salas);
  dbSeed.eventos.insertMany(eventos);
  dbSeed.entradas.insertMany(entradas);

  print("\nSeed completado.");
  print(`Usuarios: ${dbSeed.usuarios.countDocuments({})}`);
  print(`Salas: ${dbSeed.salas.countDocuments({})}`);
  print(`Eventos: ${dbSeed.eventos.countDocuments({})}`);
  print(
    `Entradas vendidas: ${dbSeed.entradas.countDocuments({ estado: ESTADOS_ENTRADA.VENDIDA })}`,
  );
  print(
    `Entradas canceladas: ${dbSeed.entradas.countDocuments({ estado: ESTADOS_ENTRADA.CANCELADA })}`,
  );
  print(`Total de entradas: ${dbSeed.entradas.countDocuments({})}`);
};

try {
  seed();
} catch (error) {
  print("Error al cargar los datos de prueba:");
  print(error);
  throw error;
}
