const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authControllers');
const bookingController = require('../controllers/bookingController');

// Set the use loggedIn middleware
router.get('/', bookingController.createBookingCheckout, authController.isLoggedIn, viewController.getOverView)
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', viewController.getLoginForm);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours)

router.post('/submit-user-data', authController.protect, viewController.updateUserData);

module.exports = router;