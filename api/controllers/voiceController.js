const VoiceHandler = require('../handlers/voiceHandler');
class VoiceController {
    constructor() {
        this.voiceHandler = new VoiceHandler();
    }
    clickTwoCall(req, res) {
        this.voiceHandler.clickTwoCall(req, res);
    }
    create(req, res){
        this.voiceHandler.create(req, res)
    }
    updateTicket(req, res){
        this.voiceHandler.updateTicket(req, res)
    }
    getSurveyCode(req, res) {
        this.voiceHandler.getSurveyCode(req, res);
    }
}
module.exports = VoiceController;
