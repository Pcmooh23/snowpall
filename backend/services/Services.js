const { User } = require("../schemas");

// GET route handler function for all services.
const getUserServices = async (req, res) => {
    try {
        const userId = req.user.id; // Extract userId from user set by verifyToken
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
    
        const userServices = user.userCart;
        res.json(userServices); // Send filtered services as JSON
    } catch (error) {
        console.error("Error reading services data:", error);
        res.status(500).send('An error occurred while fetching services.');
    }
}

module.exports = getUserServices;