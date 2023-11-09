const Tour = require('../models/TourModel');
const User = require('../models/UserModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getOverView = catchAsync(async (req, res, next) => {
   // 1) Get tour data from collection
   const tours = await Tour.find();
   // 2) Build template
   // 3) Render that template using tour data from 1)
   
    res.status(200).render('overview', {
        title: 'All Tours' ,
        tours 
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    // get the data, for the requested tour (including reviews and guides)
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user'
    });
   
    if (!tour) {
        return next(new AppError('There is no tour with that name', 404))
    }

    // Build template

    // 3) render template using data from 1
   res.status(200).render('tour', {
        title: `${tour.name} tour`,
        tour
   });
})


exports.getLoginForm = (req, res, next) => {
    
    res.status(200).render('login', {
        title: 'Log into your account'
    })
}

exports.getAccount = (req, res) => {
    res.status(200).render('account', {
        title: 'Your account'
    });
}

// exports.getBase = (req, res, next) => {
//     res.status(200).render('base');
// }

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    }, {
            new: true,
            runValidators: true
        }
    )

    res.status(200).render('account', {
        title: 'Your account',
        user: updatedUser
    })
})

exports.getMyTours = async (req, res, next) => {
    const bookings = await Booking.find({user: req.user.id});
    // list of different booking doc with different tourId and different Id
    console.log(bookings);
    // my method, pls uncomment it out for testing onces code is runnnig 
    // const tours =  await Promise.all(bookings.map(booking => Tour.findById(booking.tour)))

    // 2) Find tours with the returned IDs
    const tourIDs = bookings.map(el => el.tour);
    const tours = await Tour.find({ _id : { $in: tourIDs }});

    res.status(200).render('overview', {
        title: 'My Tours',
        tours
    })
    // res.status(200).render(bookingpage, {
    //     tours
    // })
}