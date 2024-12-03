const mysql = require("mysql2/promise");

// Cadena de conexión
const connectionString = process.env.DB_URL;

// Función para obtener los detalles de la cadena de conexión
const parseConnectionString = (url) => {
  const regex = /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)$/;
  const match = url.match(regex);

  if (!match) {
    throw new Error("La cadena de conexión no tiene el formato correcto");
  }

  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  };
};

// Configuración del pool de conexiones
const dbConfig = parseConnectionString(connectionString);

const dbPool = mysql.createPool({
  user: dbConfig.user,
  password: dbConfig.password,
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  connectionLimit: 10,  // Número de conexiones en el pool
  connectTimeout: 10000,  // Timeout de conexión en milisegundos
});

module.exports = { dbPool };
