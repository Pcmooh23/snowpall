const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
    mongoURI: `mongodb+srv://paulmooh:${process.env.MONGO_PASSWORD}@cluster0.1esujv8.mongodb.net/`,
    secretOrKey: "secret",
};