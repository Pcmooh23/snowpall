const multer = require('multer');
const multerGoogleStorage = require('multer-google-storage');
require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

// Define the local upload directory relative to the current file
const localUploadDir = path.resolve(__dirname, '../uploads');

// Ensure the local uploads directory exists (sync function to be used on app startup)
const ensureLocalUploadDirExists = async () => {
  try {
    await fs.mkdir(localUploadDir, { recursive: true });
    console.log('Local upload directory ensured.');
  } catch (err) {
    if (err.code !== 'EXIST') {
      throw err; // Only throw the error if it's not about the directory already existing
    }
  }
};

// Call the directory check function immediately (or you can export and call it in server.js)
ensureLocalUploadDirExists();

// Set up multer storage
const storage = process.env.NODE_ENV === 'production'
  ? multerGoogleStorage.storageEngine({
      bucket: 'snowpall-bucket',
      projectId: 'snowpall-map',
      keyFilename: '../service-account.json',
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, localUploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, filename);
      },
    });

const upload = multer({ storage: storage });

module.exports = upload;
