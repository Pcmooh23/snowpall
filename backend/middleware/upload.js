const multer = require('multer');
const upload = multer({
    dest: 'uploads/',
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
