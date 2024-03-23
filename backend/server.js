const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const db = require("./keys").mongoURI
const { User } = require('./schemas');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { body } = require('express-validator');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const upload = require('./middleware/upload');
const verifyToken = require('./middleware/verifyToken');
const loadData = require('./middleware/loadData');
const { userRegistration, validateUser, logoutUser, deleteUser } = require('./users/signUp_login_delete');
const { postCarService, updateCarService, deleteCarService } = require('./services/CarService');
const { postDrivewayService, updateDrivewayService, deleteDrivewayService } = require('./services/DrivewayService');
const { postLawnService, updateLawnService, deleteLawnService } = require('./services/LawnService');
const { postStreetService, updateStreetService, deleteStreetService } = require('./services/StreetService');
const { postOtherService, updateOtherService, deleteOtherService } = require('./services/OtherService');
const getUserServices = require('./services/Services');
const { getAddresses, postAddress, updateAddress, deleteAddress } = require('./address/address');
const { getRequests, submitRequest, cancelRequest, completeRequest, startRequest, acceptRequest, } = require('./requests/requests');

const corsOptions = {
    origin: process.env.NODE_ENV !== 'production' ? 'https://localhost:3000' : ['https://snowpall.com', 'https://main--snowpall.netlify.app'],
    credentials: true, // Allow cookies to be sent and received
    methods: 'GET,POST,PUT,DELETE,OPTIONS', // Specify allowed methods
    allowedHeaders: 'Content-Type, Authorization', // Specify allowed headers
};

const app = express();
app.use(express.json()); // Middleware to parse JSON body
app.use(cookieParser()); // middleware for cookies
app.use(cors(corsOptions)); // Enable CORS for all routes

mongoose.connect(db);

app.use(loadData); // Then use it before routes.

// SSL certificate paths
async function loadCredentials() {
    const privateKeyPath = path.join(__dirname, '../localhost-key.pem');
    const certificatePath = path.join(__dirname, '../localhost.pem');
  
    try {
      const privateKey = await fsPromises.readFile(privateKeyPath, 'utf8');
      const certificate = await fsPromises.readFile(certificatePath, 'utf8');
      return { key: privateKey, cert: certificate };
    } catch (error) {
      console.error('Error loading credentials:', error);
      throw error; // Rethrow or handle as needed
    }
}

// Create HTTPS server
async function startHttpsServer() {
    try {
      const credentials = await loadCredentials();
      const httpsServer = https.createServer(credentials, app);
  
      const PORT = 3500; 
      httpsServer.listen(PORT, () => {
        console.log(`HTTPS Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start HTTPS server:', error);
    }
}

app.get('/services', verifyToken, getUserServices);

// Define a route for the root path
app.get('/', (req, res) => {
    res.send('Hello, world! The server is up and running.');
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

app.post('/registerUser', userRegistration);
app.post('/validateLogin', validateUser);
app.post('/logout', verifyToken, logoutUser);

app.put('/update-stripe-link', verifyToken, async (req, res) => {
    try {
        const snowtechId = req.user.id; // Access the authenticated user's ID
        const snowtech = await User.findById(snowtechId);

        if (!snowtech) {
            return res.status(404).send('Snowtech not found.');
        }

        if (!snowtech.stripeAccountId) {
            const connectedAccount = await stripe.accounts.create({
                type: 'express',
                country: 'US',
                email: snowtech.userEmail,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            snowtech.stripeAccountId = connectedAccount.id;
            await snowtech.save();
            if (snowtech.stripeAccountId) {
                console.log(snowtech)
            }
            console.log("Newly created account info for stripe for Jane: ",snowtech.stripeAccountId);
        }

        const accountLink = await stripe.accountLinks.create({
            account: snowtech.stripeAccountId,
            refresh_url: 'https://localhost:3000/onboarding',
            return_url: 'https://localhost:3000/snowtech',
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });
    } catch (err) {
        console.error("Error updating Stripe link:", err);
        res.status(500).send('An error occurred during Stripe link update.');
    }
});

app.get('/verify-stripe-onboarding', verifyToken, async (req, res) => {
    const snowtechId = req.user.id; 
    const snowtech = await User.findById(snowtechId);

    if (!snowtech || !snowtech.stripeAccountId) {
        return res.status(404).send('Snowtech or Stripe account not found.');
    }

    try {
        const account = await stripe.accounts.retrieve(snowtech.stripeAccountId);
        // Check for specific conditions that indicate completion
        const isOnboardingCompleted = account.capabilities.card_payments === 'active' && account.capabilities.transfers === 'active';

        res.json({ isOnboardingCompleted });
    } catch (err) {
        console.error("Error retrieving Stripe account:", err);
        res.status(500).send('Failed to retrieve Stripe account status.');
    }
});

// Refresh token endpoint
app.post('/refresh-token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken; // Access the refresh token from cookies
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

    try {
        const user = req.combinedUsers.find(user => user.refreshToken === refreshToken);

        if (!user) {
            return res.status(403).json({ error: 'No matching user for provided refresh token' });
        }

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err || user.id !== decoded.id) {
                return res.status(403).json({ error: 'Token verification failed', details: err.message });
            }

            // Generate a new access token
            const accessToken = jwt.sign({ id: user.id, userEmail: user.userEmail }, process.env.JWT_SECRET, { expiresIn: '15m' });

            res.json({ message: 'Access token refreshed successfully', newAccessToken: accessToken });
        });
    } catch (error) {
        console.error("Error during token refresh:", error);
        res.status(500).json({ error: 'Failed to process token refresh', details: error.message });
    }
});

app.get('/requestsLog', verifyToken, getRequests);
app.post('/submit-request', verifyToken, submitRequest);
app.put('/requests/:id/cancel', verifyToken, cancelRequest)
app.put('/requests/:id/complete', verifyToken, completeRequest);
app.put('/requests/:id/start', verifyToken, startRequest);
app.put('/requests/:id/accept', verifyToken, acceptRequest);

app.get('/addresses', verifyToken, getAddresses);
app.post('/address', verifyToken,
    [
        body('userName').trim().notEmpty().withMessage('User name is required'),
        body('userNumber').trim().optional({ checkFalsy: true }),
        body('userStreet').trim().notEmpty().withMessage('Street is required'),
        body('userUnit').trim().optional({ checkFalsy: true }),
        body('userCity').trim().notEmpty().withMessage('City is required'),
        body('userState').trim().notEmpty().withMessage('State is required'),
        body('userZip').trim().notEmpty().isPostalCode('any').withMessage('Valid ZIP/Postal code is required'),
    ],
postAddress);
app.put('/address/:id', verifyToken, 
    [
    body('userName').trim().notEmpty().withMessage('User name is required'),
    body('userNumber').trim().optional({ checkFalsy: true }),
    body('userStreet').trim().notEmpty().withMessage('Street is required'),
    body('userUnit').trim().optional({ checkFalsy: true }).notEmpty().withMessage('Unit can be empty but should be valid if provided'),
    body('userCity').trim().notEmpty().withMessage('City is required'),
    body('userState').trim().notEmpty().withMessage('State is required'),
    body('userZip').trim().notEmpty().isPostalCode('any').withMessage('Valid ZIP/Postal code is required'),
    ], 
updateAddress);
app.delete('/address/:id', verifyToken, deleteAddress);

app.post('/car', verifyToken, upload.single('image'), 
    [
        body('checkedService').isBoolean().withMessage('Checked service must be a boolean value.'),
        body('makeAndModel').trim().isLength({ min: 1 }).withMessage('Make and model are required.'),
        body('color').trim().isLength({ min: 1 }).withMessage('Color is required.'),
        body('licensePlate').optional({ checkFalsy: true }).trim(),
        body('carMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('objectType').equals('car').withMessage('ObjectType is car.'),
    ], 
postCarService);
app.put('/car/:id', verifyToken, upload.single('image'), 
    [
        body('checkedService').isBoolean().withMessage('Checked Service must be a boolean value.'),
        body('makeAndModel').not().isEmpty().trim().escape().withMessage('Make and Model is required.'),
        body('color').not().isEmpty().trim().escape().withMessage('Color is required.'),
        body('licensePlate').optional({ checkFalsy: true }).trim().escape(),
        body('carMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('car').withMessage('ObjectType is car.'),
    ],
updateCarService);
app.delete('/car/:id', verifyToken, deleteCarService);

app.post('/driveway', verifyToken, upload.single('image'),
    [
        body('selectedSize').not().isEmpty().withMessage('Selected size is required'),
        body('size1Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('size2Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('size3Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('size4Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('objectType').equals('driveway').withMessage('ObjectType is driveway'),
        body('drivewayMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
    ], 
postDrivewayService);
app.put('/driveway/:id', verifyToken, upload.single('image'), 
    [ 
        body('selectedSize').not().isEmpty().withMessage('Selected size is required'),
        body('size1Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('size2Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('size3Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('size4Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('objectType').equals('driveway').withMessage('ObjectType is driveway'),
        body('drivewayMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
    ],
updateDrivewayService);
app.delete('/driveway/:id', verifyToken, deleteDrivewayService);

app.post('/lawn', verifyToken, upload.single('image'), 
    [
        body('walkway').optional({ checkFalsy: true }).isBoolean().withMessage('Walkway must be a boolean'),
        body('frontYard').optional({ checkFalsy: true }).isBoolean().withMessage('Front yard must be a boolean'),
        body('backyard').optional({ checkFalsy: true }).isBoolean().withMessage('Backyard must be a boolean'),
        body('walkwayPrice').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('frontYardPrice').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('backyardPrice').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('lawnMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('lawn').withMessage('ObjectType is lawn'),
    ],
postLawnService);
app.put('/lawn/:id', verifyToken, upload.single('image'), 
    [
        body('walkway').optional({ checkFalsy: true }).isBoolean().withMessage('Walkway must be a boolean'),
        body('frontYard').optional({ checkFalsy: true }).isBoolean().withMessage('Front yard must be a boolean'),
        body('backyard').optional({ checkFalsy: true }).isBoolean().withMessage('Backyard must be a boolean'),
        body('lawnMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('lawn').withMessage('ObjectType is lawn'),
    ],
updateLawnService);
app.delete('/lawn/:id', verifyToken, deleteLawnService);

app.post('/street', verifyToken, upload.single('image'), 
    [
        body('from').notEmpty().withMessage('From address is required'),
        body('to').optional({ checkFalsy: true }).notEmpty().withMessage('Please include a to address'), // Make "to" optional but validate if provided
        body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('streetMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('street').withMessage('ObjectType is street'),
    ], 
postStreetService);
app.put('/street/:id', verifyToken, upload.single('image'), 
    [
        body('from').notEmpty().withMessage('From address is required'),
        body('to').optional({ checkFalsy: true }).notEmpty().withMessage('Please include a to address'),
        body('streetMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('street').withMessage('ObjectType is street'),
    ],
updateStreetService);
app.delete('/street/:id', verifyToken, deleteStreetService);

app.post('/other', verifyToken, upload.single('image'), 
    [
        body('selectedSize').notEmpty().withMessage('Selected size is required'),
        body('job1Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('job2Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('job3Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('job4Price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
        body('otherMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('other').withMessage('ObjectType is other'),
    ], 
postOtherService);
app.put('/other/:id', verifyToken, upload.single('image'), 
    [
        body('selectedSize').notEmpty().withMessage('Selected size is required'),
        body('otherMessage').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('other').withMessage('ObjectType is other'),
    ], 
updateOtherService);
app.delete('/other/:id', verifyToken, deleteOtherService);

// The "catchall" handler: for any request that doesn't match one above, send back the React index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start the server
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });

// Start the server
if (process.env.NODE_ENV !== 'production') {
    // Start HTTPS server for local development
    startHttpsServer();
 } else {
    // Start HTTP server for production environment on App Engine
    const PORT = process.env.PORT || 3500;
    app.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT}`);
    });
}