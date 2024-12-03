const { dbPool } = require("../db/config");
const cache = require("../cache/cache");
const moment = require("moment");
const {
  validateDriver,
  generateDriverId,
  generateUniqueDriverId,
} = require("../utils/driverUtils");

// Obtener todos los pilotos
const getAllDrivers = async (req, res) => {
  try {
    const cacheKey = "drivers_all";

    const cachedDrivers = cache.get(cacheKey);
    if (cachedDrivers) {
      return res.status(200).json(cachedDrivers);
    }

    const [rows] = await dbPool.execute("SELECT * FROM f1_pilotos");
    if (rows.length === 0) {
      return res.status(404).json({ message: "No se encontraron pilotos." });
    }

    cache.set(cacheKey, rows);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los pilotos:", error);
    res.status(500).json({ message: "Error al obtener los pilotos." });
  }
};

// Obtener un piloto por ID
const getByDriverId = async (req, res) => {
  try {
    const id = req.params.id_piloto;
    const cacheKey = `driver_${id}`;

    const cachedDriver = cache.get(cacheKey);
    if (cachedDriver) {
      return res.status(200).json(cachedDriver);
    }

    const [rows] = await dbPool.execute(
      "SELECT * FROM f1_pilotos WHERE id_piloto = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Piloto no encontrado." });
    }

    cache.set(cacheKey, rows[0]);
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error al obtener el piloto:", error);
    res.status(500).json({ message: "Error al obtener el piloto." });
  }
};

// Crear un nuevo piloto
const createDriver = async (req, res) => {
  try {
    const {
      numero_piloto,
      nombre_completo,
      fecha_nacimiento,
      lugar_nacimiento,
      pais,
    } = req.body;

    await validateDriver(dbPool, nombre_completo);
    const baseId = generateDriverId(nombre_completo);
    const id_piloto = await generateUniqueDriverId(dbPool, baseId);

    const edad = moment().diff(moment(fecha_nacimiento), "years");
    const ciudad = lugar_nacimiento.split(",")[0].trim();

    const pilotoData = {
      id_piloto,
      numero_piloto,
      nombre_completo,
      codigo_pais: pais,
      fecha_nacimiento,
      lugar_nacimiento: ciudad,
      edad,
      podios: 0,
      grandes_premios: 0,
      campeonatos_mundiales: 0,
    };

    await dbPool.execute(
      "INSERT INTO f1_pilotos (id_piloto, numero_piloto, nombre_completo, codigo_pais, fecha_nacimiento, lugar_nacimiento, edad, podios, grandes_premios, campeonatos_mundiales) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        pilotoData.id_piloto,
        pilotoData.numero_piloto,
        pilotoData.nombre_completo,
        pilotoData.codigo_pais,
        pilotoData.fecha_nacimiento,
        pilotoData.lugar_nacimiento,
        pilotoData.edad,
        pilotoData.podios,
        pilotoData.grandes_premios,
        pilotoData.campeonatos_mundiales,
      ]
    );

    cache.set(id_piloto, pilotoData);
    res.status(201).json(pilotoData);
  } catch (error) {
    if (error.message.includes("Ya existe un piloto")) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Ya existe un piloto con este identificador",
      });
    }

    res.status(500).json({ message: "Error al crear el piloto." });
  }
};

// Obtener carreras de un piloto

// Obtener carreras de un piloto
const getDriverRaces = async (req, res) => {
  try {
    const { id_piloto } = req.params;
    const cacheKey = `driver_races_${id_piloto}`; // Llave de caché única para las carreras del piloto

    // Verificar si los datos están en caché
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Verificar si el piloto existe
    const [pilotExists] = await dbPool.execute(
      "SELECT id_piloto FROM f1_pilotos WHERE id_piloto = ?",
      [id_piloto]
    );

    if (pilotExists.length === 0) {
      return res.status(404).json({ message: "El piloto no existe." });
    }

    // Obtener las carreras del piloto
    const [rows] = await dbPool.execute(
      "SELECT * FROM f1_carreras WHERE id_piloto = ?",
      [id_piloto]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron carreras para este piloto." });
    }

    // Guardar los resultados en caché por 1 hora
    cache.set(cacheKey, rows, 3600);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener las carreras del piloto:", error);
    res.status(500).json({ message: "Error al obtener las carreras." });
  }
};

// Obtener resultados de una temporada para un piloto
const getDriverSeasonResults = async (req, res) => {
  try {
    const { temporada, id_piloto } = req.params;
    const cacheKey = `driver_season_${id_piloto}_${temporada}`; // Llave de caché única para resultados de temporada

    // Verificar si los datos están en caché
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Verificar si el piloto existe
    const [pilotExists] = await dbPool.execute(
      "SELECT id_piloto FROM f1_pilotos WHERE id_piloto = ?",
      [id_piloto]
    );

    if (pilotExists.length === 0) {
      return res.status(404).json({ message: "El piloto no existe." });
    }

    // Obtener resultados de temporada para el piloto
    const [rows] = await dbPool.execute(
      "SELECT * FROM f1_clasificaciones_pilotos WHERE temporada = ? AND id_piloto = ?",
      [temporada, id_piloto]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron resultados para esta temporada." });
    }

    // Guardar los resultados en caché por 1 hora
    cache.set(cacheKey, rows, 3600);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los resultados de temporada:", error);
    res.status(500).json({ message: "Error al obtener los resultados." });
  }
};

// Eliminar un piloto
const deleteDriver = async (req, res) => {
  try {
    const { id_piloto } = req.params;

    const [result] = await dbPool.execute(
      "DELETE FROM f1_pilotos WHERE id_piloto = ?",
      [id_piloto]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Piloto no encontrado." });
    }

    cache.del(`driver_${id_piloto}`);
    cache.del("drivers_all");

    res.status(200).json({ message: "Piloto eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar el piloto:", error);
    res.status(500).json({ message: "Error al eliminar el piloto." });
  }
};

module.exports = {
  getAllDrivers,
  getByDriverId,
  createDriver,
  getDriverRaces,
  getDriverSeasonResults,
  deleteDriver,
};
