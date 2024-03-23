const { validationResult } = require('express-validator');
const { User } = require("../schemas");
const { v4: uuidv4 } = require('uuid');

// POST route for lawn service
const postLawnService = async (req, res) => {
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

        const newLawnService = {
            id: uuidv4(),
            userId: userId,
            walkway: req.body.walkway === 'true',
            frontYard: req.body.frontYard === 'true',
            backyard: req.body.backyard === 'true', 
            lawnMessage: req.body.lawnMessage,
            walkwayPrice: req.body.walkwayPrice,
            frontYardPrice: req.body.frontYardPrice,
            backyardPrice: req.body.backyardPrice,
            objectType: req.body.objectType,
            imagePath: imagePath, 
        };

        user.userCart.push(newLawnService);
        await user.save();
        res.status(201).json({ message: 'New lawn service object added to the user cart.', newLawnService });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};
// PUT route to update an existing lawn service entry
const updateLawnService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id;
        const lawnId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const lawnIndex = user.userCart.findIndex(lawn => lawn.id === lawnId);
        if (lawnIndex === -1) {
            return res.status(404).json({ message: 'Lawn service object not found.' });
        }

        const walkway = req.body.walkway === 'true';
        const frontYard = req.body.frontYard === 'true';
        const backyard = req.body.backyard === 'true';
        const lawnMessage = req.body.lawnMessage;
        const imagePath = req.file ? `uploads/${req.file.filename}` : user.userCart[lawnIndex].imagePath;


        const updateData = {
            ...(walkway !== undefined) && { walkway },
            ...(frontYard !== undefined) && { frontYard },
            ...(backyard !== undefined) && { backyard },
            ...(lawnMessage) && { lawnMessage },
            ...(imagePath) && { imagePath },
        };

        const cartItemToUpdate = user.userCart[lawnIndex];
        Object.keys(updateData).forEach(key => {
            cartItemToUpdate[key] = updateData[key];
        });

        const requiredFields = ['objectType', 'userId', 'id'];
        const hasRequiredFields = requiredFields.every(field => user.userCart[lawnIndex][field] !== undefined);

        if (!hasRequiredFields) {
            return res.status(400).json({ message: 'Missing required fields in cart item.' });
        }

        await user.save();
        res.status(200).json({ message: 'Lawn service object updated.', lawn: user.userCart[lawnIndex] });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};
// DELETE route for lawn service object
const deleteLawnService = async (req, res) => {
    try {
        const userId = req.user.id; 
        const lawnId = req.params.id;        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const lawnIndex = user.userCart.findIndex(lawn => lawn.id === lawnId);
        if (lawnIndex  === -1) {
            return res.status(404).json({ message: 'Lawn service object not found.' });
        }

        user.userCart.splice(lawnIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Lawn service object deleted from the DB.' });

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send('An error occurred processing your request.');
    }
};

module.exports = {
    postLawnService,
    updateLawnService,
    deleteLawnService
}