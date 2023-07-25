let objectExports = {};
// Node v6
// objectExports = Object.assign({}, require("./api.telehub.cisco"))

module.exports = {
    ...require("./api.report"),
    ...require("./api.telehub.cisco"),
};
// Node v6

// Node v10

// module.exports = {
//     ...require("./api.report"),
// };

// Node v10