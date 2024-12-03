const express = require("express");
const router = express.Router();
const {
  createUser,
  getAllUsers,
  updateBalance,
  getUserByUsername,
  deleteUser,
} = require("../controllers/userController");

router.post("/", createUser); // Crear un nuevo usuario
router.get("/", getAllUsers); // Obtener todos los usuarios
router.get("/:nombre_usuario", getUserByUsername); // Obtener un usuario por nombre_usuario
router.put("/balance", updateBalance); // Actualizar el saldo de un usuario
router.delete("/:nombre_usuario", deleteUser); // Eliminar un usuario

module.exports = router;
