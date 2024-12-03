const express = require("express");
const router = express.Router();
const {
  getAllDrivers,
  getByDriverId,
  createDriver,
  getDriverRaces,
  getDriverSeasonResults,
  deleteDriver,
} = require("../controllers/driverController");

router.get("/", 
  
); // Obtener todos los pilotos
router.get("/:id_piloto", getByDriverId); // Obtener un piloto por su ID
router.post("/", createDriver); // Crear un nuevo piloto
router.get("/:id_piloto/carreras", getDriverRaces); // Obtener todas las carreras de un piloto
router.get("/:id_piloto/temporadas/:temporada", getDriverSeasonResults); // Obtener resultados de una temporada para un piloto
router.delete("/:id_piloto", deleteDriver); // Eliminar un piloto por su ID

module.exports = router;
