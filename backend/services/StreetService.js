const { validationResult } = require('express-validator');
const { User } = require("../schemas");
const { v4: uuidv4 } = require('uuid');

// POST route for street service
const postStreetService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const newStreetService = {
            id: uuidv4(),
            userId: userId,
            from: req.body.from,
            to: req.body.to, // "to" field is optional
            price: req.body.price,
            streetMessage: req.body.streetMessage,
            objectType: req.body.objectType,
            imagePath: req.file ? req.file.path : null,
        };

        user.userCart.push(newStreetService);
        await user.save();
        res.status(201).json({ message: 'New street service object added to the DB: ', newStreetService });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};
// PUT route to update an existing street service entry
const updateStreetService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id;
        const streetId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const streetIndex = user.userCart.findIndex(street => street.id === streetId);
        if (streetIndex === -1) {
            return res.status(404).json({ message: 'Street service object not found.' });
        }

        const from  = req.body.from;
        const to = req.body.to ? req.body.to : '';
        const streetMessage = req.body.streetMessage;
        const imagePath = req.file ? req.file.path : undefined;

        const updateData = {
            ...(from) && { from },
            ...(to) && { to },
            ...(streetMessage) && { streetMessage },
            ...(imagePath) && { imagePath },
        };

        const cartItemToUpdate = user.userCart[streetIndex];
        Object.keys(updateData).forEach(key => {
            cartItemToUpdate[key] = updateData[key];
        });

        const requiredFields = ['objectType', 'userId', 'id'];
        const hasRequiredFields = requiredFields.every(field => user.userCart[streetIndex][field] !== undefined);

        if (!hasRequiredFields) {
            return res.status(400).json({ message: 'Missing required fields in cart item.' });
        }

        await user.save();
        res.status(200).json({ message: 'Street service object updated in the DB: ', street: user.userCart[streetIndex] });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};

// DELETE route for street service
const deleteStreetService = async (req, res) => {
    try {
        const userId = req.user.id; 
        const streetId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
    
        const streetIndex = user.userCart.findIndex(street => street.id === streetId);
        if (streetIndex === -1) {
            return res.status(404).json({ message: 'Street service object not found.' });
        }

        user.userCart.splice(streetIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Street service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};

module.exports = {
    postStreetService,
    updateStreetService,
    deleteStreetService
}