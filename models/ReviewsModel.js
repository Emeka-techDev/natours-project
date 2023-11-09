const mongoose = require('mongoose');
const Tour = require('./TourModel');
const User = require('./UserModel')

const ReviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'review must have a comment']
    },

    rating: {
        type: Number,
        min: [1, 'must be above 1'],
        max: [5, 'must not be above 5'],
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now()
    }, 

    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: [true, 'review must belong to a tour']
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'review must belong to a user']
    }

}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true}
})

ReviewSchema.statics.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: {tour: tourId}
        },  
        {
            $group: {
                _id: '$tour',
                nRating: {$sum: 1},
                avgRating: {$avg: '$rating'}  
            }
        }
    ]);

    if (stats.length > 0) {   
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage : stats[0].avgRating
        })
    
    } else {
        
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage : 4.5
        })   
    }
    
}

ReviewSchema.index({tour: 1, user: 1}, {unique: true});

ReviewSchema.post('save', function( _, next) {
    // this points to current review
    this.constructor.calcAverageRatings(this.tour)
    next();
})

ReviewSchema.pre(/^findOneAnd/, async function(next) {
    this.r = await this.findOne();
    next();
})

ReviewSchema.post(/^findOneAnd/, async function(){
    // await this.findOne() does not work here, because the query has already ran
    await this.r.constructor.calcAverageRatings(this.r.tour);
})

ReviewSchema.pre(/find/, function(next) {
    this.populate({
        path: 'tour',
        select: 'name'
    
    }).populate({
        path: 'user',
        select: 'name photo'
    })

    next();
})

const Review = mongoose.model('Review', ReviewSchema)

module.exports = Review;