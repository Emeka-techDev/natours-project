const AppError = require("../utils/appError")

const sendDevError = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {    
    console.log(`Error💥`, err)
    return res.status(err.statusCode).json({
      status: err.status,
      err: err,
      message: err.message,
      stack: err.stack
    })
  
  } else {    
    console.log(`Error💥`, err)
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message
    }) 
  }
  
}

const sendProdError = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      console.log(`Error💥`, err);

      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      })
    
    } else {
      console.log(`Error💥`, err)
      res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: err.message
      }) 
    }    

  } else {        
    console.log(`Error💥`, err)
    res.status(err.statusCode).render('error', {
      title: 'Pls try again latder',
      msg: err.message
    }) 
  }
}

const handleCastError = (err) => {
  console.log(err)
  if (err.name == 'CastError') {
    return new AppError(`the ${err.path} with value ${err.value} is not a valid id`, 404)
  }

}

const handleDupError = (err) => {
  const value = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];

  const message = `Duplicate value ${value}, pls use another value`
  if (err.code === 11000) {
    return new AppError(message, 400);
  }
  // if (err.code === 11000) {
  //   return new AppError(`Duplicate name (${err.keyValue.name}), pls use another value`, 400);
  // }
}

const handleValidationError = (err) => {
  const values = Object.values(err.error).map(el => el.message);
  values = values.join('. ');
  return new AppError(values, 403);

    // return new AppError(value, 403);
}


const handleJsonWebTokenError = () => new AppError('invalid token, pls login again', 401)

const handleExpiredTokenError = () => new AppError('token session expired. Get a new token', 401)

module.exports = (err, req, res, next) => {
  err.message = err.message || `some error occured`;
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'failed';

  if (process.env.NODE_ENV === 'development') {
    sendDevError(err, req, res);
  }

  if (process.env.NODE_ENV === 'production') {
    let error = Object.assign(err);

    if (error.name == 'CastError') error = handleCastError(error);
    if (error.code == 11000) error = handleDupError(error);
    if (error.name == 'ValidationError') error = handleValidationError(error);
    if (error.name == 'JsonWebTokenError') error = handleJsonWebTokenError()
    if (err.name == 'TokenExpiredError') error = handleExpiredTokenError();
    console.log(err);
    sendProdError(error, req, res);
  }  
  
}
