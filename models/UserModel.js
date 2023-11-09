const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
// const { isEmail } = validator;

// ?? how do we let anyone who want to create an a user account put in their role
// what if a normal user fills in as an admin

const userSchema = new mongoose.Schema({
    name: String,

    email:  {
        type: String,
        unique: true,
        validator: [validator.isEmail, 'input a validate mail'], // a validator method that checks if the email syntax is a valid one
        required: true
    },
    
    photo: {
        type: String, 
        default: 'default.jpg'
    },

    role: {
        type: String,
        // enum: ['user', 'guide', 'lead-guide', 'admin']
        enum: {
            values: ['user', 'guide', 'lead-guide', 'admin'],
            message: '{VALUE} is not a valid input'
        },
        default: 'user'
    },

    password: {
        type: String,
        required: [true, 'user must have a password'],
        minLength: [8, 'password length must be more than 8'],
        select: false
    },

    passwordConfirm: {
        type: String,
        minLength: [8, 'password length must be more than 8'],

        // works with save method
        validate: { // to validate that password is same with confirm password
            validator : function(value) {
                return this.password == value
            },
            message: 'confirmation password must match initial password'
        },
        required: true
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    active: {
        type: Boolean,
        default: true,
        select: false
    }
}) 

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next() ;
    
    this.password = await bcrypt.hash(this.password, 2)
    this.passwordConfirm = undefined;
    next();
})

userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
    
    // why did we substract 1000 millseconds here?, i know its because of 
    // a delay in the mongoose on doing a particular thing, but i cant tell
    // what it is right now.
    this.passwordChangedAt = Date.now() - 1000;
    next();
})

// Query middleware
userSchema.pre(/^find/, function(next) {
    this.find({active : {$ne : false }});
    next();
    
})

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);

}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    console.log(this.passwordChangedAt, new Date(JWTTimestamp * 1000));
    
    if (this.passwordChangedAt) {
        const changedTime = Number(this.passwordChangedAt.getTime()/1000)
        // console.log((this.passwordChangedAt.getTime())/1000, JWTTimestamp);
        return JWTTimestamp < changedTime;
    }

    return false;
}

userSchema.methods.createPasswordResetToken = function() {
    // generate random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // encrypt token incase of database hack 
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')
    
    console.log({resetToken}, this.passwordResetToken);
   
    // get the current date in milliseconds and add 10 mins to it (we have to convert it)
    this.passwordResetExpires =  Date.now() +  10 * 60 * 1000;
   
    return resetToken;

}

const User = mongoose.model('User', userSchema);

module.exports = User;