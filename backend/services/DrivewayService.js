const { validationResult } = require('express-validator');
const { User } = require("../schemas");
const { v4: uuidv4 } = require('uuid');

// POST route for driveway service
const postDrivewayService = async (req, res) => {
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

        const imagePath = req.file ? `uploads/${req.file.filename}` : null;

        const newDrivewayService = {
            id: uuidv4(),
            userId: userId,
            selectedSize: req.body.selectedSize,
            size1Price: req.body.size1Price,
            size2Price: req.body.size2Price,
            size3Price: req.body.size3Price,
            size4Price: req.body.size4Price,
            drivewayMessage: req.body.drivewayMessage || '',
            objectType: req.body.objectType,
            imagePath: imagePath,
        };

        user.userCart.push(newDrivewayService);
        await user.save();
        res.status(201).json({ message: 'New driveway service object added to the user cart.', newDrivewayService });
    
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};

// PUT route to update an existing driveway service entry
const updateDrivewayService = async (req, res) => { 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id;
        const drivewayId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const cartIndex = user.userCart.findIndex(item => item.id === drivewayId);
        if (cartIndex === -1) {
            return res.status(404).json({ message: 'Driveway service object not found in user cart.' });
        }

        const selectedSize = req.body.selectedSize;
        const drivewayMessage = req.body.drivewayMessage;
        const imagePath = req.file ? `uploads/${req.file.filename}` : user.userCart[cartIndex].imagePath;

        const updateData = {
            ...(selectedSize) && { selectedSize },
            ...(drivewayMessage) && { drivewayMessage },
            ...(imagePath) && { imagePath },
        };

        const cartItemToUpdate = user.userCart[cartIndex];
        Object.keys(updateData).forEach(key => {
            cartItemToUpdate[key] = updateData[key];
        });

        const requiredFields = ['objectType', 'userId', 'id'];
        const hasRequiredFields = requiredFields.every(field => user.userCart[cartIndex][field] !== undefined);

        if (!hasRequiredFields) {
            return res.status(400).json({ message: 'Missing required fields in cart item.' });
        }

        await user.save();
        res.status(200).json({ message: 'Driveway service object updated in the DB: ', driveway: user.userCart[cartIndex]});
    
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};

// DELETE route for driveway service object
const deleteDrivewayService = async (req, res) => {
    try {
        const userId = req.user.id; 
        const drivewayId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const drivewayIndex = user.userCart.findIndex(driveway => driveway.id === drivewayId);
        if (drivewayIndex === -1) {
            return res.status(404).json({ message: 'Driveway service object not found.' });
        }

        user.userCart.splice(drivewayIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Driveway service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};

module.exports = {
    postDrivewayService,
    updateDrivewayService,
    deleteDrivewayService
}