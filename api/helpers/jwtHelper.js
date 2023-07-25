const jwt = require("jsonwebtoken");

let generateToken = (user, secretSignature) => {
  return new Promise((resolve, reject) => {
    const userData = {
      Id: user.Id
    }
    jwt.sign({ data: userData },
      secretSignature,
      {
        algorithm: "HS256",
      },
      (error, token) => {
        if (error) {
          return reject(error);
        }
        resolve(token);
      });
  });
}

let verifyToken = (token, secretKey) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        return reject(error);
      }
      resolve(decoded);
    });
  });
}
module.exports = {
  generateToken: generateToken,
  verifyToken: verifyToken,
};
