import React, { useContext } from 'react';
import MainHeader from "./MainHeader";
import AddressArea from './AddressArea';
import PaymentArea from './PaymentArea';
import ReviewRequest from './ReviewRequest';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '../stripe';
import { SnowPallContext } from './SnowPallContext';

const SubmitRequest = () => {

    const {paymentRef} = useContext(SnowPallContext)

    return (
        <>
            <MainHeader/>
            <div className='submitRequest'>
                <div className='left-side'>
                    <AddressArea/>
                    <Elements stripe={stripePromise}>
                        <PaymentArea ref={paymentRef} />
                    </Elements>
                </div>
                <ReviewRequest/>
            </div>
        </>
    );
}

export default SubmitRequest;
