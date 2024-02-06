const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fs = require('fs')
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
    origin: 'http://localhost:3000', // Allow only your frontend to make requests
    credentials: true, // Allow cookies to be sent and received
    methods: 'GET,POST,PUT,DELETE,OPTIONS', // Specify allowed methods
    allowedHeaders: 'Content-Type,Authorization', // Specify allowed headers
};

const app = express();
const port = 3500;

// SSL certificate paths
const privateKey = fs.readFileSync(path.join(__dirname, '../localhost-key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, '../localhost.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Create HTTPS server
const httpsServer = https.createServer(credentials, app);

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

// Middleware for verifying user's token
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
            if (err) {
                return res.sendStatus(403); // Forbidden
            } else {
                req.authData = authData; // authData includes the decoded JWT payload
                next();
            }
        });
    } else {
        res.sendStatus(401); // Unauthorized
    }
};

// The file that stores user info.
const USERS_FILE = path.join(__dirname, './usersDB.json');

// The file service data of what users want done.
const CART_FILE = path.join(__dirname, './cartDB.json');

// The file that stores user address data.
const ADDRESS_FILE = path.join(__dirname, './addressDB.json')

// The file that stores user's order requests.
const ORDER_REQUEST_FILE = path.join(__dirname, './requestsDB.json')

// GET route for all services
app.get('/services', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id; // Extract userId from authData set by verifyToken
        const data = await fsPromises.readFile(CART_FILE, 'utf8');
        const services = JSON.parse(data);

        // Filter services to return only those belonging to the authenticated user
        const userServices = services.filter(service => service.userId === userId);

        res.json(userServices); // Send filtered services as JSON
    } catch (err) {
        console.error("Error reading services file:", err);
        res.status(500).send('An error occurred while fetching services.');
    }
});

// GET route for saved addresses
app.get('/addresses', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id;
        const data = await fsPromises.readFile(ADDRESS_FILE, 'utf8');
        const addresses = JSON.parse(data);

        const userAddresses = addresses.filter(address => address.userId === userId);

        res.json(userAddresses);
    } catch (err) {
        console.error("Error reading addresses file:", err);
        res.status(500).send('An error occurred while fetching addresses.');
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

        // Send refreshToken as a secure HttpOnly cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 7 * 24 * 60 * 60 * 1000 });

        // The JSON response body sent back to the client.
        res.json({ valid: true, message: 'Login successful.', accessToken, userId: user.id });

    } catch (err) {
        console.error("Error handling login:", err);
        res.status(500).send('An error occurred during login.');
    }
});

// POST route for new users
app.post('/users', async (req, res) => {
    try {
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        let users = JSON.parse(data);

        // Check if user already exists to prevent duplicate registrations
        if (users.some(user => user.userEmail === req.body.userEmail)) {
            return res.status(400).send('User already exists.');
        }

        const hashedPassword = await bcrypt.hash(req.body.userPassword, 10);

        // Create new user entry
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
        };

        // Add new user to the database
        users.push(newUser);

        // Generate tokens
        const tokenPayload = { id: newUser.id, userEmail: newUser.userEmail };
        const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        // Ideally, save the refresh token in a secure way (e.g., in a database) associated with the user
        // For simplicity, this example just updates the in-memory object
        newUser.refreshToken = refreshToken;

        await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');

        // Send refreshToken as a secure HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, 
            secure: true, // set to false if not using https
            sameSite: 'None', // 'Strict' or 'Lax' if not cross-site
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Send accessToken in response body
        res.status(201).json({
            valid: true,
            message: 'User successfully created.',
            accessToken: accessToken, // Consider omitting if you want to enforce a login after registration
            userId: newUser.id
        });
    } catch (err) {
        console.error("Error processing request:", err);
        res.status(500).send('An error occurred during account creation.');
    }
});

// POST route to logout current user
app.post('/logout', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id; // Use userId to identify the user more reliably

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

// Refresh token endpoint
app.post('/refresh-token', async (req, res) => {
    const refreshToken = req.cookies['refreshToken']; // Access the refresh token from cookies
    if (!refreshToken) return res.sendStatus(401); // Unauthorized if no refresh token is provided

    try {
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);

        // Find the user with the matching refresh token
        const user = users.find(user => user.refreshToken === refreshToken);
        if (!user) return res.sendStatus(403); // Forbidden if no matching user or refresh token is found

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err || user.id !== decoded.id) return res.sendStatus(403); // Forbidden if token is invalid or user ID mismatch

            // Generate a new access token
            const accessToken = jwt.sign({ id: user.id, userEmail: user.userEmail }, process.env.JWT_SECRET, { expiresIn: '15m' });

            res.json({ accessToken }); // Send the new access token back to the client
        });
    } catch (error) {
        console.error("Error during token refresh:", error);
        res.status(500).send('Failed to process token refresh.');
    }
});

// POST endpoint for the requests
app.post('/submit-request', verifyToken, async (req, res) => {
    const { stripeToken, amount, cart, selectedAddress } = req.body;
    const userId = req.authData.id; // Extract userId from authenticated token

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

        // Assume ORDER_REQUEST_FILE contains JSON array of orders
        const data = await fsPromises.readFile(ORDER_REQUEST_FILE, 'utf8');
        const orders = data ? JSON.parse(data) : [];

        // Append the new order with charge details, including userId for user-specific data handling
        const newOrder = {
            id: uuidv4(),
            userId: userId, // Associate order with the user
            orderDate: new Date(),
            cart: cart,
            selectedAddress: selectedAddress,
            charge: chargeInfo, // Include the charge details in the order
        };
        orders.push(newOrder);

        // Write the updated data back to the file
        await fsPromises.writeFile(ORDER_REQUEST_FILE, JSON.stringify(orders, null, 2));

        // Respond to the client that the order and charge were successfully processed and saved
        res.status(200).json({
            success: true,
            message: "Charge processed and order saved successfully!",
            orderId: newOrder.id, // Return the order ID to the client
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
            const userId = req.authData.id; // Extract userId from the verified token
            const data = await fsPromises.readFile(ADDRESS_FILE, 'utf8');
            let DB = JSON.parse(data);

            // New address entry includes userId for associating with the authenticated user
            const newEntry = {
                id: uuidv4(),
                userId: userId,
                userName: req.body.userName,
                userNumber: req.body.userNumber,
                userStreet: req.body.userStreet,
                userUnit: req.body.userUnit ? req.body.userUnit : '',
                userCity: req.body.userCity,
                userState: req.body.userState,
                userZip: req.body.userZip,
            };

            // Add the new address entry to the database
            DB.push(newEntry);

            // Save the updated addresses back to the file
            await fsPromises.writeFile(ADDRESS_FILE, JSON.stringify(DB, null, 2), 'utf8');

            // Respond with the newly created address entry
            res.status(201).json({ message: 'New address object added to the DB: ', newEntry });
        } catch (err) {
            console.error("Error accessing or modifying the address file:", err);
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
            const userId = req.authData.id; // Extract userId from the verified token
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let cartDB = JSON.parse(data);
        
            const newEntry = {
                id: uuidv4(),
                userId: userId, // Include userId to associate the car service object with the user
                checkedService: req.body.checkedService === 'true', // Convert string to boolean
                makeAndModel: req.body.makeAndModel,
                color: req.body.color,
                licensePlate: req.body.licensePlate || '', // Include license plate if provided
                carMessage: req.body.carMessage || '', // Include car message if provided
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null, // Include image path if file uploaded
            };
        
            cartDB.push(newEntry);
            await fsPromises.writeFile(CART_FILE, JSON.stringify(cartDB, null, 2), 'utf8');
            
            res.status(201).json({ message: 'New car service object added to the DB: ', newEntry });
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
            const userId = req.authData.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);

            const newEntry = {
                id: uuidv4(),
                userId: userId,
                selectedSize: req.body.selectedSize,
                drivewayMessage: req.body.drivewayMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null,
            };

            DB.push(newEntry);

            await fsPromises.writeFile(CART_FILE, JSON.stringify(DB, null, 2), 'utf8');
            res.status(201).json({message: 'New driveway service object added to the DB: ', newEntry });
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
            const userId = req.authData.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);

            const newEntry = {
                id: uuidv4(),
                userId: userId,
                walkway: req.body.walkway === 'true',
                frontYard: req.body.frontYard === 'true',
                backyard: req.body.backyard === 'true',
                lawnMessage: req.body.lawnMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null,
            };

            DB.push(newEntry);
            await fsPromises.writeFile(CART_FILE, JSON.stringify(DB, null, 2), 'utf8');
            res.status(201).json({message: 'New lawn service object added to the DB: ', newEntry });
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
            const userId = req.authData.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);

            const newEntry = {
                id: uuidv4(),
                userId: userId,
                from: req.body.from,
                to: req.body.to, // "to" field is optional
                streetMessage: req.body.streetMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null,
            };

            DB.push(newEntry);

            await fsPromises.writeFile(CART_FILE, JSON.stringify(DB, null, 2), 'utf8');
            res.status(201).json({ message: 'New street service object added to the DB: ', newEntry });
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
            const userId = req.authData.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);

            const newEntry = {
                id: uuidv4(),
                userId: userId,
                selectedSize: req.body.selectedSize,
                otherMessage: req.body.otherMessage,
                objectType: req.body.objectType,
                imagePath: req.file ? req.file.path : null,
            };

            DB.push(newEntry);

            await fsPromises.writeFile(CART_FILE, JSON.stringify(DB, null, 2), 'utf8');
            res.status(201).json({ message: 'New other service object added to the DB: ', newEntry });
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
            const userId = req.authData.id;
            const addressId = req.params.id;
            const data = await fsPromises.readFile(ADDRESS_FILE, 'utf8');
            let DB = JSON.parse(data);
            let updatedItem = null;
            let found = false;

            const updatedDB = DB.map(item => {
                if (item.id === addressId && item.userId === userId) {
                    found = true;
                    updatedItem = { 
                        ...item,
                        userName: req.body.userName,
                        userNumber: req.body.userNumber,
                        userStreet: req.body.userStreet,
                        userUnit: req.body.userUnit,
                        userCity: req.body.userCity,
                        userState: req.body.userState,
                        userZip: req.body.userZip,
                    };
                    return updatedItem;
                }
                return item;
            });

            if (!found) {
                return res.status(404).send({message: 'Address not found or you do not have permission to edit it.'});
            }

            await fsPromises.writeFile(ADDRESS_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
            res.status(200).send({message: 'Address object updated in the DB: ', updatedItem});
        } catch (err) {
            console.error("Error accessing or modifying the address file:", err);
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
            // Return validation errors to the client
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.authData.id;
            const carId = req.params.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);
            let updatedItem = null;
            let found = false;

            const updatedDB = DB.map(item => {
                if (item.id === carId && item.userId === userId) {
                    found = true;
                    updatedItem = {
                        ...item,
                        checkedService: req.body.checkedService === 'true' || req.body.checkedService === true,
                        makeAndModel: req.body.makeAndModel,
                        color: req.body.color,
                        licensePlate: req.body.licensePlate || item.licensePlate, // Retain old value if not provided
                        carMessage: req.body.carMessage || item.carMessage, // Retain old value if not provided
                        objectType: req.body.objectType,
                        imagePath: req.file ? req.file.path : item.imagePath, // Update or retain old image path
                    };
                    return updatedItem;
                }
                return item;
            });

            if (!found) {
                // Car service object not found
                return res.status(404).send('Car service object not found in the DB.');
            }

            // Write the updated data back to the cart file
            await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
            res.status(200).json({ message: 'Car service object updated in the DB: ', updatedItem });
        } catch (err) {
            console.error("Error handling car service update:", err);
            res.status(500).send('Failed to process car service update');
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
            const userId = req.authData.id;
            const drivewayId = req.params.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);
            let updatedItem = null;
            let found = false;

            const updatedDB = DB.map(item => {
                if (item.id === drivewayId && item.userId === userId) {
                    found = true;
                    updatedItem = {
                        ...item,
                        selectedSize: req.body.selectedSize || item.selectedSize,
                        drivewayMessage: req.body.drivewayMessage || item.drivewayMessage,
                        objectType: req.body.objectType,
                        imagePath: req.file ? req.file.path : item.imagePath, 
                    };
                    return updatedItem;
                }
                return item;
            });

            if (!found) {
                return res.status(404).send({ message: 'Driveway service object not found.' });
            }

            await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
            res.status(200).json({ message: 'Driveway service object updated in the DB: ', updatedItem });
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
            const userId = req.authData.id;
            const lawnId = req.params.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);
            let updatedItem = null;
            let found = false;

            const updatedDB = DB.map(item => {
                if (item.id === lawnId && item.userId === userId) {
                    found = true;
                    updatedItem = {
                        ...item,
                        walkway: req.body.walkway ? req.body.walkway === 'true' : item.walkway,
                        frontYard: req.body.frontYard ? req.body.frontYard === 'true' : item.frontYard,
                        backyard: req.body.backyard ? req.body.backyard === 'true' : item.backyard,
                        lawnMessage: req.body.lawnMessage || item.lawnMessage,
                        objectType: req.body.objectType || item.objectType,
                        imagePath: req.file ? req.file.path : item.imagePath,
                    };
                    return updatedItem;
                }
                return item;
            });

            if (!found) {
                return res.status(404).send({ message: 'Lawn service object not found.' });
            }

            await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
            res.status(200).json({ message: 'Lawn service object updated in the DB: ', updatedItem });
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
            const userId = req.authData.id;
            const streetId = req.params.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);
            let updatedItem = null;
            let found = false;

            const updatedDB = DB.map(item => {
                if (item.id === streetId && item.userId === userId) {
                    found = true;
                    updatedItem = {
                        ...item,
                        from: req.body.from,
                        to: req.body.to || item.to, // Keep existing value if 'to' is not provided
                        streetMessage: req.body.streetMessage || item.streetMessage,
                        objectType: req.body.objectType,
                        imagePath: req.file ? req.file.path : item.imagePath,
                    };
                    return updatedItem;
                }
                return item;
            });

            if (!found) {
                return res.status(404).send({ message: 'Street service object not found.' });
            }

            await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
            res.status(200).json({ message: 'Street service object updated in the DB: ', updatedItem });
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
            const userId = req.authData.id;
            const otherId = req.params.id;
            const data = await fsPromises.readFile(CART_FILE, 'utf8');
            let DB = JSON.parse(data);
            let updatedItem = null;
            let found = false;

            const updatedDB = DB.map(item => {
                if (item.id === otherId && item.userId === userId) {
                    found = true;
                    updatedItem = {
                        ...item,
                        selectedSize: req.body.selectedSize,
                        otherMessage: req.body.otherMessage,
                        objectType: req.body.objectType,
                        imagePath: req.file ? req.file.path : item.imagePath,
                    };
                    return updatedItem;
                }
                return item;
            });

            if (!found) {
                return res.status(404).send({ message: 'Other service object not found.' });
            }

            await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
            res.status(200).json({ message: 'Other service object updated in the DB: ', updatedItem });
        } catch (error) {
            console.error("Error processing request:", error);
            res.status(500).send('An error occurred processing your request.');
        }
    }
);

// DELETE route for other service object
app.delete('/address/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id; // Extract userId from verifyToken.
        const addressId = req.params.id; // The unique identifier of the address.
        const data = await fsPromises.readFile(ADDRESS_FILE, 'utf8');
        let DB = JSON.parse(data);

        // Directly find the address ensuring it belongs to the user
        const addressToDelete = DB.find(item => item.id === addressId && item.userId === userId);
        if (!addressToDelete) {
            // If the address doesn't exist or doesn't belong to the user, provide a generic error response
            return res.status(404).send({message: 'Address not found or you do not have permission to delete this address.'});
        }

        // Proceed to filter out the address to be deleted
        const updatedDB = DB.filter(item => item.id !== addressId);

        await fsPromises.writeFile(ADDRESS_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
        res.status(200).send({message: 'Address object deleted from the DB.'});
    } catch (err) {
        console.error("Error accessing or modifying the address file:", err);
        res.status(500).send('An error occurred while processing your request.');
    }
});

// DELETE route for car service
app.delete('/car/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id; // Extract userId from verifyToken.
        const carId = req.params.id; // The unique identifier of the car.
        const data = await fsPromises.readFile(CART_FILE, 'utf8');
        let DB = JSON.parse(data);

        // Find the car service object to verify existence and ownership
        const carServiceToDelete = DB.find(item => item.id === carId && item.userId === userId);
        if (!carServiceToDelete) {
            // If the car service object does not exist, or if it does not belong to the user, return a 404 or 403 error
            return res.status(404).send({ message: 'Car service object not found or you do not have permission to delete it.' });
        }

        // Filter out the car service object to be deleted
        const updatedDB = DB.filter(item => item.id !== carId);

        // Write the updated data back to the cart file
        await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
        res.status(200).send({ message: 'Car service object deleted from the DB.' });
    } catch (err) {
        console.error("Error during deletion of car service object:", err);
        res.status(500).send('An error occurred processing the deletion request.');
    }
});

// DELETE route for driveway service object
app.delete('/driveway/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id; 
        const drivewayId = req.params.id;
        const data = await fsPromises.readFile(CART_FILE, 'utf8');
        let DB = JSON.parse(data);
        
        const drivewayServiceToDelete = DB.find(item => item.id === drivewayId && item.userId === userId);
        if (!drivewayServiceToDelete) {
            return res.status(404).send({ message: 'Driveway service object not found or you do not have permission to delete this item.' });
        }

        const updatedDB = DB.filter(item => item.id !== drivewayId);

        await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
        res.status(200).json({ message: 'Driveway service object deleted from the DB.' });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
});

// DELETE route for lawn service object
app.delete('/lawn/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id; 
        const lawnId = req.params.id;
        const data = await fsPromises.readFile(CART_FILE, 'utf8');
        let DB = JSON.parse(data);
        
        const lawnServiceToDelete = DB.find(item => item.id === lawnId && item.userId === userId);
        if (!lawnServiceToDelete) {
            return res.status(404).send({ message: 'Lawn service object not found or you do not have permission to delete this item.' });
        }

        const updatedDB = DB.filter(item => item.id !== lawnId);

        await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
        res.status(200).json({ message: 'Lawn service object deleted from the DB.' });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
});

// DELETE route for street service
app.delete('/street/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id;
        const streetId = req.params.id;
        const data = await fsPromises.readFile(CART_FILE, 'utf8');
        let DB = JSON.parse(data);
        
        const streetServiceToDelete = DB.find(item => item.id === streetId && item.userId === userId);
        if (!streetServiceToDelete) {
            return res.status(404).send({ message: 'Street service object not found or you do not have permission to delete this item.' });
        }

        const updatedDB = DB.filter(item => item.id !== streetId);

        await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
        res.status(200).json({ message: 'Street service object deleted from the DB.' });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
});

// DELETE route for other service object
app.delete('/other/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.authData.id; 
        const otherId = req.params.id;
        const data = await fsPromises.readFile(CART_FILE, 'utf8');
        let DB = JSON.parse(data);
        
        const otherServiceToDelete = DB.find(item => item.id === otherId && item.userId === userId);
        if (!otherServiceToDelete) {
            return res.status(404).send({ message: 'Other service object not found or you do not have permission to delete this item.' });
        }

        const updatedDB = DB.filter(item => item.id !== otherId);

        await fsPromises.writeFile(CART_FILE, JSON.stringify(updatedDB, null, 2), 'utf8');
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
httpsServer.listen(port, () => {
    console.log(`HTTPS Server running on port ${port}`);
});