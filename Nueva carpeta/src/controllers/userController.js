const { dbPool } = require("../db/config");
const cache = require("../cache/cache");

// Crear un nuevo usuario
const createUser = async (req, res) => {
  try {
    const { nombre_usuario, nombre, email } = req.body;

    // Verificar si el correo electrónico ya está registrado
    const [existingUserEmail] = await dbPool.execute(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    // Verificar si el nombre de usuario ya está registrado
    const [existingUserUsername] = await dbPool.execute(
      "SELECT * FROM usuarios WHERE nombre_usuario = ?",
      [nombre_usuario]
    );

    if (existingUserEmail.length > 0) {
      return res
        .status(400)
        .json({ message: "El correo electrónico ya está registrado" });
    }

    if (existingUserUsername.length > 0) {
      return res
        .status(400)
        .json({ message: "El nombre de usuario ya está registrado" });
    }

    // Si no hay conflictos, crear el usuario
    await dbPool.execute(
      "INSERT INTO usuarios (nombre_usuario, nombre, email) VALUES (?, ?, ?)",
      [nombre_usuario, nombre, email]
    );

    // Invalidar caché de usuarios
    cache.del("users_all");

    // Responder con éxito
    res.status(201).json({ message: "Usuario creado con éxito" });
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const cacheKey = "users_all";

    // Verificar si los datos están en caché
    const cachedUsers = cache.get(cacheKey);

    if (cachedUsers) {
      return res.status(200).json(cachedUsers);
    }

    // Realizar la consulta a la base de datos
    const [rows] = await dbPool.execute("SELECT * FROM usuarios");

    if (rows.length === 0) {
      return res.status(404).json({ message: "No se encontraron usuarios." });
    }

    // Guardar en caché
    cache.set(cacheKey, rows);

    // Enviar la respuesta con los datos
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los usuarios:", error);
    res.status(500).json({ message: "Error al obtener los usuarios." });
  }
};

// Actualizar saldo de un usuario
const updateBalance = async (req, res) => {
  try {
    const { nombre_usuario, monto } = req.body;

    // Validar que el monto sea positivo
    if (monto <= 0) {
      return res
        .status(400)
        .json({ message: "El monto debe ser mayor a cero" });
    }

    // Actualizar el saldo
    const [result] = await dbPool.execute(
      "UPDATE usuarios SET saldo = saldo + ? WHERE nombre_usuario = ?",
      [monto, nombre_usuario]
    );

    // Verificar si se actualizó algún registro
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Obtener el saldo actualizado
    const [usuario] = await dbPool.execute(
      "SELECT saldo FROM usuarios WHERE nombre_usuario = ?",
      [nombre_usuario]
    );

    // Invalidar caché si existe
    cache.del(`user_${nombre_usuario}`);

    // Responder con éxito y saldo actualizado
    res.status(200).json({
      message: "Saldo actualizado exitosamente",
      saldo_actual: usuario[0].saldo,
    });
  } catch (error) {
    console.error("Error al actualizar saldo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener un usuario por nombre_usuario
const getUserByUsername = async (req, res) => {
  try {
    const { nombre_usuario } = req.params;

    // Verificar si el usuario está en caché
    const cacheKey = `user_${nombre_usuario}`;
    const cachedUser = cache.get(cacheKey);

    if (cachedUser) {
      return res.status(200).json(cachedUser);
    }

    // Consultar en la base de datos
    const [usuario] = await dbPool.execute(
      "SELECT * FROM usuarios WHERE nombre_usuario = ?",
      [nombre_usuario]
    );

    if (usuario.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Guardar en caché
    cache.set(cacheKey, usuario[0]);

    res.status(200).json(usuario[0]);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ message: "Error al obtener el usuario." });
  }
};

// Eliminar un usuario
const deleteUser = async (req, res) => {
  try {
    const { nombre_usuario } = req.params;

    // Eliminar el usuario de la base de datos
    const [result] = await dbPool.execute(
      "DELETE FROM usuarios WHERE nombre_usuario = ?",
      [nombre_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Invalidar caché
    cache.del(`user_${nombre_usuario}`);
    cache.del("users_all");

    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  updateBalance,
  getUserByUsername,
  deleteUser,
};
