const express = require('express');
const router = express.Router();

const ServiceController = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');
let serviceController = new ServiceController();

router.post('/token/create', function (req, res) {
    serviceController.generateCertificate(req, res);
});
router.get('/decode', function (req, res) {
    serviceController.convertString(req, res);
});
module.exports = router;
