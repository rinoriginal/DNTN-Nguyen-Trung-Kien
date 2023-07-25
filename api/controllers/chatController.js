const ChatHandler = require('../handlers/chatHandler');
const RegisterServiceHandler = require('../handlers/registerServiceHandler')
class ChatController {
    constructor() {
        this.chatHandler = new ChatHandler();
    }
    storeMessageOffline(req, res) {
        this.chatHandler.createMessageOfflineChat(req, res);
    }
    getHistoryChat(req, res) {
        this.chatHandler.getHistoryChat(req, res);
    }
    asyncRecording(req, res) {
        this.chatHandler.asyncRecording(req, res);
    }
    getTicketChat(req, res) {
        this.chatHandler.getTicketChat(req, res);
    }
}
module.exports = ChatController;
