const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authControllers');
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router.route('/')
    .get(reviewController.getAllReviews)
    .post(authController.restrictedTo('user'), reviewController.setTourUserIds, reviewController.createReview);

router.route('/:id')
    .get(reviewController.getReview)
    .delete(authController.restrictedTo('user', 'admin'), reviewController.deleteReview)
    .patch(authController.restrictedTo('user', 'admin'), reviewController.updateReview)

module.exports = router;