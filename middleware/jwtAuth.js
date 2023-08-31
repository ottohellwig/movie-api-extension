const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  if (
    !("authorization" in req.headers) ||
    !req.headers.authorization.match(/^Bearer /)
  ) {
    res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found",
    });
    return;
  }

  const token = req.headers.authorization.replace(/^Bearer /, "");
  let decodedToken = {};

  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (Date.now() / 1000 > decodedToken.bearerExp) {
      throw { error: true, name: "TokenExpiredError" };
    }
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      res.status(401).json({ error: true, message: "JWT token has expired" });
    } else {
      res.status(401).json({ error: true, message: "Invalid JWT token" });
    }
    return;
  }

  res.locals.token_data = decodedToken;
  next();
};
