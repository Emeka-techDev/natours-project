const express = require('express');
const tourController = require('./../controllers/tourController');
const authControllers = require('../controllers/authControllers');
const reviewRouter = require('../routes/reviewRoutes');

const router = express.Router();

router.use('/:tourId/reviews', reviewRouter);

router.route('/top-5-cheap-tours')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats')
    .get(tourController.getTourStats);

router.route('/monthly-plan/:year')
    .get(authControllers.protect, authControllers.restrictedTo('admin', 'lead-guide', 'guide'), tourController.getMonthlyPlan);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(authControllers.protect, authControllers.restrictedTo('admin', 'lead-guide'), tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authControllers.protect, authControllers.restrictedTo('admin', 'lead-guide'), tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour)
  .delete(authControllers.protect, authControllers.restrictedTo('admin', 'lead-guide'), tourController.deleteTour);

router.route('/tours-within/:distance/center/:latlng/unit/:unit', tourController.getToursWithin); 

router.route('/distances/:latlng/unit/:unit', tourController.getDistances);

module.exports = router;
