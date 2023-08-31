const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.body.refreshToken;
  let decodedToken = {};
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      res.status(400);
      res.json({
        error: true,
        message: "Request body incomplete, refresh token required",
      });
      return;
    }
    if (!decodedToken.refreshExp) {
      res.status(401);
      res.json({ error: true, message: "Invalid JWT token" });
      return;
    }

    if (Date.now() / 1000 > decodedToken.refreshExp) {
      throw { error: true, name: "TokenExpiredError" };
    }
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      res.status(401).json({ error: true, message: "JWT token has expired" });
    } else if (e.message === "jwt malformed") {
      res.status(401).json({ error: true, message: "Invalid JWT token" });
    } else if (e.message === "jwt must be provided") {
      res.status(400);
      res.json({
        error: true,
        message: "Request body incomplete, refresh token required",
      });
    }
    return;
  }

  res.locals.refresh_data = decodedToken;
  next();
};
