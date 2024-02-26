// Verify token middleware.
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader)  {
        const token = authHeader.split(' ')[1] // Extract the token from the Authorization header

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token is not valid or has expired' });
            }

            req.user = user; // Attach the user to the request for further use
            next();
        });
    } else {
        res.status(401).json({ error: 'Access token is missing' });
    }
}

module.exports = verifyToken;