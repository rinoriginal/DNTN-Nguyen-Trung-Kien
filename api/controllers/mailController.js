const MailHandler = require('../handlers/mailHandler');
class MailController {
    constructor() {
        this.mailHandler = new MailHandler();
    }
    create(req, res) {
        this.mailHandler.create(req, res);
    }
}
module.exports = MailController;
