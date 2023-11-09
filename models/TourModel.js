const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./UserModel');

main().catch(err => console.log(err));


async function main() {
    // await mongoose.connect(myDB);
    await mongoose.connect('mongodb://127.0.0.1:27017/natours');
   
}

// learnt  set, validators
// toLearn trim in mongoose (to shorten a text but how can it know the length to stop)
// toLearn pipeline unshift method
const tourSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],      
      unique: true,
      trim: true,
      // validate: [validator.isAlpha, 'name must not contain numbers']
    },

    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },

    slug : String,

    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maxGroupSize']
    },

    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty']
    }, 

    ratingsAverage: {
      type: Number,
      min: [3, 'value cannot be less than ({min})'],
      set: value => Math.round(value * 10) / 10 ,
      required: [true, 'A tour must have a rating Average']
    },

    rating: {
      type: Number,
      default: 4.5
    },

    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },

    priceDiscount: {
      type: Number,
      validate: { //this is a validation method used to validate a condition 
        validator: function(value) { // this is the function that validate uses to check if a condition is true or throws and error if false. A function is used if a value is need to be passed
          return value < this.price;
       
        },
        message: function(props) { // this message value is returned if the validate resolves to false
          return  `discount value $${props.value} is greater than actual price $${this.price}` }
      }
    },
    
    summary: {
      type: String,
      trim: true, // removes the spaces at the beginning and the end (not inbetween) of a string
      required: [true, 'A tour must have a summary']
    },

    secretTour: {
      type: Boolean,
      default: false
    },

    description: {
      type: String,  // removes the spaces at the beginning and the end (not inbetween) of a string
      trim: true
    }, 

    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },

    images: [String], // a array of images whose values are reps as strings

    createAt: {
      type: Date,
      default: Date.now(), // this method returns a the date in milliseconds
      select:false
    },

    startDates: [Date], // array of dates
    
    startLocation: { // this uses a geo-partial method and are defined according to that specification in the docs
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },

    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],

    guides: [ // this is a data modelling method where we reference data you want to copy from a particulare model
      { // it is modelling becuase we can later specify the particular data we want to ignore or include
        type: mongoose.Schema.Types.ObjectId, //informing mongoose of  the data type
        ref: 'User' // the reference to the mongoose model we are copying from.
      }
    ]
    
}, {
    toJSON: { virtuals: true }, // lets us see virtual properties when we pass data as Json 
    toObject: { virtuals: true}  // lets us see virtual properties when we pass data as object 

})



// since searches are mostly done on this fields it is best they are indexed
// as this helps for better search optiomatization the number value shows the 
// sorting order
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// virtual property
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
})

// Document middleware
// pre save only works on the save and create method but not on insertMany(certain) and insert(maybe on this)
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
})



tourSchema.pre(/^find/, function(next) {
  this.populate({ // here we populate the guides removing the __v and -passwordChangedAt
    path: 'guides',
    select: '-__v -passwordChangedAt'
  })
  next();
})

// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// })

// tourSchema.pre('save', function(next) {
//   console.log(`tour is saving`);
//   next();
// })


// Query middleware
tourSchema.pre(/^find/, function(next) {
  this.find({secretTour: {$ne: true}});
  this.start = Date.now();
  next();
})

tourSchema.post(/^find/, function(doc, next) {
  this.end = Date.now() - this.start;
  console.log(`Query took ${this.end} in milliseconds`);
  next();
})

//Aggregration middleware
tourSchema.pre('aggregate', function(next) {
  this.pipeline().unshift({ $match: { secretTour: {$ne: true} } });
  console.log(this.pipeline());
  next();
})
  
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;