// Validar nombre único
const validateDriver = async (dbPool, nombreCompleto) => {
  const [existingName] = await dbPool.execute(
    "SELECT * FROM f1_pilotos WHERE nombre_completo = ?",
    [nombreCompleto]
  );

  if (existingName.length > 0) {
    throw new Error(
      `Ya existe un piloto registrado con el nombre completo ${nombreCompleto}.`
    );
  }
};

// Generar ID de piloto base
const generateDriverId = (nombreCompleto) => {
  const apellido = nombreCompleto.split(" ")[1] || "";
  let id_piloto = apellido.toUpperCase().slice(0, 3);
  id_piloto = id_piloto.replace(/[^A-Z]/g, "");
  return id_piloto.padEnd(3, "X");
};

// Generar ID único
const generateUniqueDriverId = async (dbPool, baseId) => {
  let id_piloto = baseId;
  let [existingDrivers] = await dbPool.execute(
    "SELECT * FROM f1_pilotos WHERE id_piloto = ?",
    [id_piloto]
  );

  while (existingDrivers.length > 0) {
    let newId = id_piloto.split("");
    for (let i = newId.length - 1; i >= 0; i--) {
      if (newId[i] === "Z") {
        newId[i] = "A";
      } else {
        newId[i] = String.fromCharCode(newId[i].charCodeAt(0) + 1);
        break;
      }
    }
    id_piloto = newId.join("");

    // Verificar de nuevo si el nuevo ID existe
    [existingDrivers] = await dbPool.execute(
      "SELECT * FROM f1_pilotos WHERE id_piloto = ?",
      [id_piloto]
    );
  }

  return id_piloto;
};

module.exports = {
    validateDriver,
    generateUniqueDriverId,
    generateDriverId,
}