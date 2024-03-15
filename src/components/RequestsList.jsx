import React, { useContext, useEffect, useState, useCallback } from 'react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';
import { X } from 'lucide-react';

const RequestsList = () => {
        
    const { 
        requestsLog, setRequestsLog, baseUrl, snowtechLocation,
        refetchRequests, setRefetchRequests, formatAddress, calculateRoute,
        setDirectionResponse, setDistance, setSelectedDestination,
        setDuration, selectedTravelMode, setAcceptedRequest, setAcceptedRequestId, acceptedRequestId
     } = useContext(SnowPallContext);
    const { customFetch } = useApi();

    const [moreDetailsOverlay, setMoreDetailsOverlay] = useState(false);
    const [selectedItemDetails, setSelectedItemDetails] = useState(null);

    const showMoreDetails = (itemDetails) => {
        const objectTypesSet = new Set();
        itemDetails.cart.forEach((item) => {
            objectTypesSet.add(item.objectType.charAt(0).toUpperCase() + item.objectType.slice(1));
        });
        const objectTypes = Array.from(objectTypesSet).join(', ');
    
        // Include the objectTypes in the selectedItemDetails state
        const detailsWithObjectTypes = { ...itemDetails, objectTypes };
        setSelectedItemDetails(detailsWithObjectTypes);
        setMoreDetailsOverlay(true);
    };
    
    const hideMoreDetails = () => {
        setMoreDetailsOverlay(false);
        setSelectedItemDetails(null);
    };

    const fetchRequestsData = useCallback(async () => {
        try {
            const response = await customFetch('/requestsLog');
            if (!response.ok) {
                throw new Error('Failed to fetch requests data');
            }
            const data = await response.json();
            setRequestsLog(data.activeRequests);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setRefetchRequests(false);
        }
      }, [customFetch, setRequestsLog, setRefetchRequests]);
      
      const calculateAllRoutes = useCallback(async () => {
        const updatedRequests = await Promise.all(requestsLog.map(async (request) => {
          // Format the destination address from the request
          const destination = {
              userStreet: request.address.userStreet,
              userCity: request.address.userCity,
              userState: request.address.userState,
              userZip: request.address.userZip
          };
          const routeInfo = await calculateRoute(snowtechLocation, destination, selectedTravelMode);
          return {
              ...request,
              distance: routeInfo ? routeInfo.distance : 'Unavailable',
              duration: routeInfo ? routeInfo.duration : 'Unavailable'
          };
        }));
        setRequestsLog(updatedRequests);
      }, [requestsLog, calculateRoute, selectedTravelMode, setRequestsLog, snowtechLocation]);
      
      useEffect(() => {
        if (refetchRequests) {
            fetchRequestsData();
        }
      }, [refetchRequests, fetchRequestsData]);
      
      useEffect(() => {
        if (requestsLog.length > 0) {
            calculateAllRoutes();
        }
      }, [requestsLog, calculateAllRoutes]);
      
    const handleAccept = async (request) => {
        setAcceptedRequest(request)
        setAcceptedRequestId(request.id)
        const destination = {
            userStreet: request.address.userStreet,
            userCity: request.address.userCity,
            userState: request.address.userState,
            userZip: request.address.userZip
        };
        setSelectedDestination(formatAddress(destination));
        const routeInfo = await calculateRoute(snowtechLocation, destination, selectedTravelMode);
        if (routeInfo) {
            setDistance(routeInfo.distance); // set in context state
            setDuration(routeInfo.duration); // set in context state
            setDirectionResponse(routeInfo.directions); // set in context state
        }
        const url = `/requests/${request.id}/accept`;
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerId: request.cart[0].userId,
                stages: {
                    accepted: true
                }
            })
        };

        try {
            const response = await customFetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();
            console.log('Job accepted:', responseData);

            setRequestsLog((currentRequests) => currentRequests.map((req) => {
                if (req.id === request.id) {
                    return {...req, stages: {...req.stages, accepted:true}};
                }
                return req;
            }))
        } catch (error) {
            console.error('Error accepting the job:', error);
        }
    };

    return (
        <>
            <div className='requestsList'>
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
                                <p className='objectTypes'>{objectTypes}</p>
                                <p className='more-details' onClick={() => showMoreDetails(request)}>More Details</p>
                            </div>
                            <div className='request-bottom'>
                                <div className='request-bottom-left'>
                                    <button className='accept-request' onClick={() => handleAccept(request)}>
                                        { acceptedRequestId === request.id ? 'Accepted' : 'Accept'}
                                    </button>
                                    <p>${amount}</p>
                                </div>
                                <div className='distance'>{request.distance || 'Calculating...'}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {moreDetailsOverlay && selectedItemDetails &&
                <div className='overlay'>
                    <div className='request-object-details'>
                        <div className='top-area'>
                            <h1>{selectedItemDetails.objectTypes}</h1>
                            <X onClick={hideMoreDetails}/>
                        </div>
                        <div className='address-details'>
                            <p>
                                {selectedItemDetails.address.userName} | {selectedItemDetails.address.userStreet}, {selectedItemDetails.address.userCity}, {selectedItemDetails.address.userState} {selectedItemDetails.address.userZip}
                            </p>
                        </div>
                        <div className='cart-details'>
                            {selectedItemDetails.cart.map((item, index) => {
                                if (item.objectType === 'car') {
                                    return (
                                        <div key={index} className='service'>
                                            <p> Clear snow of vehicle: {item.makeAndModel}</p>
                                            <p>Color: {item.color}</p>
                                            { item.licensePlate ? <p>License Plate: {item.licensePlate}</p> : ''}
                                            { item.imagePath && <img className='image-cover' src={`${baseUrl}/${item.imagePath}`} alt="Uploaded car"/> }
                                            { item.carMessage !== '' && <p>Message: {item.carMessage}</p>}
                                        </div>
                                    )
                                } else if (item.objectType === 'driveway') {
                                    return (
                                        <div key={index} className='service'>
                                            {item.selectedSize === 'size1' && <p>10 x 24ft. (240 sq. ft.)<span className='price'>$40</span></p>}
                                            {item.selectedSize === 'size2' && <p>20 x 20 ft. (400 sq. ft.)<span className='price'>$60</span></p>}
                                            {item.selectedSize === 'size3' && <p>24 x 24 ft. (576 sq. ft.)<span className='price'>$80</span></p>}
                                            {item.selectedSize === 'size4' && <p>24 x 36 ft. (864 sq. ft.)<span className='price'>$110</span></p>}
                                            {item.imagePath && <img className='image-cover' src={`${baseUrl}/${item.imagePath}`} alt="Upload driveway"/>}
                                            { item.drivewayMessage !== '' && <p>Message: {item.drivewayMessage}</p>}
                                        </div>
                                    )
                                } else if (item.objectType === 'lawn') {
                                    return (
                                        <div key={index} className='service'>
                                            {item.walkway && <p>Clear Snow off walkway<span className='price'>$15</span></p>}
                                            {item.frontYard && <p>Clear Snow off front yard<span className='price'>$25</span></p>}
                                            {item.backyard && <p>Clear Snow off backyard<span className='price'>$25</span></p>}
                                            {item.imagePath && <img className='image-cover' src={`${baseUrl}/${item.imagePath}`} alt="Upload lawn"/>}
                                            { item.lawnMessage !== '' && <p>Message: {item.lawnMessage}</p>}
                                        </div>
                                    )
                                } else if (item.objectType === 'street') {
                                    return (
                                        <div key={index} className='service'>
                                            {item.from && <p>From: {item.from}</p>}
                                            {item.to && <p>To: {item.to}</p>}
                                            {<span className='price'>$25</span>}
                                            {item.imagePath && <img className='image-cover' src={`${baseUrl}/${item.imagePath}`} alt="Upload street"/>}
                                            {item.streetMessage !== '' && <p>Message: {item.streetMessage}</p>}
                                        </div>
                                    )
                                } else if (item.objectType === 'other') {
                                    return (
                                        <div key={index} className='service'>
                                            {item.selectedSize === 'job1' && <p>(100 sq. ft.)<span className='price'>$25</span></p>}
                                            {item.selectedSize === 'job2' && <p>(200 sq. ft.)<span className='price'>$35</span></p>}
                                            {item.selectedSize === 'job3' && <p>(300 sq. ft.)<span className='price'>$45</span></p>}
                                            {item.selectedSize === 'job4' && <p>(400 sq. ft.)<span className='price'>$55</span></p>}
                                            {item.imagePath && <img className='image-cover' src={`${baseUrl}/${item.imagePath}`} alt="Upload other"/>}
                                            {item.otherMessage !== '' && <p>Message: {item.otherMessage}</p>}
                                        </div>
                                    )
                                } else {
                                    return null;
                                }
                            })}
                        </div>
                        <div className='charge-details'>
                            <p>${(selectedItemDetails.charge.amount / 100).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            }
        </>   
    );
};

export default RequestsList;
