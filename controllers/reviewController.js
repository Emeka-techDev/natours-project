const { JsonWebTokenError } = require('jsonwebtoken');
const Review = require('../models/ReviewsModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');


exports.setTourUserIds = (req, res, next) => {
    // Allow nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    next();
}


exports.protectReview = catchAsync (async (req, res, next) => {
    if (!req.header.Authorization || !req.header.Authorization.startsWith('Bearer')) {
        return next(new AppError('invalid or no authorization token'))
    }

    const token = req.header.Authorization.slice(7);
    const decoded = jwt.verify(token);
    const user = await user.findById(decoded.id)

    if (!user) {
        return next(new AppError('no user with this token', 404))
    }
   
    if (user.role !== 'user') {
        return next(new AppError('only user can alter this route', 500))
    }
    req.user = user
    next()
})

exports.getAllReviews = factory.getAll(Review)
exports.getReview = factory.getOne(Review)
exports.createReview = factory.createOne(Review)
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);