
const { validationResult } = require('express-validator');
const { User } = require("../schemas");
const { v4: uuidv4 } = require('uuid');


// GET route handler function for user addresses
const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id; // Extract userId from the verified token
        const user = await User.findById(userId);

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
};

// POST route handler function for new address
const postAddress =  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id; 
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ message: 'User not found.' });
        }

        // New address entry
        const newAddress = {
            id: uuidv4(),
            userName: req.body.userName,
            userNumber: req.body.userNumber ? req.body.userNumber : '',
            userUnit: req.body.userUnit ? req.body.userUnit : '',
            userStreet: req.body.userStreet,
            userCity: req.body.userCity,
            userState: req.body.userState,
            userZip: req.body.userZip,
        };

        user.userAddresses.push(newAddress);
        await user.save();
        console.log(newAddress)
        res.status(201).json({ message: 'New address added to user profile', newAddress });
    
    } catch (err) {
        console.error("Error accessing or modifying the users file:", err);
        res.status(500).send('An error occurred while processing your request.');
    }
}

// PUT route handler function to update an existing address
const updateAddress = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id; // Ensure this is set from a secure authentication mechanism
        const addressId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find the address index
        const addressIndex = user.userAddresses.findIndex(addr => addr.id === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        // Update the address directly
        const fieldsToUpdate = ['name', 'number', 'street', 'unit', 'city', 'state', 'zip'];
        fieldsToUpdate.forEach(field => {
            const requestBodyField = fieldMapping(field); // Convert address field to request body field
            if(req.body[requestBodyField] !== undefined) { // Check for undefined to allow empty strings for fields like unit
                user.userAddresses[addressIndex][field] = req.body[requestBodyField];
            }
        });

        await user.save(); // Save the updated user document
        res.status(200).json({ message: 'Address updated successfully.', address: user.userAddresses[addressIndex] });
    } catch (err) {
        console.error("Error processing request:", err);
        res.status(500).send('An error occurred while processing your request.');
    }
};


// DELETE route handler function to remove existing address
const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id; 
        const addressId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const addressIndex = user.userAddresses.findIndex(addr => addr.id === addressId);
        if ( addressIndex === -1) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        user.userAddresses.splice(addressIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Address deleted successfully.' });
   
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred while processing your request.');
    }
};

module.exports = {
    getAddresses,
    postAddress,
    updateAddress,
    deleteAddress
}