const User = require('../models/UserModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

// const multerStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'public/img/users')
//   },

//   filename: function (req, file, cb) {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`)
//   }
// })


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

exports.uploadUserPhoto = upload.single('photo');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) newObj[key] = obj[key]
  })

  return newObj;
}

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
  
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!'
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!'
  });
};

// exports.updateMe = catchAsync ( async (req, res, next) => {
//   if (req.body.password || req.body.confirmPassword) {
//     return next(new AppError('this route is not for update password. \n pls visit /updatePassword route', 401))
//   }
//   const notAllowedFields = ['admin', 'lead-guide', 'guide']
//   let selectedFields = {};

//   notAllowedFields.forEach(el => {
//     if (req.body.role == el) selectedFields.roles = 'user';

//     selectedFields[el] = el;

//   })

//   const updateUser = await req.user.findByIdAndUpdate(req.user.id, selectedFields, { runValidators: true })

//   res.status(200).json({
//     status: 'success',
//     data: {
//       updateUser  
//     }
//   })

// })

exports.updateMe = catchAsync (async (req, res, next) => {
  console.log(`${JSON.stringify(req.file)}\n ${JSON.stringify(req.body)}`);

  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please us /updatePassword',
        400
      )
    )
  }

  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
   
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  })
  
  res.status(200).json({
    status: 'success',
    data : {
      user : updatedUser
    }
  })
})

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next()
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90})
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do not update password here
exports.updateUser = factory.updateOne(User);
exports.deleteMe = factory.deleteOne(User)

exports.isActive = catchAsync ( async (req, res, next) => {
  const users = await User.find({active : {$ne: false}}).select('+active')
 
})
