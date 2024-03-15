
const { User, Customer, Snowtech } = require("../schemas");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// POST route handler function for new users.
const userRegistration = async (req, res) => {
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
};

// POST route handler function to validate the user.
const validateUser = async (req, res) => {
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
            userStreet: user.userStreet,
            userZip: user.userZip,
            userCity: user.userCity,
            userState: user.userState,
            accountType: user.accountType, 
            accessToken: accessToken, 
        });

    } catch (err) {
        console.error("Error handling login:", err);
        res.status(500).send('An error occurred during login.');
    }
};

// POST route handler function to logout current user.
const logoutUser = async (req, res) => {
    try {
        const userId = req.user.id; 
        const user = await User.findById(userId);

        if (user) {
            user.refreshToken = null; // Invalidate the refresh token
            await user.save();
            res.clearCookie('refreshToken'); // Clear the refreshToken cookie
            res.status(204).send(); // Successfully processed the request but no content to return
        } else {
            res.status(404).send('User not found.'); // User not found
        }
    } catch (err) {
        console.error("Error during logout:", err);
        res.status(500).send('An error occurred processing the logout request.');
    }
};

// Delete route handler function to remove user from DB.
const deleteUser = async (req, res) => {}

module.exports = {
    userRegistration,
    validateUser,
    logoutUser,
    deleteUser
}