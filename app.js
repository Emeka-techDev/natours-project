const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const reviewRouter = require('./routes/reviewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewsRoutes');
const bookingRouter = require('./routes/bookingRoute');
const emekaRouter = require('./routes/emekaRoute');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const app = express();
const path = require('path');

//setting up the views engine
app.set('view engine', 'pug');
// setting up the views locations
app.set('views', path.join(__dirname, 'views'));
// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from the same api
const limiter = rateLimit({
  limit: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this device try again in 1hr time'
})

app.use('/api', limiter)


// body parser, reading json data from body into req.body
app.use(express.json({ limit: '10kb' }));
// reading data from the url into req.body
app.use(express.urlencoded({ extended: true, limit: '10kb'}));
// to send and recieve cookies from the browser
app.use(cookieParser());

// Data sanitization against NOSQL query
app.use(mongoSanitize());

// Data sanitization againse xss attack


// sanitize against Data pollution
app.use(hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ]
}));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/emeka-stripe', emekaRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`could not find route ${req.url} on this server`, 404));
})

app.use(globalErrorHandler);

module.exports = app;
