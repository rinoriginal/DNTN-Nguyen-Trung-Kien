const express = require('express');
const router = express.Router();

const VoiceController = require('../controllers/voiceController');
const authMiddleware = require('../middlewares/authMiddleware');
let voiceController = new VoiceController();

router.post('/click-two-call', function (req, res) {
    voiceController.clickTwoCall(req, res);
});
router.post('/create', function (req, res) {
    voiceController.create(req, res);
});
router.post('/update-ticket', function (req, res) {
    voiceController.updateTicket(req, res);
});
router.get('/get-survey-code', function (req, res) {
    voiceController.getSurveyCode(req, res);
});
module.exports = router;
