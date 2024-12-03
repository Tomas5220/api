// Importación de módulos necesarios
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

// Creación de la instancia de la aplicación Express
const app = express();
const port = process.env.PORT || 3000; // Definición del puerto del servidor
const baseUrl = "/f1_api/v1"; // Base URL para todas las rutas de la API

// Definición de rutas y sus respectivos módulos de manejo
const paths = {
  driver: { path: "/driver", route: require("../src/routes/driverRoutes") },
  user: { path: "/user", route: require("../src/routes/userRoutes") }
};

// Configuración de middlewares globales
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

// Registro dinámico de rutas
Object.values(paths).forEach(({ path, route }) => {
  app.use(baseUrl + path, route);
});

// Inicio del servidor
app.listen(port, () => {
  console.log("Server listening on port " + port);
});

//   season: { path: "/season", route: require("../src/routes/seasonRoutes") },
//   team: { path: "/team", route: require("../src/routes/teamRoutes") },
//   driver: { path: "/driver", route: require("../src/routes/driverRoutes") },
//   users: { path: "/users", route: require("../src/routes/userRoutes") },
