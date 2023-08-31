const express = require("express");
const router = express.Router();

// Search endpoint
router.get("/search", async (req, res) => {
  const { title, year, page } = req.query;

  // Check if query input is a number
  function isValidNumber(value) {
    return Number.isFinite(Number(value));
  }

  if (page && !isValidNumber(page)) {
    return res.status(400).json({
      error: true,
      message: "Invalid page format. page must be a number.",
    });
  }

  if (year && !isValidNumber(year)) {
    return res.status(400).json({
      error: true,
      message: "Invalid year format. Format must be yyyy.",
    });
  }

  let query = req.db
    .from("basics")
    .select(
      "primaryTitle as title",
      "year",
      "tconst as imdbID",
      "imdbRating",
      req.db.raw(
        "CAST(rottentomatoesRating AS SIGNED) as rottenTomatoesRating"
      ),
      req.db.raw("CAST(metacriticRating AS SIGNED) as metacriticRating"),
      "rated as classification"
    )
    .modify((queryBuilder) => {
      if (title) {
        queryBuilder.where("primaryTitle", "like", `%${title}%`);
      }
      if (year) {
        queryBuilder.where("year", year);
      }
    });

  try {
    // Knex-paginate (isLengthAware for full display)
    const result = await query.paginate({
      perPage: 100,
      isLengthAware: true,
      currentPage: page ? parseInt(page) : 1,
    });

    const { data, pagination } = result;

    data.forEach((movie) => {
      movie.imdbRating = parseFloat(movie.imdbRating);
    });

    pagination.currentPage = parseInt(pagination.currentPage);
    pagination.nextPage = parseInt(pagination.nextPage);

    res.json({
      data,
      pagination,
    });
  } catch (err) {
    console.log(err);

    if (err.name === "InvalidQueryParametersError") {
      res.status(400).json({
        error: true,
        message:
          "Invalid query parameters: year. Query parameters are not permitted.",
      });
    } else if (err.name === "RateLimitExceededError") {
      res.status(429).send("Too many requests, please try again later.");
    } else {
      res.status(500).json({ error: true, message: "Error in MySQL query" });
    }
  }
});

// Character parser for movie data output
const charactersParser = (str) => {
  if (str === "") {
    return [];
  }

  const replaced = str.replaceAll(`["`, "").replaceAll(`"]`, "");
  const split = replaced.split('","');

  return split;
};

// Data endpoint
router.get("/data/:imdbID", async (req, res) => {
  // Check for invalid query parameters
  if (Object.keys(req.query).length > 0) {
    const invalidParams = Object.keys(req.query).join(", ");
    return res.status(400).json({
      error: true,
      message: `Invalid query parameters: ${invalidParams}. Query parameters are not permitted.`,
    });
  }

  try {
    const rows = await req.db
      .select(
        "basics.primaryTitle as title",
        "basics.year",
        "basics.runtimeMinutes as runtime",
        "basics.genres",
        "basics.country",
        "principals.nconst as id",
        "principals.category",
        "principals.name",
        "principals.characters",
        {
          source: "ratings.source",
          value: req.db.raw("CAST(ratings.value AS DECIMAL(3,1))"),
        },
        "basics.boxoffice",
        "basics.poster",
        "basics.plot"
      )
      .from("basics")
      .innerJoin("principals", "basics.tconst", "principals.tconst")
      .leftJoin("ratings", "basics.tconst", "ratings.tconst")
      .leftJoin("names", "principals.nconst", "names.nconst")
      .where("basics.tconst", "=", req.params.imdbID);

    if (rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: "No record exists of a movie with this ID",
      });
    }
    // Initialize maps and arrays
    const principalsMap = new Map();
    const ratingsMap = new Map();
    const principals = [];
    const ratings = [];

    // Iterate over rows
    rows.forEach((row) => {
      if (row.id && !principalsMap.has(row.id)) {
        // Add principal to the map and array
        principalsMap.set(row.id, true);
        principals.push({
          id: row.id,
          name: row.name,
          category: row.category,
          characters: charactersParser(row.characters),
        });
      }
      // Process ratings
      if (row.source && row.value && !ratingsMap.has(row.source)) {
        ratingsMap.set(row.source, true);
        const ratingValue = parseFloat(row.value);
        ratings.push({
          source: row.source,
          value: isNaN(ratingValue) ? null : ratingValue,
        });
      }
    });

    // Create movie object (SwaggerDocs)
    const movie = {
      title: rows[0].title,
      year: rows[0].year,
      runtime: rows[0].runtime,
      genres: rows[0].genres.split(","),
      country: rows[0].country,
      principals,
      ratings,
      boxoffice: rows[0].boxoffice,
      poster: rows[0].poster,
      plot: rows[0].plot,
    };

    res.json(movie);
  } catch (err) {
    res.status(500).json({
      error: true,
      message: "An error occurred while fetching the movie information",
    });
  }
});

module.exports = router;
