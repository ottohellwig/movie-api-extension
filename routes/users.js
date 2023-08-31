const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const moment = require("moment");

// Import middleware
const errorHandler = require("../middleware/errorHandler");
const profileAuth = require("../middleware/profileAuth");
const jwtAuth = require("../middleware/jwtAuth");

// Login endpoint
router.post("/login", async (req, res) => {
  const { email, password, bearerExpiresInSeconds, refreshExpiresInSeconds } =
    req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required",
    });
  }

  try {
    const rows = await req.db("users").select("*").where("email", "=", email);

    if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].hash))) {
      return res
        .status(401)
        .json({ error: true, message: "Incorrect email or password" });
    }

    // Assign expiration and sign payload for bearer token
    const bearerExpiresIn = parseInt(bearerExpiresInSeconds) || 600;
    const bearerExp = Math.floor(Date.now() / 1000) + bearerExpiresIn;
    const bToken = jwt.sign({ email, bearerExp }, process.env.JWT_SECRET);

    // Assign expiration and sign payload for refresh token
    const refreshExpiresIn = parseInt(refreshExpiresInSeconds) || 86400;
    const refreshExp = Math.floor(Date.now() / 1000) + refreshExpiresIn;
    const rToken = jwt.sign({ email, refreshExp }, process.env.JWT_SECRET);

    // Store refresh token
    await req
      .db("users")
      .where("email", "=", email)
      .update({ refreshToken: rToken });

    res.status(200).json({
      bearerToken: {
        token: bToken,
        token_type: "Bearer",
        expires_in: bearerExpiresIn,
      },
      refreshToken: {
        token: rToken,
        token_type: "Refresh",
        expires_in: refreshExpiresIn,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  }
});

// Register endpoint
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required",
    });
  }

  try {
    const users = await req.db
      .from("users")
      .select("*")
      .where("email", "=", email);

    if (users.length > 0) {
      throw new Error("User already exists");
    }
    // Hash password
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    await req.db.from("users").insert({ email, hash });

    res.status(201).json({ success: true, message: "User created" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Refresh endpoint
router.post("/refresh", errorHandler, async (req, res) => {
  try {
    const tokenData = res.locals.refresh_data;
    const { email } = tokenData;

    // Assign expiration and sign payload for bearer token
    const bearerExpiresIn = 600;
    const bearerExp = Math.floor(Date.now() / 1000) + bearerExpiresIn;
    const bearerToken = jwt.sign({ email, bearerExp }, process.env.JWT_SECRET);

    // Assign expiration and sign payload for refresh token
    const refreshExpiresIn = 86400;
    const refreshExp = Math.floor(Date.now() / 1000) + refreshExpiresIn;
    const refreshToken = jwt.sign(
      { email, refreshExp },
      process.env.JWT_SECRET
    );

    // Store refresh token
    await req.db("users").where("email", "=", email).update({
      refreshToken: refreshToken,
    });

    res.status(200).json({
      bearerToken: {
        token: bearerToken,
        token_type: "Bearer",
        expires_in: bearerExpiresIn,
      },
      refreshToken: {
        token: refreshToken,
        token_type: "Refresh",
        expires_in: refreshExpiresIn,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  }
});

// Logout endpoint
router.post("/logout", errorHandler, async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;

    // Verify refreshToken
    if (!refreshToken) {
      return res.status(400).json({
        error: true,
        message: "Request body incomplete, refresh token required",
      });
    }

    // Find the user with the given refreshToken
    const users = await req.db
      .from("users")
      .select("*")
      .where("refreshToken", "=", refreshToken);

    if (users.length === 0) {
      return res.status(401).json({
        error: true,
        message: "JWT token is invalid",
      });
    }

    const userId = users[0].id;

    // Update the refreshToken to null
    await req.db
      .from("users")
      .where("id", "=", userId)
      .update({ refreshToken: null });

    // Return success message
    res.status(200).json({
      error: false,
      message: "Token successfully invalidated",
    });
  } catch (error) {
    if (error.message === "JWT token has expired") {
      res.status(401).json({
        error: true,
        message: "JWT token has expired",
      });
    } else {
      res.status(500).json({
        error: true,
        message: "Internal server error",
      });
    }
  }
});

// Get profile route
router.get("/:email/profile", profileAuth, async (req, res) => {
  try {
    const email = req.params.email;
    const tokenData = res.locals.token_data;

    const rows = await req
      .db("users")
      .select("firstName", "lastName", "dob", "address")
      .where("email", "=", email);

    if (rows.length === 0) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    const userData = rows[0];
    const response = {
      email: email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    };

    if (tokenData.email !== email) {
      return res.status(200).json(response);
    }

    response.dob = userData.dob;
    response.address = userData.address;

    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  }
});

// Put profile endpoint
router.put("/:email/profile", jwtAuth, async (req, res) => {
  const email = req.params.email;
  const update_data = req.body;

  try {
    // Check if user exists
    const user_check = await req
      .db("users")
      .select("*")
      .where("email", "=", email);
    if (user_check.length === 0) {
      res.status(404).json({ error: true, message: "User not found" });
      return;
    }

    const token_data = res.locals.token_data;

    // Verify user access
    if (token_data.email !== email) {
      res.status(403).json({ error: true, message: "Forbidden" });
      return;
    }

    // Check required fields in the update data
    if (
      !update_data.firstName ||
      !update_data.lastName ||
      !update_data.dob ||
      !update_data.address
    ) {
      res.status(400).json({
        error: true,
        message:
          "Request body incomplete: firstName, lastName, dob and address are required.",
      });
      return;
    }

    // Check if resp body (Swag) is string
    let invalid_param = false;
    for (let field in update_data) {
      if (typeof update_data[field] !== "string") {
        invalid_param = true;
        break;
      }
    }

    if (invalid_param) {
      res.status(400).json({
        error: true,
        message:
          "Request body invalid: firstName, lastName and address must be strings only.",
      });
      return;
    }

    // Check if dob is valid (Moment.js middleware)
    const dob = moment(update_data.dob, "YYYY-MM-DD", true);
    if (!dob.isValid()) {
      res.status(400).json({
        error: true,
        message: "Invalid input: dob must be a real date in format YYYY-MM-DD.",
      });
      return;
    }

    if (dob.isAfter(moment())) {
      res.status(400).json({
        error: true,
        message: "Invalid input: dob must be a date in the past.",
      });
      return;
    }

    await req.db("users").where("email", "=", email).update({
      firstName: update_data.firstName,
      lastName: update_data.lastName,
      dob: update_data.dob,
      address: update_data.address,
    });

    const rows = await req
      .db("users")
      .select("email", "firstName", "lastName", "dob", "address")
      .where("email", "=", email);

    // Return updated user prof as obj
    const user_data = rows[0];
    res.status(200).json({
      email: user_data.email,
      firstName: user_data.firstName,
      lastName: user_data.lastName,
      dob: user_data.dob,
      address: user_data.address,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  }
});

module.exports = router;
