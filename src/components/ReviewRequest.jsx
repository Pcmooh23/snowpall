import React, { useState, useContext } from 'react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';

const ReviewRequest = () => {

    const { cart, setCart, baseUrl, total, estimatedTax, grandTotal, paymentRef, userId } = useContext(SnowPallContext);
    const numberOfItems = cart.length;
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { customFetch } = useApi();

    const handleSubmit = async () => {
        setIsLoading(true);
        setMessage('');
        
        const stripeToken = await paymentRef.current.submitPayment();

        if (!stripeToken) {
            setMessage('Payment failed. Please try again.');
            setIsLoading(false);
            return;
        }
        
         // Retrieve selected address information
        const selectedAddressString = localStorage.getItem(`${userId}_selectedAddressForUse`); 
        let selectedAddress;

        try {
            selectedAddress = JSON.parse(selectedAddressString);
        } catch (error) {
            console.error('Error parsing selected address:', error);
            setMessage('Failed to retrieve address information. Please check your address details and try again.');
            setIsLoading(false);
            return;
        }
        if (!selectedAddress) {
            setMessage('No address selected. Please select an address before submitting.');
            setIsLoading(false);
            return;
        }
        
        // Prepare order details including the cart, total amounts, selected address, and Stripe token
        const orderDetails = {
            cart: cart,
            amount: Math.round(grandTotal * 100),  // Total charge in cents
            selectedAddress: selectedAddress,
            stripeToken: stripeToken, // Include the Stripe token for the charge
            grandTotal: grandTotal
        };
        
        const url = '/submit-request';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderDetails),
          };

          try {
            const response = await customFetch(url, options);
            const data = await response.json(); // Parse the response data for both success and error scenarios
        
            if (response.ok) {
                setMessage('Submission successful, request is now live.');
                setCart([]); // Clear the cart on successful submission
            } else {
                // Use the server-provided error message if available, otherwise a generic error message
                const errorMessage = data.message || 'An error occurred while submitting the order.';
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error:', error);
            // Ensure `error.message` is used, as it now contains either server-provided or generic error message
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };
      
  return (
    <>
        <div className='review-request'>
            <h1>3. Review Request</h1>
            <div className='requests-area'>
                {cart.map((item, index) => {
                    if (item.objectType === 'car') {
                        return (
                            <div key={index} className='request'>
                                {item.imagePath && <img 
                                    className='request-image' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload lawn"/>}
                                <div className='request-detail'>
                                    <p>Service: {item.checkedService ? "Clear snow of vehicle": "No service selected"}<span className='price'>$20</span></p>
                                    <p>Make & Model: {item.makeAndModel}</p>
                                    <p>Color: {item.color}</p>
                                    { item.licensePlate !== '' && <p>License Plate: {item.licensePlate}</p>}
                                </div>
                                { item.carMessage !== '' && <p className='message'>Message: {item.carMessage}</p>}
                            </div>
                        );
                    } else if (item.objectType === 'driveway') {
                        return (
                            <div key={index} className='request'>
                                {item.imagePath && <img 
                                    className='request-image' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload lawn"/>}
                                <div className='request-detail'>
                                    {item.selectedSize === 'size1' && <p>10 x 24ft. (240 sq. ft.)<span className='price'>$40</span></p>}
                                    {item.selectedSize === 'size2' && <p>20 x 20 ft. (400 sq. ft.)<span className='price'>$60</span></p>}
                                    {item.selectedSize === 'size3' && <p>24 x 24 ft. (576 sq. ft.)<span className='price'>$80</span></p>}
                                    {item.selectedSize === 'size4' && <p>24 x 36 ft. (864 sq. ft.)<span className='price'>$110</span></p>}
                                </div>
                                { item.drivewayMessage !== '' && <p className='message'>Message: {item.drivewayMessage}</p>}
                            </div>
                        );
                    } else if (item.objectType === 'lawn') {
                        return (
                            <div key={index} className='request'>
                                {item.imagePath && <img 
                                    className='request-image' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload lawn"/>}
                                <div className='request-detail'>
                                    {item.walkway && <p>Clear Snow off walkway<span className='price'>$15</span></p>}
                                    {item.frontYard && <p>Clear Snow off front yard<span className='price'>$25</span></p>}
                                    {item.backyard && <p>Clear Snow off backyard<span className='price'>$25</span></p>}
                                </div>
                                { item.lawnMessage !== '' && <p className='message'>Message: {item.lawnMessage}</p>}
                            </div>
                        ); 
                    } else if (item.objectType === 'street') {
                        return (
                            <div key={index} className='request'>
                                {item.imagePath && <img 
                                    className='request-image' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload lawn"/>}
                                <div className='request-detail'>
                                    {item.from && <p>From: {item.from}</p>}
                                    {item.to && <p>To: {item.to}</p>}
                                    {<span className='price'>$25</span>}
                                </div>
                                { item.streetMessage !== '' && <p className='message'>Message: {item.streetMessage}</p>}
                            </div>
                        );
                    } else if (item.objectType === 'other') {
                        return (
                            <div key={index} className='request'>
                                {item.imagePath && <img 
                                    className='request-image' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload lawn"/>}
                                <div className='request-detail'>
                                    {item.selectedSize === 'job1' && <p>(100 sq. ft.)<span className='price'>$25</span></p>}
                                    {item.selectedSize === 'job2' && <p>(200 sq. ft.)<span className='price'>$35</span></p>}
                                    {item.selectedSize === 'job3' && <p>(300 sq. ft.)<span className='price'>$45</span></p>}
                                    {item.selectedSize === 'job4' && <p>(400 sq. ft.)<span className='price'>$55</span></p>}
                                </div>
                                { item.otherMessage !== '' && <p className='message'>Message: {item.otherMessage}</p>}
                            </div>
                        );
                    } else {
                        return null;
                    }
                })}
            </div>
            <div className='request-bottom'>
                <div className='left-side'>
                    <p className='summary-title'>Request Summary</p>
                    <div className='items'>
                        <p>{`items(${numberOfItems}):`}</p>
                        <p>${total.toFixed(2)}</p>
                    </div>
                    <div className='taxes'>
                        <p>Estimated Tax:</p>
                        <p>${estimatedTax.toFixed(2)}</p>
                    </div>
                    <div className='total'>
                        <p>Total</p>
                        <p>${grandTotal.toFixed(2)}</p>
                    </div>
                </div>
                <div className='send-order'>
                    <button className='submit-button' onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Submitting…' : 'Submit Request'}
                    </button>
                    <p className={`message ${message ? 'visible' : ''}`}>{message || ''}</p>
                </div>
            </div>
        </div>
    </>
  )
}

export default ReviewRequest
