import React, { useContext } from 'react';
import { SnowPallContext } from './SnowPallContext';

const RequestsList = () => {
    const { requestsLog } = useContext(SnowPallContext);

    return (
        <>
            <div>
                {requestsLog.map((request) => {
                    // Create a Set to store unique objectTypes
                    const objectTypesSet = new Set();
                    request.cart.forEach((item) => {
                        objectTypesSet.add(item.objectType.charAt(0).toUpperCase() + item.objectType.slice(1));
                    });

                    // Convert the Set to a string, with each objectType joined by ", "
                    const objectTypes = Array.from(objectTypesSet).join(', ');

                    // Convert the amount to a proper dollar format
                    const amount = (request.charge.amount / 100).toFixed(2);

                    return (
                        <div className='request-container' key={request.id}>
                            <div className='request-top'>
                                <p>{objectTypes}</p>
                                <p>More Details</p>
                            </div>
                            <div className='request-bottom'>
                                <div className='request-bottom-left'>
                                    <button className='accept-request'>Accept</button>
                                    <p>${amount}</p>
                                </div>
                                <div>0.8mi</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>   
    );
};

export default RequestsList;
