const Tour = require('../models/TourModel');
const { query } = require('express');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');
// import Tour from '../models/TourModel';


const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  const fileType = file.mimetype.split('/')[0];
  if (fileType !== 'image') {
    cb(new AppError('only images are allowed to be uploaded', 400), false)
  } 
  
  cb(null, true);
}

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 }
])

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    console.log(req.files);
    if (!req.files.imageCover || !req.files.images) return next();

    const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90})
        .toFile(`public/img/tours/${imageCoverFilename}`);

    // pass the image saved name as a property in  the req.body since 
    // we didnt use the req.files here
    req.body.imageCover = imageCoverFilename;

    // 2) Images
    req.body.images = [];

    await Promise.all(
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`)
                
            req.body.images.push(filename);
        })
    )
    next();
}) 


exports.aliasTopTours = (req, res, next) => {
    req.query.page = '1';
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
}


exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'review' });
exports.createTour = factory.createOne(Tour)
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: {$gte: 4.5} }
        }, 
        {
            $group: {
                _id: {$toUpper: '$difficulty'},
                numTours : { $sum: 1 },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price'}
            }
        },

        {
            $sort: {avgPrice: -1}
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats
        }
    });

})

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {    
    const year =  Number(req.params.year)
    const monthlyPlan = await Tour.aggregate([
        {
            $unwind: {path: '$startDates'}
        },

        {
            $match: {
                startDates: {                        
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)                        
                }

            }
        },

        {
            $group: {
                _id: { $month: '$startDates' },
                numOfTourStart: { $sum: 1 },
                tour: { $push: '$name' }
                
            }
        },

        {
            $sort: {
                numOfTourStart: -1
            }
        },

        {
            $addFields: {
                month: '$_id'
            }
        },

        {
            $unset: '_id'
        }, 

        {
            $limit: 12
        }

    ]);

    res.status(200).json({
        status: 'success',
        data: {
            monthlyPlan
        }
    });

})

exports.getToursWithin = async (req, res, next) => {
    let { distance, latlng, unit} = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit == 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        next(new AppError('Please provide latitude and longitude', 400))
    
    }

    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    })
}

exports.getDistances = catchAsync( async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.00621371 : 0.001
    if (!lat || !lng) {
       return next(new AppError('Please provide latitude in the format', 400))
    
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat *1]
                },
                spherical: true,

                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    })
})