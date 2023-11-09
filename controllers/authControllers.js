const Tour = require('../models/TourModel')
const User = require('../models/UserModel');
const catchAsync = require('../utils/catchAsync.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const { promisify } = require('util');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const jwtSignature = (id, expiration) => {
    return jwt.sign({id: id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_TOKEN_EXP});
}


const createSendToken = (user, statusCode, res) => {
    const token = jwtSignature(user._id);
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000)
    }

    if ( process.env.NODE_ENV == "production" ) cookieOptions.secure = true;
    
    res.cookie('jwt', token, cookieOptions)
    
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token, 
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async(req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm       
    
    })

    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url);
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 200, res);

})

// exports.login = catchAsync( async (req, res, next) => {
//     // verify that the user exist
//     const user = await User.find({email: req.body.email});

//     if (!user) {
//         return  res.status(400).json({
//             status: 'failed',
//             message: 'invalid user email'
//         })
//     } 

//     // check if password is correct
//     const isPassword = await bcrypt.compare(req.body.password, user.password)

//     if (!isPassword) {
//         return  res.status(400).json({
//             status: 'failed',
//             message: 'invalid user password'
//         })
//     }

//     // verify that the session is still valid
//     const isValid =  jwt.verify(req.body.token, 'secret');
//     if(!isValid) {
//         return res.status(400).json({
//             status: 'failed',
//             message: 'invalid session'
//         })
//     }

//     res.status(200).json({
//         status: 'success',
//         message: 'user logged in'
//     })

// })

exports.login = catchAsync(async(req, res, next) => {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
       return next(new AppError('Invalid email or password', 400));
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({email}).select('+password');
    const match = await bcrypt.compare(password, user.password);
   

    // 3) If everything ok, send token to client
    // if (!user || !(await user.correctPassword(String(password), user[0]["password"]))) {
    //     return next(new AppError('invalid email or password', 401));
    // }

    if (!user || !match) {
        return next(new AppError('invalid email or password', 401));
    }

    createSendToken(user, 200, res);
})

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now + 10 * 1000),
        httpOnly: true 
    })

    res.status(200).json({ status: 'success'});
}

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check it's there
    console.log(req.headers);

    let token; 
    if ( req.headers.authorization && req.headers.authorization.startsWith('Bearer') ) {
        token = req.headers.authorization.slice(7);

    } else if (req.cookies.jwt) {
        token = req.cookies.jwt

    }

    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to access.', 404)
        )
    }
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
        return next(new AppError('user for this token no longer exist pls create a new user', 404));
    }
   
    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('password changed pls login again', 401))
    }

    // send user to the protected route
    req.user = currentUser; // This is used for passing varaibles from middleware to other controllers
    res.locals.user = currentUser; // This enables passing variables to the front end
    next()
   
})

// for rendering page, doesnt throw an error
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {       
            // 1) verify token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt, process.env.JWT_SECRET
            );

            // 2) Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            // 3) Check if user changed password after
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // There is a Logged in user
            res.locals.user = currentUser;
            next();
        } catch (err) {
            next()
        }

    } else {
        next();
    }
}

exports.restrictedTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('unauthorized account', 401));
        }
        next();
    }
}

exports.forgotPassword = catchAsync( async (req, res, next) => {
    // Find user with email
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
        return next(new AppError('no user with this email', 404));
    }

    // generate hash token
    const resetToken = user.createPasswordResetToken();
    
    await user.save({ validateBeforeSave: false });

    // send token to user's email
    const  resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
 
    try {  
        await new Email(user, resetURL).sendPasswordReset();
        
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
    
        return next(
            new AppError('There was an error sendig the email. Try again later!', 500)
        )
    }
    
})


exports.resetPassword = catchAsync( async (req, res, next) => {
    // 1) Get user based on the token
    // console.log(`request params is : ${JSON.stringify(req.params)}`);
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({ 
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, adn there is user, set the new password
    if ( !user ) {
        return next(new AppError('Token is invalid or has expired', 400))
    }

    user.passwordConfirm = req.body.confirmPassword;
    user.password = req.body.password;   
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    // 3) Update changedPasswordAt property for the user
    await user.save();

    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
})

// exports.updatePassword = catchAsync( async (req, res, next) => {
//     // 1) receive the password
//     const oldPassword = req.body.oldPassword;

//     const user = await User.findById(req.user._id).select("+password");
//     console.log(typeof user.password);
//     // 2) check if the user entered password is correct 
//     // we would need the token here to get the id and check if the user
//     // with that id matches that password not just checking if such password
//     // exist in the database
    
//     const match = await bcrypt.compare(oldPassword, req.user.password);
   
//     if (!match) {
//         return next( new AppError('incorrect password', 401));
//     }

//     // 3) change the password
//     // console.log(`req.body ${JSON.stringify(req.body)}`)
//     user.password = req.body.newPassword;
//     user.passwordConfirm = req.body.passwordConfirm;

//     console.log(`new password ${user.password}`)
//     await user.save();

//     // 4) log user in
//     res.status(200).json({ 
//         status: 'success',
//         user
//     })
// })


exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');
    console.log(user)
    console.log(req.body)
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong', 401));

    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();


    createSendToken(user, 200, res)
}) 

exports.testSession = async (req, res, next) => {
    const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
            price_data: {
                currency: 'usd',
                unit_amount: 100,
                product_data: {
                    description: 'Hello tour',
                    name: `Emeka Tour`,
                },  
            },

            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `http://localhost:3000/api/v1/emeka-stripe/success`,
        cancel_url: `http://localhost:3000/api/v1/emeka-stripe/cancel`,
      });
    
      res.redirect(303, session.url); 
}
