import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js';

const PaymentArea = forwardRef((props, ref) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentData, setPaymentData] = useState({ holderName: '' });
  const [error, setError] = useState('');

  const inputChange = (event) => {
    const { name, value } = event.target;
    setPaymentData({ ...paymentData, [name]: value });
  };

  const submitPaymentInfo = async () => {
    if (!stripe || !elements) {
      const errorMesage = 'Stripe.js has not loaded yet.';
      console.error(errorMesage);
      setError(errorMesage);
      return null;
    }
  
    const cardNumberElement = elements.getElement(CardNumberElement);
    try {
      const result = await stripe.createToken(cardNumberElement, { name: paymentData.holderName });
      if (result.error) {
        console.error('Error:', result.error.message);
        alert(result.error.message); // Consider replacing with a more user-friendly error handling
        return null;
      }
  
      // Return the token ID to be used for the charge
      return result.token.id;
    } catch (error) {
      console.error('Error:', error);
      alert(error.message); // Consider replacing with a more user-friendly error handling
      return null;
    }
  };  

  useImperativeHandle(ref, () => ({
    async submitPayment() {
      return await submitPaymentInfo();
    },
  }));
  
  return (
    <div className='payment-area'> 
      <div className='payment-top'>
        <h1>2. Payment Method</h1>    
      </div>
      <div className='card-info'>
        <CardNumberElement className='cardNumber' />
        <div className='cvcAndExpiry'>
          <CardExpiryElement className='cardExpiry' />
          <CardCvcElement className='cardcvc' />
        </div>
        <input
          className='holderName'
          value={paymentData.holderName}
          name='holderName'
          type='text'
          onChange={inputChange}
          placeholder="Cardholder name"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
});

export default PaymentArea;