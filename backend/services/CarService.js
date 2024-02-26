const { validationResult } = require('express-validator');
const { User } = require("../schemas");
const { v4: uuidv4 } = require('uuid');

// POST route handler function car service.
const postCarService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id; // Extract userId from the verified token
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Create the new car service object
        const newCarService = {
            id: uuidv4(),
            userId: userId,
            checkedService: req.body.checkedService === 'true', // Convert string to boolean
            makeAndModel: req.body.makeAndModel,
            color: req.body.color,
            licensePlate: req.body.licensePlate || '', // Include license plate if provided
            carMessage: req.body.carMessage || '', // Include car message if provided
            price: req.body.price,
            objectType: req.body.objectType,
            imagePath: req.file ? req.file.path : null, // Include image path if file uploaded
        };

        user.userCart.push(newCarService);
        await user.save();
        res.status(201).json({ message: 'New car service object added to the user cart.', newCarService });

    } catch (err) {
        console.error("Error handling car service submission:", err);
        res.status(500).send('Failed to process car service submission.');
    }
};

// PUT route handler function to update an existing car service.
const updateCarService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const userId = req.user.id; // VerifyToken middleware sets req.user
        const carId = req.params.id; // The ID of the car service object to update
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find the index of the cart item in the user's cart.
        const cartIndex = user.userCart.findIndex(item => item.id === carId);
        if (cartIndex === -1) {
            return res.status(404).json({ message: 'Car service object not found in user cart.' });
        }

        const checkedService = req.body.checkedService === 'true';
        const makeAndModel = req.body.makeAndModel;
        const color = req.body.color;
        const licensePlate = req.body.licensePlate;
        const carMessage = req.body.carMessage;
        const imagePath = req.file ? req.file.path : undefined;

        const updateData = {
            ...(checkedService !== undefined) && { checkedService },
            ...(makeAndModel) && { makeAndModel },
            ...(color) && { color },
            ...(licensePlate) && { licensePlate },
            ...(carMessage) && { carMessage },
            ...(imagePath) && { imagePath },
        };

        const cartItemToUpdate = user.userCart[cartIndex];

        // Update only the fields that were passed in the request body, keeping the rest intact.
        Object.keys(updateData).forEach(key => {
            cartItemToUpdate[key] = updateData[key];
        });

        const requiredFields = ['objectType', 'userId', 'id'];
        const hasRequiredFields = requiredFields.every(field => user.userCart[cartIndex][field] !== undefined);

        if (!hasRequiredFields) {
            return res.status(400).json({ message: 'Missing required fields in cart item.' });
        }
   
        await user.save();
        res.status(200).json({ message: 'Car service object updated.', updateData });

    } catch (error) {
        console.error("Error updating car service object:", error);
        res.status(500).json({ message: 'An error occurred while updating the car service object.', error: error.message });
    }
};

// DELETE route function for car service.
const deleteCarService = async (req, res) => {
    try {
        const userId = req.user.id; 
        const carId = req.params.id; 
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const carIndex = user.userCart.findIndex(cartItem => cartItem.id === carId);
        if (carIndex === -1) {
            return res.status(404).json({ message: 'Car service object not found in user cart.' });
        }

        user.userCart.splice(carIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Car service object deleted successfully.' });
    
    } catch (error) {
        console.error("Error processing the deletion request:", error);
        res.status(500).send('An error occurred while processing the deletion request.');
    }
};

module.exports = {
    postCarService,
    updateCarService,
    deleteCarService
}