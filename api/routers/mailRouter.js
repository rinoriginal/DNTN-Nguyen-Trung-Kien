const express = require('express');
const router = express.Router();

const MailController = require('../controllers/mailController');
const authMiddleware = require('../middlewares/authMiddleware');
let mailController = new MailController();

router.post('/offline/create', function (req, res) {
    chatController.storeMessageOffline(req, res);
});
router.post('/create', function (req, res) {
    mailController.create(req, res);
});
module.exports = router;
