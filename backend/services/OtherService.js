const { validationResult } = require('express-validator');
const { User } = require("../schemas");
const { v4: uuidv4 } = require('uuid');

// POST route for other service
const postOtherService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }

        const imagePath = req.file ? `uploads/${req.file.filename}` : null;

        const newOtherService = {
            id: uuidv4(),
            userId: userId,
            selectedSize: req.body.selectedSize,
            job1Price: req.body.job1Price,
            job2Price: req.body.job2Price,
            job3Price: req.body.job3Price,
            job4Price: req.body.job4Price,
            otherMessage: req.body.otherMessage,
            objectType: req.body.objectType,
            imagePath: imagePath,
        };

        user.userCart.push(newOtherService);
        await user.save();
        res.status(201).json({ message: 'New other service object added to the DB: ', newOtherService });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};
// PUT route to update an existing other service entry
const updateOtherService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id;
        const otherId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const otherIndex = user.userCart.findIndex(other => other.id === otherId);
        if (otherIndex === -1) {
            return res.status(404).json({ message: 'Other service object not found.' });
        }

        const selectedSize = req.body.selectedSize;
        const otherMessage = req.body.otherMessage;
        const imagePath = req.file ? `uploads/${req.file.filename}` : user.userCart[otherIndex].imagePath;

        const updateData = {
            ...(selectedSize) && { selectedSize },
            ...(otherMessage) && { otherMessage },
            ...(imagePath) && { imagePath },
        };

        const cartItemToUpdate = user.userCart[otherIndex];
        Object.keys(updateData).forEach(key => {
            cartItemToUpdate[key] = updateData[key];
        });

        const requiredFields = ['objectType', 'userId', 'id'];
        const hasRequiredFields = requiredFields.every(field => user.userCart[otherIndex][field] !== undefined);

        if (!hasRequiredFields) {
            return res.status(400).json({ message: 'Missing required fields in cart item.' });
        }

        await user.save();        
        res.status(200).json({ message: 'Other service object updated in the DB: ', other: user.userCart[otherIndex] });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};
// DELETE route for other service object
const deleteOtherService = async (req, res) => {
    try {
        const userId = req.user.id; 
        const otherId = req.params.id;
        const user = req.customerUsers.find(user => user.id === userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
    
        const otherIndex = user.userCart.findIndex(other => other.id === otherId);
        if (otherIndex === -1) {
            return res.status(404).json({ message: 'Other service object not found.' });
        }

        user.userCart.splice(otherIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Other service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};

module.exports = {
    postOtherService,
    updateOtherService,
    deleteOtherService
}