const { dbPool } = require("../db/config");
const cache = require("../cache/cache");

const calcularCuota = (indice, total) => {
  const cuotaMinima = 1.5;
  const cuotaMaxima = 9.0;

  // Interpolar linealmente entre la cuota mínima y máxima
  const cuota =
    cuotaMinima + (cuotaMaxima - cuotaMinima) * (indice / (total - 1));

  return Number(cuota.toFixed(2));
};

const obtenerDatosClasificacion = async (
  tabla,
  columna,
  idCampo,
  id,
  temporada
) => {
  const [result] = await dbPool.execute(
    `SELECT ${columna} FROM ${tabla} WHERE ${idCampo} = ? AND temporada = ?`,
    [id, temporada]
  );
  return result.length ? result[0] : null;
};

const obtenerDatosOrdenados = async (tabla, columna, temporada) => {
  const [result] = await dbPool.execute(
    `SELECT ${columna} FROM ${tabla} WHERE temporada = ? ORDER BY ${columna} DESC`,
    [temporada]
  );
  return result.map((row) => row[columna]);
};

const insertarApuesta = async ({
  nombre_usuario,
  id_gp,
  tipo_apuesta,
  idApostado,
  monto_apostado,
  cuota,
  apuestaGanada,
}) => {
  await dbPool.execute(
    "INSERT INTO apuestas (id_usuario, id_gp, tipo_apuesta, id_piloto, id_equipo, monto, cuota, fecha_apuesta, resultado) VALUES ((SELECT id_usuario FROM usuarios WHERE nombre_usuario = ?), ?, ?, ?, ?, ?, ?, NOW(), ?)",
    [
      nombre_usuario,
      id_gp,
      tipo_apuesta,
      tipo_apuesta === "Equipo Ganador" ? null : idApostado,
      tipo_apuesta === "Equipo Ganador" ? idApostado : null,
      monto_apostado,
      cuota,
      apuestaGanada,
    ]
  );
};

const tipoApuesta = {
  "Segundo Puesto": "segundo_puesto",
  Ganador: "ganador",
  "Tercer Puesto": "tercer_puesto",
  "Vuelta Rápida": "vuelta_rapida",
  "Pole Position": "pole_position",
  "Equipo Ganador": "equipo_ganador",
};

const createBet = async (req, res) => {
  try {
    const {
      id_piloto,
      id_gp,
      id_equipo,
      temporada,
      monto_apostado,
      nombre_usuario,
      tipo_apuesta,
    } = req.body;

    // Validar datos iniciales
    if (!id_piloto && !id_equipo) {
      return res
        .status(400)
        .json({ message: "Debe proporcionarse el id_piloto o id_equipo" });
    }

    if (!temporada || !monto_apostado || !nombre_usuario || !tipo_apuesta) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // Obtener saldo del usuario
    const [usuarioData] = await dbPool.execute(
      "SELECT saldo FROM usuarios WHERE nombre_usuario = ?",
      [nombre_usuario]
    );

    if (usuarioData.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const saldoUsuario = usuarioData[0].saldo;

    // Verificar saldo suficiente
    if (saldoUsuario < monto_apostado) {
      return res
        .status(400)
        .json({ message: "Saldo insuficiente para realizar la apuesta" });
    }

    // Verificar tipo de apuesta válido
    if (!tipoApuesta[tipo_apuesta]) {
      return res.status(400).json({ message: "Tipo de apuesta no válido" });
    }

    let cuota;
    let idApostado;

    // Determinar cuota según piloto o equipo
    if (
      [
        "Ganador",
        "Segundo Puesto",
        "Tercer Puesto",
        "Vuelta Rápida",
        "Pole Position",
      ].includes(tipo_apuesta)
    ) {
      // Apuesta a piloto
      const pilotoData = await obtenerDatosClasificacion(
        "f1_clasificaciones_pilotos",
        "podios",
        "id_piloto",
        id_piloto,
        temporada
      );

      if (!pilotoData) {
        return res
          .status(404)
          .json({ message: "Piloto o temporada no encontrados" });
      }

      const podiosOrdenados = await obtenerDatosOrdenados(
        "f1_clasificaciones_pilotos",
        "podios",
        temporada
      );

      const indicePiloto = podiosOrdenados.findIndex(
        (podios) => podios === pilotoData.podios
      );

      cuota = calcularCuota(indicePiloto, podiosOrdenados.length);
      idApostado = id_piloto;
    } else {
      // Apuesta a equipo
      const equipoData = await obtenerDatosClasificacion(
        "f1_clasificaciones_equipos",
        "total_puntos",
        "id_equipo",
        id_equipo,
        temporada
      );

      if (!equipoData) {
        return res
          .status(404)
          .json({ message: "Equipo o temporada no encontrados" });
      }

      const puntosOrdenados = await obtenerDatosOrdenados(
        "f1_clasificaciones_equipos",
        "total_puntos",
        temporada
      );

      const indiceEquipo = puntosOrdenados.findIndex(
        (puntos) => puntos === equipoData.total_puntos
      );

      cuota = calcularCuota(indiceEquipo, puntosOrdenados.length);
      idApostado = id_equipo;
    }

    // Reducir el saldo del usuario
    await dbPool.execute(
      "UPDATE usuarios SET saldo = saldo - ? WHERE nombre_usuario = ?",
      [monto_apostado, nombre_usuario]
    );

    // Verificar si el usuario ganó la apuesta en base al resultado
    const columnaResultado = tipoApuesta[tipo_apuesta];
    const [resultadoData] = await dbPool.execute(
      `SELECT ${columnaResultado} FROM f1_resultados_gp WHERE id_gp = ?`,
      [id_gp]
    );

    if (resultadoData.length === 0) {
      return res
        .status(404)
        .json({ message: "Resultado de la carrera no encontrado" });
    }

    const resultado = resultadoData[0][columnaResultado];
    const apuestaGanada =
      ([
        "Ganador",
        "Segundo Puesto",
        "Tercer Puesto",
        "Vuelta Rápida",
        "Pole Position",
      ].includes(tipo_apuesta) &&
        id_piloto === resultado) ||
      (tipo_apuesta === "Equipo Ganador" && id_equipo === resultado);

    // Actualizar saldo si la apuesta fue correcta
    if (apuestaGanada) {
      const montoGanado = monto_apostado * cuota;

      await dbPool.execute(
        "UPDATE usuarios SET saldo = saldo + ? WHERE nombre_usuario = ?",
        [montoGanado, nombre_usuario]
      );

      await insertarApuesta({
        nombre_usuario,
        id_gp,
        tipo_apuesta,
        idApostado,
        monto_apostado,
        cuota,
        apuestaGanada,
      });

      return res.status(200).json({
        message: "¡Felicidades, ganaste la apuesta!",
        saldoGanado: montoGanado,
        nuevoSaldo: (saldoUsuario - monto_apostado + montoGanado).toFixed(2),
      });
    }

    // Si no ganó, devolver el mensaje correspondiente
    await insertarApuesta({
      nombre_usuario,
      id_gp,
      tipo_apuesta,
      idApostado,
      monto_apostado,
      cuota,
      apuestaGanada: false,
    });

    res.status(200).json({
      message: "Lo siento, perdiste la apuesta.",
      monto_perdido: monto_apostado,
      nuevoSaldo: (saldoUsuario - monto_apostado).toFixed(2),
    });
  } catch (error) {
    console.error("Error al crear la apuesta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
