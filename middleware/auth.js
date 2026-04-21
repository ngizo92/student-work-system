const jwt = require("jsonwebtoken");

/* ================= VERIFY TOKEN MIDDLEWARE ================= */
/* FIX: supports "Bearer <token>" format from frontend */

function verifyToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        /* FIX: remove Bearer prefix safely */
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decoded = jwt.verify(token, "student-system-secret-key");

        req.user = decoded;
        next();

    } catch (err) {
        return res.json({
            success: false,
            message: "Invalid token"
        });
    }
}

module.exports = verifyToken;