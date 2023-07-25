const express = require('express');
const router = express.Router();

const ChatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');
let chatController = new ChatController();

router.post('/offline/create', authMiddleware.isAuth, function (req, res) {
    chatController.storeMessageOffline(req, res);
});
router.get('/history', function (req, res) {
    chatController.getHistoryChat(req, res);
});
router.get('/async-recording', function (req, res) {
    chatController.asyncRecording(req, res);
});
router.post('/ticket-chat', function (req, res) {
    chatController.getTicketChat(req, res);
});
module.exports = router;
