const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const db = require("./keys").mongoURI
const { User, Customer, Snowtech, Request, ActiveRequest, CompletedRequest } = require('./schemas');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const upload = require('./middleware/upload');
const verifyToken = require('./middleware/verifyToken');
const loadData = require('./middleware/loadData');
const { postCarService, updateCarService, deleteCarService } = require('./services/CarService');
const { postDrivewayService, updateDrivewayService, deleteDrivewayService } = require('./services/DrivewayService');
const { postLawnService, updateLawnService, deleteLawnService } = require('./services/LawnService');
const { postStreetService, updateStreetService, deleteStreetService } = require('./services/StreetService');
const { postOtherService, updateOtherService, deleteOtherService } = require('./services/OtherService');
const getUserServices = require('./services/Services');

const corsOptions = {
    origin: 'https://localhost:3000', // Allow only your frontend to make requests
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
  
      const PORT = 3500; // Default port for HTTPS is 443, but you can choose another port
      httpsServer.listen(PORT, () => {
        console.log(`HTTPS Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start HTTPS server:', error);
    }
}

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// a line that serves static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// The file that stores user info.
const DB_FILE = path.join(__dirname, './DB.json');

app.put('/update-stripe-link', verifyToken, async (req, res) => {
    try {
        const snowtechId = req.user.id; // Access the authenticated user's ID
        const snowtech = req.db.snowtechs.find(user => user.id === snowtechId);

        if (!snowtech) {
            return res.status(404).send('Snowtech not found.');
        }

        let updateNeeded = false;

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
            // Update the snowtech with the new Stripe account ID
            snowtech.stripeAccountId = connectedAccount.id;
            updateNeeded = true;
        }

        // If an update to the snowtech profile was made, save the changes to the database file
        if (updateNeeded) {
            await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2));
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

// POST route for new users
app.post('/registerUser', async (req, res) => {
    try {
        const { userName, userEmail, accountType, userPassword, userNumber, userStreet, userUnit, userCity, userState, userZip } = req.body;

        // Check if user already exists in the database
        const existingUser = await User.findOne({ userEmail: userEmail });
        if (existingUser) {
            return res.status(400).send('User already exists.');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(userPassword, 10);

        // Create a new user object with the hashed password
        const baseUserData = {
            userName,
            userEmail,
            accountType,
            userNumber,
            userStreet,
            userUnit,
            userCity,
            userState,
            userZip,
            userPasswordHash: hashedPassword,
        };

        let newUser;
        if (accountType === 'customer') {
            newUser = new Customer(baseUserData);
        } else if (accountType === 'snowtech') {
            // If accountType is snowtech, create a Snowtech document
            newUser = new Snowtech(baseUserData);
        } else {
            // Handle other account types or throw an error
            return res.status(400).send('Invalid account type.');
        }

        // Save the new user to DB to get an _id.
        await newUser.save();

        // Create JWT tokens
        const tokenPayload = { id: newUser._id, userEmail: newUser.userEmail };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
        
        newUser.refreshToken = refreshToken; // Save the refresh token with the user
        await newUser.save(); // Ensure refreshToken is saved

        // Set the refreshToken in a cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 7 * 24 * 60 * 60 * 1000 });

        // Send back a response
        res.status(201).json({
            valid: true,
            message: 'User successfully created.',
            accessToken: accessToken,
            user: {
                id: newUser._id,
                userName: newUser.userName,
                userEmail: newUser.userEmail,
                accountType: newUser.accountType,
                userNumber: newUser.userNumber,
                userStreet: newUser.userStreet,
                userUnit: newUser.userUnit,
                userCity: newUser.userCity,
                userState: newUser.userState,
                userZip: newUser.userZip
            }
        });
    } catch (err) {
        console.error("Error processing request:", err);
        res.status(500).send('An error occurred during account creation.');
    }
});

// POST route to validate the user
app.post('/validateLogin', async (req, res) => {
    const { userEmail, userPassword } = req.body;
    try {

        const [customer, snowtech] = await Promise.all([
            Customer.findOne({ userEmail }),
            Snowtech.findOne({ userEmail })
        ]);

        // Check which one returned a user
        const user = customer || snowtech;

        if (!user) {
            return res.status(404).send('Account not found.');
        }

        const isMatch = await bcrypt.compare(userPassword, user.userPasswordHash);
        if (!isMatch) {
            return res.status(401).send('Invalid password.');
        }

        // Passwords match, proceed with login
        const tokenPayload = { id: user._id, userEmail: user.userEmail };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        user.refreshToken = refreshToken;
        await user.save();

        // Send refresh token as secure HttpOnly cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 7 * 24 * 60 * 60 * 1000 });

        // The JSON response body sent back to the client, including the accessToken
        res.status(200).json({ 
            valid: true, 
            message: 'Login successful.', 
            userId: user._id, 
            username: user.userName, 
            accountType: user.accountType, 
            userZip: user.userZip,
            accessToken: accessToken
     
        });

    } catch (err) {
        console.error("Error handling login:", err);
        res.status(500).send('An error occurred during login.');
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

// POST route to logout current user
app.post('/logout', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const user = req.combinedUsers.find(user => user.id === userId);

        if (user) {
            user.refreshToken = null; // Invalidate the refresh token

            res.clearCookie('refreshToken'); // Clear the refreshToken cookie
            await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2), 'utf8');
            res.status(204).send(); // Successfully processed the request but no content to return
        } else {
            res.status(404).send('User not found.'); // User not found
        }
    } catch (err) {
        console.error("Error during logout:", err);
        res.status(500).send('An error occurred processing the logout request.');
    }
});

app.get('/verify-stripe-onboarding', verifyToken, async (req, res) => {
    const snowtechId = req.user.id; 
    const snowtech = req.db.snowtechs.find(user => user.id === snowtechId);

    if (!snowtech || !snowtech.stripeAccountId) {
        return res.status(404).send('Snowtech or Stripe account not found.');
    }

    try {
        const account = await stripe.accounts.retrieve(snowtech.stripeAccountId);
        // Check for specific conditions that indicate completion
        const isOnboardingCompleted = account.capabilities.card_payments === 'active' &&
                                      account.capabilities.transfers === 'active';

        res.json({ isOnboardingCompleted });
    } catch (err) {
        console.error("Error retrieving Stripe account:", err);
        res.status(500).send('Failed to retrieve Stripe account status.');
    }
});

// Get route for all active requests
app.get('/requestsLog', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // Assuming snowtechUsers is an array of user objects
        const user = req.snowtechUsers.find(user => user.id === userId);
 
        if (!user) {
            return res.status(404).send('User not found.');
        }
 
        // Since req.db.requests.active is an array, we need to map over it
        const activeRequests = req.db.requests.active.map(request => ({
            id: request.id,
            orderDate: request.orderDate,
            cart: request.cart,
            address: {
                userName: request.selectedAddress.userName,
                userStreet: request.selectedAddress.userStreet,
                userCity: request.selectedAddress.userCity,
                userState: request.selectedAddress.userState,
                userZip: request.selectedAddress.userZip,
            },
            charge: {
                id: request.charge.id,
                amount: request.charge.amount,
            },
            stages: request.stages
        }));
        // Sending the array of transformed active requests back to the client
        res.json({ activeRequests });
    } catch (error) {
        console.error("Error reading active requests data:", error);
        res.status(500).send('An error occurred while fetching active requests.');
    }
 });

// GET route for saved addresses
app.get('/addresses', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // Extract userId from the verified token
        const user = req.combinedUsers.find(user => user.id === userId);

        if (!user) {
            return res.status(404).send('User not found.');
        }

        // Retrieve the user's addresses
        const userAddresses = user.userAddresses;

        res.json(userAddresses);
    } catch (err) {
        console.error("Error reading users file:", err);
        res.status(500).send('An error occurred while fetching addresses.');
    }
});

app.get('/services', verifyToken, getUserServices);

// POST endpoint for the requests
app.post('/submit-request', verifyToken, async (req, res) => {
    const { stripeToken, amount, cart, selectedAddress } = req.body;
    const userId = req.user.id; // Assuming verifyToken middleware correctly sets req.user

    try {
        // Create a charge: this will charge the user's card
        const charge = await stripe.charges.create({
            amount: amount,
            currency: "usd",
            source: stripeToken, 
            description: "Charge for service",
            transfer_data: {},
        });

        // Construct charge information to save along with order details
        const chargeInfo = {
            id: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            description: charge.description,
            created: new Date(charge.created * 1000), // Convert to milliseconds
        };

        // Find the user by their ID
        const user = req.customerUsers.find(user => user.id === userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Construct the new request to add to the user's userRequests array
        const newRequest = {
            id: uuidv4(),
            orderDate: new Date(),
            cart: cart,
            selectedAddress: selectedAddress,
            charge: chargeInfo, // Include the charge details in the request
            stages: {
                live: true,
                accepted: false,
                started: false,
                complete: false,
            }
        };

        // Add the new request to the user's userRequests array and the active requests array.
        user.userRequests.push(newRequest);
        req.db.requests.active.push(newRequest);
        user.userCart = [];

        // Write the updated users data back to the DB_FILE
        await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2));

        // Respond to the client that the charge was processed and the request was saved successfully
        res.status(200).json({
            success: true,
            message: "Charge processed and request saved successfully!",
            requestId: newRequest.id // Return the request ID to the client.
        });        
    } catch (error) {
        console.error("Charge failed or saving failed:", error);
        res.status(500).json({ success: false, message: "Charge failed or saving failed", error: error.message });
    }
});

// POST route for new address
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
    async (req, res) => {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id; // Extract userId from the verified token
            
            // Find the user by their ID using Mongoose's findOne method
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).send({ message: 'User not found.' });
            }

            // New address entry
            const newAddress = {
                name: req.body.userName,
                number: req.body.userNumber,
                unit: req.body.userUnit ? req.body.userUnit : '',
                street: req.body.userStreet,
                city: req.body.userCity,
                state: req.body.userState,
                zip: req.body.userZip,
            };

            // Add the new address to the user's addresses array
            user.userAddresses.push(newAddress);
            await user.save();

            res.status(201).json({ message: 'New address added to user profile', newAddress });
        
        } catch (err) {
            console.error("Error accessing or modifying the users file:", err);
            res.status(500).send('An error occurred while processing your request.');
        }
    }
);

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

app.put('/requests/:id/cancel', verifyToken, async (req, res) => {
        try {
            const requestId = req.params.id; 
            const { customerId } = req.body; 
           
            const customer = req.customerUsers.find(user => user.id === customerId); 
            if (!customer) {
                return res.status(404).send('Customer not found.');
            }

            const customerRequest = customer.userRequests.find(request => request.id === requestId)
            if (!customerRequest) {
                return res.status(404).send('Request not found.');
            }

            const request = req.activeRequests.find(request => request.id === requestId);
            if (!request) {
            return res.status(404).send('Request not found.');
            }

            const notificationMessage = `Snowtech cancelled request with ID ${requestId}.`;
            request.stages.accepted = false;
            customerRequest.stages.accepted = false;
            customer.userNotifications.push({
                id: uuidv4(),
                message: notificationMessage,
                date: new Date(),
                read: false
            });
            
        await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2), 'utf8');
        res.status(200).json({ message: 'Request cancelled and customer notified.', request: customerRequest });
        } catch (error) {
            console.error("Error updating request object:", error);
            res.status(500).send('An error occurred while updating a request object.');
        }
    }
)

app.put('/requests/:id/complete', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { customerId, snowtechId } = req.body;

        const customer = req.customerUsers.find(user => user.id === customerId);
        if (!customer) {
            return res.status(404).send('Customer not found.');
        }

        const snowtech = req.snowtechUsers.find(tech => tech.id === snowtechId);
        if (!snowtech) {
            return res.status(404).send('Snowtech not found.');
        }

        const customerRequest = customer.userRequests.find(request => request.id === requestId);
        if (!customerRequest) {
            return res.status(404).send('Request not found.');
        }

        const request = req.activeRequests.find(request => request.id === requestId);
        if (!request) {
            return res.status(404).send('Request not found.');
        }

        // Assuming `request.charge.amount` contains the total charge amount in cents
        const totalAmount = request.charge.amount;
        const snowtechPayoutAmount = Math.round(totalAmount * 0.8); // 80% to snowtech

        // Create a transfer to the connected snowtech's Stripe account
        const transfer = await stripe.transfers.create({
            amount: snowtechPayoutAmount,
            currency: 'usd',
            destination: snowtech.stripeAccountId, 
            transfer_group: requestId,
        });

        // Update the job status to complete
        request.stages.live = false;
        request.stages.complete = true;
        customerRequest.stages.live = false;
        customerRequest.stages.complete = true;
        snowtech.completedRequests.push(request);
        req.db.requests.completed.push(request);
        req.db.requests.active = req.db.requests.active.filter(removeRequest => removeRequest.id !== requestId);

        // Notify the customer
        const notificationMessage = `Your request with ID ${requestId} has been completed.`;
        customer.userNotifications.push({
            id: uuidv4(),
            message: notificationMessage,
            date: new Date(),
            read: false
        });

        // Save changes to the database
        await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2), 'utf8');

        // Respond to the client
        res.status(200).json({
            message: 'Request complete, customer notified, and payout processed.',
            request: customerRequest,
            transfer: transfer,
        });
    } catch (error) {
        console.error("Error during job completion and payout:", error);
        res.status(500).send('An error occurred during job completion and payout.');
    }
});

app.put('/requests/:id/start', verifyToken, async (req, res) => {
        try {
            const requestId = req.params.id; // Capture the request ID from the URL
            const { customerId } = req.body; // Extract customerId from the request body
           
            const customer = req.customerUsers.find(user => user.id === customerId); 
            if (!customer) {
                return res.status(404).send('Customer not found.');
            }

            const customerRequest = customer.userRequests.find(request => request.id === requestId)
            if (!customerRequest) {
                return res.status(404).send('Request not found.');
            }

            const request = req.activeRequests.find(request => request.id === requestId);
            if (!request) {
            return res.status(404).send('Request not found.');
            }

            const notificationMessage = `Your request with ID ${requestId} has been started.`;
            request.stages.started = true;
            customerRequest.stages.started = true;
            customer.userNotifications.push({
                id: uuidv4(),
                message: notificationMessage,
                date: new Date(),
                read: false
            });
            
        await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2), 'utf8');
        res.status(200).json({ message: 'Request started and customer notified.', request: customerRequest });
        } catch (error) {
            console.error("Error updating request object:", error);
            res.status(500).send('An error occurred while updating a request object.');
        }
    }
)

app.put('/requests/:id/accept', verifyToken, async (req, res) => {
        try {
            const requestId = req.params.id; // Capture the request ID from the URL
            const { customerId } = req.body; // Extract customerId from the request body
           
            const customer = req.customerUsers.find(user => user.id === customerId); 
            if (!customer) {
                return res.status(404).send('Customer not found.');
            }

            const customerRequest = customer.userRequests.find(request => request.id === requestId)
            if (!customerRequest) {
                return res.status(404).send('Request not found.');
            }

            if (customerRequest.stages.accepted) {
            return res.status(409).send('Request has already been accepted.');
            }

            const request = req.activeRequests.find(request => request.id === requestId);
            if (!request) {
            return res.status(404).send('Request not found.');
            }

            const notificationMessage = `Your request with ID ${requestId} has been accepted.`;
            request.stages.accepted = true;
            customerRequest.stages.accepted = true;
            customer.userNotifications.push({
                id: uuidv4(),
                message: notificationMessage,
                date: new Date(),
                read: false
            });
            
        await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2), 'utf8');
        res.status(200).json({ message: 'Request accepted and customer notified.', request: customerRequest });
        } catch (error) {
            console.error("Error updating request object:", error);
            res.status(500).send('An error occurred while updating a request object.');
        }
    }
)

// PUT route to update an existing address
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
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id; // Make sure verifyToken sets req.user
            const addressId = req.params.id;

            // Find the user by their ID
            const user = req.combinedUsers.find(u => u.id === userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // Find the address by its ID within the user's address array
            const addressIndex = user.userAddresses.findIndex(addr => addr.id === addressId);
            if (addressIndex === -1) {
                return res.status(404).json({ message: 'Address not found.' });
            }

            // Update the address
            const updatedAddress = {
                ...user.userAddresses[addressIndex],
                userId: userId,
                userName: req.body.userName,
                userNumber: req.body.userNumber,
                userStreet: req.body.userStreet,
                userUnit: req.body.userUnit || '',
                userCity: req.body.userCity,
                userState: req.body.userState,
                userZip: req.body.userZip,
            };
            user.userAddresses[addressIndex] = updatedAddress;

            // Write the updated users data back to the DB_FILE
            await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2), 'utf8');
            
            res.status(200).json({ message: 'Address updated successfully.', updatedAddress });
        } catch (err) {
            console.error("Error processing request:", err);
            res.status(500).send('An error occurred while processing your request.');
        }
    }
);

// DELETE route for other service object
app.delete('/address/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const addressId = req.params.id;
        const user = req.combinedUsers.find(u => u.id === userId); // Find the user by their ID
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find the index of the address in the user's address array
        const addressIndex = user.userAddresses.findIndex(addr => addr.id === addressId);
        if ( addressIndex === -1) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        // Remove the address from the user's address array
        user.userAddresses.splice(addressIndex, 1);

        // Write the updated users data back to the DB_FILE
        await fsPromises.writeFile(DB_FILE, JSON.stringify(req.db, null, 2), 'utf8');
        
        res.status(200).json({ message: 'Address deleted successfully.' });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred while processing your request.');
    }
});

// Start the server
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });

// Start the server
startHttpsServer();