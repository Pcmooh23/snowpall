const multer = require('multer');
const multerGoogleStorage = require('multer-google-storage');
require('dotenv').config();
const path = require('path');


// Check the environment and configure multer accordingly
const storageEngine = process.env.NODE_ENV === 'production'
? multerGoogleStorage.storageEngine({
    bucket: 'snowpall-bucket',
    projectId: 'snowpall-map',
    keyFilename: '../service-account.json',
  })
: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
  });

const upload = multer({
  storage: storageEngine,
  limits: {
    fileSize: 1024 * 1024 * 5, // for 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only .jpeg or .png files are accepted'), false);
    }
  },
});

module.exports = upload;
