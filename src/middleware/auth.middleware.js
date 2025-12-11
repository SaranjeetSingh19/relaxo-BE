const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (requiredRole = null) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token missing or malformed' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            if (requiredRole && decoded.role !== requiredRole) {
                return res.status(403).json({ message: 'Access denied' });
            }

            next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
    };
};
