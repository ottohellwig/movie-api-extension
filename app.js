require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

// Swagger setup
const swaggerUI = require("swagger-ui-express");
const swaggerDocument = require("./docs/swagger.json");

const app = express();

// Routes setup
const moviesRouter = require("./routes/movies");
const peopleRouter = require("./routes/people");
const usersRouter = require("./routes/users");

// Database setup
const options = require("./knexfile");
const knex = require("knex")(options);
const cors = require("cors");

app.use((req, res, next) => {
  req.db = knex;
  next();
});

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

logger.token("res", (req, res) => {
  const headers = {};
  res.getHeaderNames().map((h) => (headers[h] = res.getHeader(h)));
  return JSON.stringify(headers);
});

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

app.get("/knex", function (req, res, next) {
  req.db
    .raw("SELECT VERSION()")
    .then((version) => console.log(version[0][0]))
    .catch((err) => {
      console.log(err);
      throw err;
    });
  res.send("Version Logged successfully");
});

// Knex-paginate
const { attachPaginate } = require("knex-paginate");
attachPaginate();

// SwaggerUI/docs routing
app.use("/", swaggerUI.serve);
app.get("/", swaggerUI.setup(swaggerDocument));

// Routing to endpoints
app.use("/movies", moviesRouter);
app.use("/people", peopleRouter);
app.use("/user", usersRouter);

// Catch 404
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  // Set local (errors in dev)
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Render error page
  res.status(err.status || 500);
  res.render("error");
});

var listener = app.listen(1337, function () {
  console.log("Listening on port " + listener.address().port);
});

module.exports = app;
