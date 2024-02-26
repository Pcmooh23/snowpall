const { Customer, Snowtech, ActiveRequest, CompletedRequest } = require("../schemas");

// Middleware function that loads and parses user data from JSON file, 
// and then attaches it to the request object ('req') so that subsequent route handlers 
// can access it directly, thus eliminating need to repeat the file reading and parsing logic in each route.
const loadData = async (req, res, next) => {
    try {
        // Assume Customer and Snowtech are Mongoose models for your collections
        const customers = await Customer.find();
        const snowtechs = await Snowtech.find();
        const activeRequests = await ActiveRequest.find();
        const completedRequests = await CompletedRequest.find(); 

        // Attach the data to the request object
        req.db = {
            customers: customers,
            snowtechs: snowtechs,
            requests: {
                active: activeRequests,
                completed: completedRequests
            }
        };
        req.combinedUsers = [...customers, ...snowtechs];
        req.customerUsers = customers;
        req.snowtechUsers = snowtechs;
        req.activeRequests = activeRequests;
        req.completedRequests = completedRequests;

        next(); // Proceed to the next middleware/route handler
    } catch (err) {
        console.error("Error loading data from database:", err);
        res.status(500).send('An error occurred while loading data from the database.');
    }
};

module.exports = loadData;