const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

router.get('/emeka-checkout-session', authController.testSession);

router.get('/success', (req, res, next) => {
    res.status(200).render('success')
})

router.get('/failed', (req, res, next) => {
    res.status(200).render('failed')
})

module.exports = router;