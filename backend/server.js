const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fsPromises = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
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
const corsOptions = {
    origin: 'https://localhost:3000', // Allow only your frontend to make requests
    credentials: true, // Allow cookies to be sent and received
    methods: 'GET,POST,PUT,DELETE,OPTIONS', // Specify allowed methods
    allowedHeaders: 'Content-Type, Authorization', // Specify allowed headers
};

const app = express();

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

// Enable CORS for all routes
app.use(cors(corsOptions));
  
// middleware for cookies
app.use(cookieParser());

// Middleware to parse JSON body
app.use(express.json());

// a line that serves static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// The file that stores user info.
const USERS_FILE = path.join(__dirname, './usersDB.json');

// verify token middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader)  {
        const token = authHeader.split(' ')[1] // Extract the token from the Authorization header

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token is not valid or has expired' });
            }

            req.user = user; // Attach the user to the request for further use
            next();
        });
    } else {
        res.status(401).json({ error: 'Access token is missing' });
    }
}

// POST route for new users
app.post('/users', async (req, res) => {
    try {
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(data);

        if (users.some(user => user.userEmail === req.body.userEmail)) {
            return res.status(400).send('User already exists.');
        }

        const hashedPassword = await bcrypt.hash(req.body.userPassword, 10);

        const newUser = {
            id: uuidv4(),
            userName: req.body.userName,
            userEmail: req.body.userEmail,
            accountType: req.body.accountType,
            userNumber: req.body.userNumber,
            userStreet: req.body.userStreet,
            userUnit: req.body.userUnit,
            userCity: req.body.userCity,
            userState: req.body.userState,
            userZip: req.body.userZip,
            userPasswordHash: hashedPassword,
            userCart: [],
            userAddresses: [],
            userRequests: []
        };

        const tokenPayload = { id: newUser.id, userEmail: newUser.userEmail };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        newUser.refreshToken = refreshToken;

        users.push(newUser);

        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.status(201).json({ valid: true, message: 'User successfully created.', accessToken: accessToken, 
            user: {
                id: newUser.id,
                userName: newUser.userName,
                userEmail: newUser.userEmail,
                accountType: newUser.accountType,
                userNumber: newUser.userNumber,
                userStreet: newUser.userStreet,
                userUnit: newUser.userUnit,
                userCity: newUser.userCity,
                userState: newUser.userState,
                userZip: newUser.userZip,
                userCart: newUser.userCart,
                userAddresses: newUser.userAddresses,
                userRequests: newUser.userRequests
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
        const users = JSON.parse(await fsPromises.readFile(USERS_FILE, 'utf8'));
        const user = users.find(u => u.userEmail === userEmail);
        
        if (!user) {
            return res.status(404).send('Account not found.');
        }

        const isMatch = await bcrypt.compare(userPassword, user.userPasswordHash);
        if (!isMatch) {
            return res.status(401).send('Invalid password.');
        }

        // Passwords match, proceed with login
        const tokenPayload = { id: user.id, userEmail: user.userEmail };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        user.refreshToken = refreshToken;
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

        // Send refresh token as secure HttpOnly cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 7 * 24 * 60 * 60 * 1000 });

        // The JSON response body sent back to the client, including the accessToken
        res.status(200).json({ valid: true, message: 'Login successful.', userId: user.id, username: user.userName, accessToken: accessToken });

    } catch (err) {
        console.error("Error handling login:", err);
        res.status(500).send('An error occurred during login.');
    }
});

// POST route to logout current user
app.post('/logout', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // Use userId to identify the user more reliably

        // Read the current users data
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(data);

        // Find the user by ID instead of userEmail for consistency
        const user = users.find(user => user.id === userId);
        if (user) {
            user.refreshToken = null; // Invalidate the refresh token

            res.clearCookie('refreshToken'); // Clear the refreshToken cookie
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(204).send(); // Successfully processed the request but no content to return
        } else {
            res.status(404).send('User not found.'); // User not found
        }
    } catch (err) {
        console.error("Error during logout:", err);
        res.status(500).send('An error occurred processing the logout request.');
    }
});

// GET route for all services
app.get('/services', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // Extract userId from authData set by verifyToken
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);

        const user = users.find(user => user.id === userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }
    
        const userServices = user.userCart;

        res.json(userServices); // Send filtered services as JSON
    } catch (err) {
        console.error("Error reading services file:", err);
        res.status(500).send('An error occurred while fetching services.');
    }
});

// GET route for saved addresses
app.get('/addresses', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // Extract userId from the verified token
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);

        // Find the user by their ID
        const user = users.find(user => user.id === userId);
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

// Refresh token endpoint
app.post('/refresh-token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken; // Access the refresh token from cookies
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

    try {
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);

        // Find the user with the matching refresh token
        const user = users.find(user => user.refreshToken === refreshToken);
        if (!user) {
            return res.status(403).json({ error: 'No matching user for provided refresh token' });
        }

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err || user.id !== decoded.id) {
                return res.status(403).json({ error: 'Token verification failed', details: err.message });
            }

            // Generate a new access token
            const accessToken = jwt.sign(
                { id: user.id, userEmail: user.userEmail },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            res.json({
                message: 'Access token refreshed successfully',
                newAccessToken: accessToken
            });
        });
    } catch (error) {
        console.error("Error during token refresh:", error);
        res.status(500).json({ error: 'Failed to process token refresh', details: error.message });
    }
});

// POST endpoint for the requests
app.post('/submit-request', verifyToken, async (req, res) => {
    const { stripeToken, amount, cart, selectedAddress } = req.body;
    const userId = req.user.id; // Assuming verifyToken middleware correctly sets req.user

    try {
        // Create a charge: this will charge the user's card
        const charge = await stripe.charges.create({
            amount: amount,
            currency: "usd",
            source: stripeToken, // Use stripeToken here
            description: `Charge for order`,
        });

        // Construct charge information to save along with order details
        const chargeInfo = {
            id: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            description: charge.description,
            created: new Date(charge.created * 1000), // Convert to milliseconds
        };

        // Read user data from USERS_FILE
        const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(usersData);

        // Find the user by their ID
        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Construct the new request to add to the user's userRequests array
        const newRequest = {
            id: uuidv4(),
            orderDate: new Date(),
            cart: cart,
            selectedAddress: selectedAddress,
            charge: chargeInfo, // Include the charge details in the request
        };

        // Add the new request to the user's userRequests array
        users[userIndex].userRequests.push(newRequest);

        // Write the updated users data back to the USERS_FILE
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

        // Respond to the client that the charge was processed and the request was saved successfully
        res.status(200).json({
            success: true,
            message: "Charge processed and request saved successfully!",
            requestId: newRequest.id, // Return the request ID to the client
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
        body('userNumber').trim().optional().notEmpty().withMessage('Number can be empty but should be valid if provided'),
        body('userStreet').trim().notEmpty().withMessage('Street is required'),
        body('userUnit').trim().optional().notEmpty().withMessage('Unit can be empty but should be valid if provided'),
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
            const data = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(data);

            // Find the user by their ID
            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                return res.status(404).send({ message: 'User not found.' });
            }

            // New address entry
            const newAddress = {
                id: uuidv4(),
                userName: req.body.userName,
                userNumber: req.body.userNumber,
                userStreet: req.body.userStreet,
                userUnit: req.body.userUnit ? req.body.userUnit : '',
                userCity: req.body.userCity,
                userState: req.body.userState,
                userZip: req.body.userZip,
            };

            // Add the new address to the user's addresses array
            users[userIndex].userAddresses.push(newAddress);
            // Save the updated users back to the file
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            // Respond with the newly created address entry
            res.status(201).json({ message: 'New address added to user profile', newAddress });
        
        } catch (err) {
            console.error("Error accessing or modifying the users file:", err);
            res.status(500).send('An error occurred while processing your request.');
        }
    }
);

// POST route for car service
app.post('/car', verifyToken, upload.single('image'), 
    [
        body('checkedService').isBoolean().withMessage('Checked service must be a boolean value.'),
        body('makeAndModel').trim().isLength({ min: 1 }).withMessage('Make and model are required.'),
        body('color').trim().isLength({ min: 1 }).withMessage('Color is required.'),
        body('licensePlate').optional().trim(), // Optional field
        body('carMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('car').withMessage('ObjectType must be car.'),
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id; // Extract userId from the verified token
            const data = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(data);
            
            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                return res.status(404).json({ message: 'User not found.' });
            }
            
            // Create the new car service object
            const newCarService = {
                id: uuidv4(),
                checkedService: req.body.checkedService === 'true', // Convert string to boolean
                makeAndModel: req.body.makeAndModel,
                color: req.body.color,
                licensePlate: req.body.licensePlate || '', // Include license plate if provided
                carMessage: req.body.carMessage || '', // Include car message if provided
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null, // Include image path if file uploaded
            };
            
            users[userIndex].userCart.push(newCarService);
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(201).json({ message: 'New car service object added to the user cart.', newCarService });
       
        } catch (err) {
            console.error("Error handling car service submission:", err);
            res.status(500).send('Failed to process car service submission.');
        }
    }
); 

// POST route for driveway service
app.post('/driveway', verifyToken, upload.single('image'),
    [
        body('selectedSize').not().isEmpty().withMessage('Selected size is required'),
        body('objectType').equals('driveway').withMessage('ObjectType is driveway'),
        body('drivewayMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id; 
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const newDrivewayService = {
                id: uuidv4(),
                selectedSize: req.body.selectedSize,
                drivewayMessage: req.body.drivewayMessage || '',
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null,
            };

            users[userIndex].userCart.push(newDrivewayService);
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(201).json({ message: 'New driveway service object added to the user cart.', newDrivewayService });
      
        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// POST route for lawn service
app.post('/lawn', verifyToken, upload.single('image'), 
    [
        body('walkway').optional().isBoolean().withMessage('Walkway must be a boolean'),
        body('frontYard').optional().isBoolean().withMessage('Front yard must be a boolean'),
        body('backyard').optional().isBoolean().withMessage('Backyard must be a boolean'),
        body('lawnMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').optional().equals('lawn').withMessage('ObjectType is lawn'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const newLawnService = {
                id: uuidv4(),
                walkway: req.body.walkway === 'true',
                frontYard: req.body.frontYard === 'true',
                backyard: req.body.backyard === 'true', 
                lawnMessage: req.body.lawnMessage || '',
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null, 
            };

            users[userIndex].userCart.push(newLawnService);
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(201).json({ message: 'New lawn service object added to the user cart.', newLawnService });

        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// POST route for street service
app.post('/street', verifyToken, upload.single('image'), 
    [
        body('from').notEmpty().withMessage('From address is required'),
        body('to').optional().notEmpty().withMessage('Please include a to address'), // Make "to" optional but validate if provided
        body('streetMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('street').withMessage('ObjectType is street'),
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const newStreetService = {
                id: uuidv4(),
                userId: userId,
                from: req.body.from,
                to: req.body.to, // "to" field is optional
                streetMessage: req.body.streetMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null,
            };

            users[userIndex].userCart.push(newStreetService);
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(201).json({ message: 'New street service object added to the DB: ', newStreetService });

        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// POST route for other service
app.post('/other', verifyToken, upload.single('image'), 
    [
        body('selectedSize').notEmpty().withMessage('Selected size is required'),
        body('otherMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('other').withMessage('ObjectType is other'),
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const data = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(data);

            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex === -1) {
                return res.status(404).send('User not found.');
            }

            const newOtherService = {
                id: uuidv4(),
                userId: userId,
                selectedSize: req.body.selectedSize,
                otherMessage: req.body.otherMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null,
            };

            users[userIndex].userCart.push(newOtherService);
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(201).json({ message: 'New other service object added to the DB: ', newOtherService });

        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// PUT route to update an existing address
app.put('/address/:id', verifyToken, 
    [
    body('userName').trim().notEmpty().withMessage('User name is required'),
    body('userNumber').trim().notEmpty().withMessage('User number is required'),
    body('userStreet').trim().notEmpty().withMessage('Street is required'),
    body('userUnit').trim().optional().notEmpty().withMessage('Unit can be empty but should be valid if provided'),
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
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            // Find the user by their ID
            const user = users.find(u => u.id === userId);
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
                userName: req.body.userName,
                userNumber: req.body.userNumber,
                userStreet: req.body.userStreet,
                userUnit: req.body.userUnit || '',
                userCity: req.body.userCity,
                userState: req.body.userState,
                userZip: req.body.userZip,
            };
            user.userAddresses[addressIndex] = updatedAddress;

            // Write the updated users data back to the USERS_FILE
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            
            res.status(200).json({ message: 'Address updated successfully.', updatedAddress });
        } catch (err) {
            console.error("Error processing request:", err);
            res.status(500).send('An error occurred while processing your request.');
        }
    }
);

// PUT route to update an existing car service entry.
app.put('/car/:id', verifyToken, upload.single('image'),
    [
        body('checkedService').isBoolean().withMessage('Checked Service must be a boolean value.'),
        body('makeAndModel').not().isEmpty().trim().escape().withMessage('Make and Model is required.'),
        body('color').not().isEmpty().trim().escape().withMessage('Color is required.'),
        body('licensePlate').optional().trim().escape(), // Optional
        body('carMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').not().isEmpty().trim().escape().withMessage('ObjectType is car.'),
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id; // Assuming your verifyToken middleware sets req.user
            const carId = req.params.id; // The ID of the car service object to update
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            // Find the user by their ID
            const user = users.find(u => u.id === userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // Find the index of the car service object by its ID within the user's cart
            const carIndex = user.userCart.findIndex(car => car.id === carId);
            if (carIndex === -1) {
                return res.status(404).json({ message: 'Car service object not found.' });
            }

            // Update the car service object
            user.userCart[carIndex] = {
                ...user.userCart[carIndex],
                checkedService: req.body.checkedService,
                makeAndModel: req.body.makeAndModel,
                color: req.body.color,
                licensePlate: req.body.licensePlate || user.userCart[carIndex].licensePlate,
                carMessage: req.body.carMessage || user.userCart[carIndex].carMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : user.userCart[carIndex].imagePath,
            };

            // Write the updated users data back to the USERS_FILE
            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(200).json({ message: 'Car service object updated.', car: user.userCart[carIndex] });

        } catch (err) {
            console.error("Error updating car service object:", err);
            res.status(500).send('An error occurred while updating the car service object.');
        }
    }
);

// PUT route to update an existing driveway service entry
app.put('/driveway/:id', verifyToken, upload.single('image'), 
    [ 
        body('selectedSize').not().isEmpty().withMessage('Selected size is required'),
        body('objectType').equals('driveway').withMessage('ObjectType is driveway'),
        body('drivewayMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const drivewayId = req.params.id;
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            const user = users.find(u => u.id === userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const drivewayIndex = user.userCart.findIndex(car => driveway.id === drivewayId);
            if (drivewayIndex === -1) {
                return res.status(404).json({ message: 'Driveway service object not found.' });
            }

            user.userCart[drivewayIndex] = {
                ...user.userCart[drivewayIndex],
                selectedSize: req.body.selectedSize || user.userCart[drivewayIndex].selectedSize,
                drivewayMessage: req.body.drivewayMessage || user.userCart[drivewayIndex].drivewayMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : user.userCart[drivewayIndex].imagePath, 
            }

            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(200).json({ message: 'Driveway service object updated in the DB: ', driveway: user.userCart[drivewayIndex]});
        
        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// PUT route to update an existing lawn service entry
app.put('/lawn/:id', verifyToken, upload.single('image'), 
    [
        body('walkway').optional().isBoolean().withMessage('Walkway must be a boolean'),
        body('frontYard').optional().isBoolean().withMessage('Front yard must be a boolean'),
        body('backyard').optional().isBoolean().withMessage('Backyard must be a boolean'),
        body('lawnMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').optional().equals('lawn').withMessage('ObjectType is lawn'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const lawnId = req.params.id;
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            const user = users.find(u => u.id === userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const lawnIndex = user.userCart.findIndex(lawn => lawn.id === lawnId);
            if (lawnIndex === -1) {
                return res.status(404).json({ message: 'Lawn service object not found.' });
            }

            user.userCart[lawnIndex] = {
                ...user.userCart[lawnIndex],
                walkway: req.body.walkway !== undefined ? req.body.walkway : lawnService.walkway,
                frontYard: req.body.frontYard !== undefined ? req.body.frontYard : lawnService.frontYard,
                backyard: req.body.backyard !== undefined ? req.body.backyard : lawnService.backyard,
                lawnMessage: req.body.lawnMessage !== undefined ? req.body.lawnMessage : lawnService.lawnMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : user.userCart[lawnIndex].imagePath,
            };

            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(200).json({ message: 'Lawn service object updated.', lawn: user.userCart[lawnIndex] });

        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// PUT route to update an existing street service entry
app.put('/street/:id', verifyToken, upload.single('image'), 
    [
        body('from').notEmpty().withMessage('From address is required'),
        body('to').optional().notEmpty().withMessage('Please include a to address'),
        body('streetMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('street').withMessage('ObjectType is street'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const streetId = req.params.id;
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            const user = users.find(u => u.id === userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const streetIndex = user.userCart.findIndex(street => street.id === streetId);
            if (streetIndex === -1) {
                return res.status(404).json({ message: 'Street service object not found.' });
            }

            user.userCart[streetIndex] = {
                ...user.userCart[streetIndex],
                from: req.body.from,
                to: req.body.to || user.userCart[streetIndex].to, 
                streetMessage: req.body.streetMessage || user.userCart[streetIndex].streetMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : user.userCart[streetIndex].imagePath,
            }


            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(200).json({ message: 'Street service object updated in the DB: ', street: user.userCart[streetIndex] });

        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// PUT route to update an existing other service entry
app.put('/other/:id', verifyToken, upload.single('image'), 
    [
        body('selectedSize').notEmpty().withMessage('Selected size is required'),
        body('otherMessage').optional().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
        body('objectType').equals('other').withMessage('ObjectType is other'),
    ], 
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.user.id;
            const otherId = req.params.id;
            const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
            let users = JSON.parse(usersData);

            const user = users.find(u => u.id === userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const otherIndex = user.userCart.findIndex(other => other.id === otherId);
            if (otherIndex === -1) {
                return res.status(404).json({ message: 'Other service object not found.' });
            }

            user.userCart[otherIndex] = {
                ...user.userCart[otherIndex],
                selectedSize: req.body.selectedSize,
                otherMessage: req.body.otherMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : user.userCart[otherIndex].imagePath,
            }

            await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
            res.status(200).json({ message: 'Other service object updated in the DB: ', other: user.userCart[otherIndex] });

        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// DELETE route for other service object
app.delete('/address/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const addressId = req.params.id;
        const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(usersData);

        // Find the user by their ID
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find the index of the address in the user's address array
        const addressIndex = users[userIndex].userAddresses.findIndex(addr => addr.id === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        // Remove the address from the user's address array
        users[userIndex].userAddresses.splice(addressIndex, 1);

        // Write the updated users data back to the USERS_FILE
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        
        res.status(200).json({ message: 'Address deleted successfully.' });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred while processing your request.');
    }
});

// DELETE route for car service
app.delete('/car/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const carId = req.params.id; 
        const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(usersData);

        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const carIndex = users[userIndex].userCart.findIndex(car => car.id === carId);
        if (carIndex === -1) {
            return res.status(404).json({ message: 'Car service object not found.' });
        }

        users[userIndex].userCart.splice(carIndex, 1);
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        res.status(200).json({ message: 'Car service object deleted successfully.' });

    } catch (error) {
        console.error("Error processing the deletion request:", error);
        res.status(500).send('An error occurred while processing the deletion request.');
    }
});

// DELETE route for driveway service object
app.delete('/driveway/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const drivewayId = req.params.id;
        const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(usersData);
        
        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const drivewayIndex = users[userIndex].userCart.findIndex(driveway => driveway.id === drivewayId);
        if (drivewayIndex === -1) {
            return res.status(404).json({ message: 'Driveway service object not found.' });
        }

        users[userIndex].userCart.splice(drivewayIndex, 1);
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        res.status(200).json({ message: 'Driveway service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
});

// DELETE route for lawn service object
app.delete('/lawn/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const lawnId = req.params.id;
        const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(usersData);
        
        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const lawnIndex = users[userIndex].userCart.findIndex(lawn => lawn.id === lawnId);
        if (lawnIndex  === -1) {
            return res.status(404).json({ message: 'Lawn service object not found.' });
        }

        users[userIndex].userCart.splice(lawnIndex, 1);
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        res.status(200).json({ message: 'Lawn service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
});

// DELETE route for street service
app.delete('/street/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const streetId = req.params.id;
        const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(usersData);
        
        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }
  
        const streetIndex = users[userIndex].userCart.findIndex(street => street.id === streetId);
        if (streetIndex === -1) {
            return res.status(404).json({ message: 'Street service object not found.' });
        }

        users[userIndex].userCart.splice(streetIndex, 1);
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');        
        res.status(200).json({ message: 'Street service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
});

// DELETE route for other service object
app.delete('/other/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        const otherId = req.params.id;
        const usersData = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(usersData);
        
        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }
  
        const otherIndex = users[userIndex].userCart.findIndex(other => other.id === otherId);
        if (otherIndex === -1) {
            return res.status(404).json({ message: 'Other service object not found.' });
        }

        users[userIndex].userCart.splice(otherIndex, 1);
        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        res.status(200).json({ message: 'Other service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
});

// Start the server
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });

// Start the server
startHttpsServer();