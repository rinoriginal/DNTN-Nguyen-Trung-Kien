const jwtHelper = require("../helpers/jwtHelper");
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || "access-token-secret-telehub";
const tokenLogin = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7IklkIjoiNWY1MWFkNjZkMzdiNzQyMWUxNTUyNWI3In0sImlhdCI6MTYwODczMjIzOX0.OEcr2R1D4C5eqFiCNc9q8JOQoaugdmPNZtntimEVWiU"
let isAuth = async (req, res, next) => {
    const tokenFromClient = req.headers && req.headers.authorization && req.headers.authorization.replace('Bearer ', '');
    if (tokenFromClient) {
        try {
            const decoded = await jwtHelper.verifyToken(tokenFromClient, accessTokenSecret);
            if (decoded && decoded.data && decoded.data.Id == tokenLogin){
                next();
            }
        } catch (error) {
            return res.status(401).json({
                message: 'Unauthorized.',
            });
        }
    } else {
        return res.status(403).send({
            message: 'No token provided.',
        });
    }
}
module.exports = {
    isAuth: isAuth
};
