import jwt from 'jsonwebtoken';

const optionalAuth = (req, res, next) => {
    const { token } = req.headers;

    if (token) {
        try {
            req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
        } catch (error) {
            // Recommendations continue to work for guests with invalid or expired tokens.
        }
    }

    next();
};

export default optionalAuth;
