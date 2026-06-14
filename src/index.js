require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const path = require("path");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const sessionBookingRoutes = require("./routes/sessionBookingRoutes");
const withdrawalRoutes = require("./routes/withdrawalRoutes");
const academyRoutes = require("./routes/academyRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const discoveryRoutes = require("./routes/discoveryRoutes");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const swaggerPath = path.join(__dirname, "..", "docs", "api", "swagger.yaml");
const swaggerDocument = YAML.load(swaggerPath);

app.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "Server is running",
      message: "Use /health for DB status and /api-docs for API docs",
    },
  });
});

app.get("/health", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json({
    success: true,
    data: {
      status: "Server is running",
      db_time: result.rows[0].now,
    },
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/sessions", sessionBookingRoutes);
app.use("/api/v1/withdrawals", withdrawalRoutes);
app.use("/api/v1/academies", academyRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/discovery", discoveryRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      details: null,
    },
  });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message = err.message || "Internal Server Error";

  if (status >= 500) {
    console.error("Global Error:", err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: err.details || null,
    },
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
    process.exit(1);
  }
  throw err;
});
