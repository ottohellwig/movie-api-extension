const express = require("express");
const router = express.Router();

// Import authorization middleware
const peopleAuth = require("../middleware/peopleAuth");

// Individual person endpoint
router.get("/:id", peopleAuth, async function (req, res, next) {
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
        "names.primaryName",
        "names.birthYear",
        "names.deathYear",
        "principals.category",
        "principals.characters",
        "basics.originalTitle as movieName",
        "basics.tconst as movieId",
        "basics.imdbRating"
      )
      .from("names")
      .join("principals", "names.nconst", "principals.nconst")
      .join("basics", "principals.tconst", "basics.tconst")
      .where("names.nconst", "=", req.params.id)
      .orderBy("basics.tconst", "asc");

    if (rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: "No record exists of a person with this ID",
      });
    }

    const person = {
      name: rows[0].primaryName,
      birthYear: rows[0].birthYear,
      deathYear: rows[0].deathYear,
      roles: rows.map((row) => ({
        movieName: row.movieName,
        movieId: row.movieId,
        category: row.category,
        characters: JSON.parse(row.characters),
        imdbRating: parseFloat(row.imdbRating),
      })),
    };

    res.json(person);
  } catch (error) {
    console.log(error);

    if (
      error instanceof Error &&
      error.name === "InvalidQueryParametersError"
    ) {
      res.status(400).json({
        error: true,
        message:
          "Invalid query parameters: year. Query parameters are not permitted.",
      });
    } else if (
      error instanceof Error &&
      error.name === "RateLimitExceededError"
    ) {
      res.status(429).send("Too many requests, please try again later.");
    } else {
      res.status(500).json({ error: true, message: "Error in MySQL query" });
    }
  }
});

module.exports = router;
