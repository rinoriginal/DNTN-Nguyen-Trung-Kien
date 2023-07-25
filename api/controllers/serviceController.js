
const RegisterServiceHandler = require('../handlers/registerServiceHandler')
class ServiceController {
    constructor() {
        this.registerServiceHandler = new RegisterServiceHandler();
    }
    generateCertificate(req, res){
        this.registerServiceHandler.registerService(req, res);
    }
    convertString(req, res){
        this.registerServiceHandler.convertString(req, res);
    }

}
module.exports = ServiceController;
