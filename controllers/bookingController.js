const Tour = require('../models/TourModel');
const Booking = require('../models/bookingModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getCheckOutSession = catchAsync( async (req, res, next) => {
    // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/?tour=${
            req.params.tousrId
        }&user=${req.user.id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    unit_amount: tour.price * 100,                    
                    product_data: {
                        description: tour.summary,
                        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
                        name: `${tour.name} Tour`,
                    },                      
                },
                quantity: 1,               
            },
        ]
    })
  
    // 3) Create session as response
    res.status(200).json({
        status: 'success',
        session
    })
});

exports.createBookingCheckout = catchAsync( async (req, res, next) => {
    // This is only TEMPORARY, because it's UNSECURE: everyone can make booking without paying
    const { tour, user, price } = req.query;

    if (!tour && !user && !price) return next();
    await Booking.create({ tour, user, price });

    res.redirect(req.originalUrl.split('?')[0]);
})

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking)