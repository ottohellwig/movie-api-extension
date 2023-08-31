const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found",
    });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (Date.now() / 1000 > decodedToken.bearerExp) {
      throw new Error("TokenExpiredError");
    }
    res.locals.decodedToken = decodedToken;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ error: true, message: "JWT token has expired" });
    } else {
      res.status(401).json({ error: true, message: "Invalid JWT token" });
    }
  }
};
