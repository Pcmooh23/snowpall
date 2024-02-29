const { User, ActiveRequests, CompletedRequests, Snowtech, Customer } = require("../schemas");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');

// Get route handler function for all active requests
const getRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        // Assuming snowtechUsers is an array of user objects
        const user = await Snowtech.findById(userId);
 
        if (!user) {
            return res.status(404).send('User not found.');
        }
 
        // Since req.db.requests.active is an array, we need to map over it
        const activeRequests = req.db.requests.active.map(request => ({
            id: request.id,
            orderDate: request.orderDate,
            cart: request.cart,
            address: {
                userName: request.selectedAddress.userName,
                userStreet: request.selectedAddress.userStreet,
                userCity: request.selectedAddress.userCity,
                userState: request.selectedAddress.userState,
                userZip: request.selectedAddress.userZip,
            },
            charge: {
                id: request.charge.id,
                amount: request.charge.amount,
            },
            stages: request.stages
        }));
        // Sending the array of transformed active requests back to the client
        res.json({ activeRequests });
    } catch (error) {
        console.error("Error reading active requests data:", error);
        res.status(500).send('An error occurred while fetching active requests.');
    }
};

// POST route handler function for the requests
const submitRequest = async (req, res) => {
    const { stripeToken, amount, cart, selectedAddress } = req.body;
    const userId = req.user.id; 

    try {
        // Create a charge: this will charge the user's card
        const charge = await stripe.charges.create({
            amount: amount,
            currency: "usd",
            source: stripeToken, 
            description: "Charge for service",
            transfer_data: {},
        });

        // Construct charge information to save along with order details
        const chargeInfo = {
            id: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            description: charge.description,
            created: new Date(charge.created * 1000), // Convert to milliseconds
        };

        // Find the user by their ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Construct the new request to add to the user's userRequests array
        const newRequest = {
            userId: userId,
            cart: cart,
            selectedAddress: selectedAddress,
            charge: chargeInfo, // Include the charge details in the request
            status: 'active',
            stages: {
                live: true,
                accepted: false,
                started: false,
                complete: false,
            }
        };

        // Add the new request to the user's userRequests array and the active requests array.
        const newActiveRequest = new ActiveRequests(newRequest);
        await newActiveRequest.save();
        user.activeRequests.push(newActiveRequest._id);
        user.userCart = [];
        await user.save();
        // Respond to the client that the charge was processed and the request was saved successfully
        res.status(200).json({
            success: true,
            message: "Charge processed and request saved successfully!",
            requestId: newRequest.id // Return the request ID to the client.
        });        
    } catch (error) {
        console.error("Charge failed or saving failed:", error);
        res.status(500).json({ success: false, message: "Charge failed or saving failed", error: error.message });
    }
};

const acceptRequest = async (req, res) => {
    try {
        const requestId = req.params.id; // Capture the request ID from the URL
        const { customerId } = req.body; // Extract customerId from the request body
       
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).send('Customer not found.');
        }

        const currentRequest = await ActiveRequests.findOne({ id: requestId });
        if (!currentRequest) {
            return res.status(404).send('Request not found in active requests array.');
        }
      
        const customerRequest = customer.activeRequests.find(request => 
            request.equals(currentRequest._id)
        );        
        if (!customerRequest) {
            return res.status(404).send('Request not found in customer array.');
        }

        if (currentRequest.stages.accepted) {
        return res.status(409).send('Request has already been accepted.');
        }

        const notificationMessage = `Your request with ID ${requestId} has been accepted.`;
        currentRequest.stages.accepted = true;
        customer.userNotifications.push({
            id: uuidv4(),
            message: notificationMessage,
            created: new Date(),
            read: false
        });
        await customer.save();
        await currentRequest.save();
        res.status(200).json({ message: 'Request accepted and customer notified.', request: customerRequest });

    } catch (error) {
        console.error("Error updating request object:", error);
        res.status(500).send('An error occurred while updating a request object.');
    }
}

const cancelRequest = async (req, res) => {
    try {
        const requestId = req.params.id; 
        const { customerId } = req.body; 
       
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).send('Customer not found.');
        }
  
        const currentRequest = await ActiveRequests.findOne({ id: requestId });
        if (!currentRequest) {
            return res.status(404).send('Request not found in active requests array.');
        }
  
        const customerRequest = customer.activeRequests.find(request => 
            request.equals(currentRequest._id)
        );        
        if (!customerRequest) {
            return res.status(404).send('Request not found in customer array.');
        }
  
        const notificationMessage = `Snowtech cancelled request with ID ${requestId}.`;
        currentRequest.stages.accepted = false;
        customer.userNotifications.push({
            id: uuidv4(),
            message: notificationMessage,
            date: new Date(),
            read: false
        });
        await customer.save();
        await currentRequest.save();
        res.status(200).json({ message: 'Request cancelled and customer notified.', request: customerRequest });
  
    } catch (error) {
        console.error("Error updating request object:", error);
        res.status(500).send('An error occurred while updating a request object.');
    }
}

const startRequest = async (req, res) => {
    try {
        const requestId = req.params.id; // Capture the request ID from the URL
        const { customerId } = req.body; // Extract customerId from the request body
       
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).send('Customer not found.');
        }

        const currentRequest = await ActiveRequests.findOne({ id: requestId });
        if (!currentRequest) {
            return res.status(404).send('Request not found in active requests array.');
        }
  
        const customerRequest = customer.activeRequests.find(request => 
            request.equals(currentRequest._id)
        );        
        if (!customerRequest) {
            return res.status(404).send('Request not found in customer array.');
        }

        const notificationMessage = `Your request with ID ${requestId} has been started.`;
        currentRequest.stages.started = true;
        customer.userNotifications.push({
            id: uuidv4(),
            message: notificationMessage,
            date: new Date(),
            read: false
        });
        await customer.save();
        await currentRequest.save();
        res.status(200).json({ message: 'Request started and customer notified.', request: customerRequest });

    } catch (error) {
        console.error("Error updating request object:", error);
        res.status(500).send('An error occurred while updating a request object.');
    }
}

const completeRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { customerId, snowtechId } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).send('Customer not found.');
        }

        const snowtech = await Snowtech.findById(snowtechId);
        if (!snowtech) {
            return res.status(404).send('Snowtech not found.');
        }

        const currentRequest = await ActiveRequests.findOne({ id: requestId });
        if (!currentRequest) {
            return res.status(404).send('Request not found in active requests array.');
        }

        // Find the request in the customer's userRequests array
        const customerRequestIndex = customer.activeRequests.findIndex(request =>
            request.toString() === currentRequest._id.toString()
        );
        if (customerRequestIndex === -1) {
            return res.status(404).send('Request not found in customer array.');
        }

        // Assuming `currentRequest.charge.amount` contains the total charge amount in cents
        const totalAmount = currentRequest.charge.amount;
        const snowtechPayoutAmount = Math.round(totalAmount * 0.8); // 80% to snowtech

        // Create a transfer to the connected snowtech's Stripe account
        const transfer = await stripe.transfers.create({
            amount: snowtechPayoutAmount,
            currency: 'usd',
            destination: snowtech.stripeAccountId,
            transfer_group: requestId,
        });

        // Remove the request from the customer's userRequests array
        const [customerRequest] = customer.activeRequests.splice(customerRequestIndex, 1);

        // Create and save the completed request document
        const completedRequestData = {
            userId: currentRequest.userId,
            cart: currentRequest.cart,
            selectedAddress: currentRequest.selectedAddress,
            charge: currentRequest.charge,
            status: 'completed',
            stages: {
                live: false,
                accepted: currentRequest.stages.accepted,
                started: currentRequest.stages.started,
                complete: true,
            },
            orderDate: currentRequest.orderDate,
            completionDate: new Date(),
        };
        const completedRequest = new CompletedRequests(completedRequestData);
        await completedRequest.save();

        // Add the completed request to the snowtech's list of completed requests
        snowtech.completedRequests.push(completedRequest._id);
        customer.completedRequests.push(completedRequest._id);
        // Notify the customer
        const notificationMessage = `Your request with ID ${requestId} has been completed.`;
        customer.userNotifications.push({
            id: uuidv4(),
            message: notificationMessage,
            date: new Date(),
            read: false
        });

        // Save the updates to customer and snowtech
        await customer.save();
        await snowtech.save();

        // Delete the active request
        await ActiveRequests.deleteOne({ _id: currentRequest._id });

        // Respond with the outcome
        res.status(200).json({
            message: 'Request complete, customer notified, and payout processed.',
            request: customerRequest,
            transfer: transfer,
        });

    } catch (error) {
        console.error("Error during job completion and payout:", error);
        res.status(500).send('An error occurred during job completion and payout.');
    }
};

module.exports = {
    getRequests,
    submitRequest,
    acceptRequest,
    cancelRequest,
    startRequest,
    completeRequest
}