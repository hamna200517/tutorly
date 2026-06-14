const HttpError = require("../utils/httpError");

module.exports = function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new HttpError(403, "FORBIDDEN", "You do not have permission to access this resource");
    }

    next();
  };
};
