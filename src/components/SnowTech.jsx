import React, { useState, useContext, useEffect, useRef } from 'react';
import { Box, Button, ButtonGroup, Flex, HStack, IconButton, Text } from '@chakra-ui/react'
import { FaBus, FaCar, FaLocationArrow, FaWalking } from 'react-icons/fa'
import { MdDirectionsBike } from "react-icons/md";
import MainHeader from "./MainHeader";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { SnowPallContext } from './SnowPallContext';
import RequestsList from './RequestsList';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../useApi';

/* global google */ //This is needed to use the google object 
const libraries = ['places']; 
const SnowTech = () => {
  
  const [map, setMap] = useState(/** @type google.maps.Map */ (null)); // Re-centering the map 
  
  const [localCenter, setLocalCenter] = useState(null);
  const proximityCloseRef = useRef(null);

  const { 
    snowtechLocation, formatAddress, directionResponse, acceptedRequest,
    setDirectionResponse, selectedTravelMode, calculateRoute,
    distance, setDistance, duration, setDuration, setRequestsLog,
    selectedDestination, setSelectedDestination, cancelRequestGlobal, setAcceptedRequestId, acceptedRequestId
  } = useContext(SnowPallContext);
  const { customFetch } = useApi();
  const navigate = useNavigate();

  const {isLoaded} = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_SNOWPALL_GOOGLE_MAPS_API_KEY,
    libraries
  })

  const geocodeAddress = async (address) => {
    if (!isLoaded) return;
  
    const geocoder = new google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({address: formatAddress(address)});
      if (response.results && response.results.length > 0) {
        return response.results[0].geometry.location;
      } else {
        console.error(`Geocoding found no results for the address: ${address}`);
        return null;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };
  
  useEffect(() => {
    const getInitialCenter = async () => {
      if ( isLoaded) {
        const location = await geocodeAddress(snowtechLocation);
        if (location) {
          // Update your map's center state or pass it directly to your GoogleMap component
          setLocalCenter({ lat: location.lat(), lng: location.lng() });
        }
      }
    };
  
    getInitialCenter();

  }, [isLoaded]);

  useEffect(() => {
    const verifyOnboardingStatus = async () => {
      // Example endpoint to verify the snowtech's Stripe onboarding status
      const url = '/verify-stripe-onboarding';
      const options = {
        method: 'GET',
      };
      const response = await customFetch(url,options);
  
      if (response.ok) {
        const { isOnboardingCompleted } = await response.json();
        if (!isOnboardingCompleted) {
          // Redirect to onboarding if not completed
          navigate('/onboarding');
        }
      } else {
        // Handle error or incomplete status
        console.error('Failed to verify Stripe onboarding status');
        navigate('/onboarding');
      }
    };
  
    verifyOnboardingStatus();
  }, [customFetch, navigate]);
  

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  const handleTravelModeChange = (e) => {
    localStorage.setItem('selectedTravelMode', e.target.value);
  };

  // Function to start tracking the request
  const startRoute = async () => {
    if (!snowtechLocation || !selectedDestination) {
      alert('Origin or destination is missing.');
      return;
    }
  
    // Define a function to calculate distance between two coordinates
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // metres
      const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
  
      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
      const distance = R * c; // in metres
      return distance;
    };
    
    // Start tracking
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        // Update the map center to the current location
        setMap((prevMap) => {
          prevMap.panTo(currentLocation);
          return prevMap;
        });
        const destination = {
          userStreet: acceptedRequest.address.userStreet,
          userCity: acceptedRequest.address.userCity,
          userState: acceptedRequest.address.userState,
          userZip: acceptedRequest.address.userZip
        }
        const geocodedDestination = await geocodeAddress(destination);
        console.log('Geocoded destination:', geocodedDestination); 

        if (!geocodedDestination || typeof geocodedDestination.lat !== 'function' || typeof geocodedDestination.lng !== 'function') {
          console.error('Invalid geocoded destination:', geocodedDestination);
          return; // Exit the function if geocoding fails
        }

        const destinationLat = geocodedDestination.lat();
        const destinationLng = geocodedDestination.lng();
        // Check if the snowtech is within one foot of the destination

        console.log('This is the destination Coords:', destinationLat, destinationLng);

        const distance = calculateDistance(
          currentLocation.lat, currentLocation.lng, 
          destinationLat, destinationLng
        );

        console.log('This is the distance: ', distance);
        const distanceInFeet = distance * 3.28084;
        console.log('This is the distance in feet: ', distanceInFeet);
  
        // Check if the distance is less than or equal to approximately 200 feet or 61 meters.
        if (distanceInFeet <= 500) {
          proximityCloseRef.current = true;
          console.log('Proximity close:', proximityCloseRef.current);
        
        } else if (distanceInFeet > 500) {
          proximityCloseRef.current = false;
          console.log('Proximity not close:', proximityCloseRef.current);
        }
        // Recalculate the route from the current location to the destination
        const routeInfo = await calculateRoute(currentLocation, destination, selectedTravelMode);
        if (routeInfo) {
          setDirectionResponse(routeInfo.directions); // set in context state
        }
      },
      (error) => {
        console.error('Error watching position:', error);
      },
      {
        enableHighAccuracy: true,
      }
    );
  
    // Store the watchId in state or ref to clear it later
    localStorage.setItem('watchId', watchId.toString());
  };  

  // Function to cancel the request and stop tracking
  const cancelRequest = async () => {
    // Clear the watchPosition using the stored watchId
    const watchId = localStorage.getItem('watchId');
    if (watchId) {
      navigator.geolocation.clearWatch(parseInt(watchId));
      localStorage.removeItem('watchId');
    }

    // Reset states and selected destination
    setDirectionResponse(null);
    setDistance('');
    setDuration('');
    setSelectedDestination(null); // Clear the selected destination
    setAcceptedRequestId(null);
    
    // Reset the map to the initial center
    setMap((prevMap) => {
      prevMap.panTo(localCenter);
      return prevMap;
    });    
    const url = `/requests/${acceptedRequestId}/cancel`;
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: acceptedRequest.cart[0].userId,
        stages: {
            accepted: false
        }
      })
    };

    try {
      const response = await customFetch(url, options);

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      cancelRequestGlobal();

      setRequestsLog(currentRequests =>
          currentRequests.map(req =>
              req.id === acceptedRequest ? { ...req, stages: { ...req.stages, accepted: false } } : req
          )
      );
    } catch (error) {
      console.error('Error cancelling the request:', error);
    }
  };

  const startRequest = async () => {
    if (!proximityCloseRef.current) {
      alert('You need to be at the location to start the request.');
      return;
    }
    const url =  `/requests/${acceptedRequestId}/start`;
    const options = {
      method:'PUT' ,
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        requestId: acceptedRequest.id, 
        customerId: acceptedRequest.cart[0].userId,
        stages: {
          started: true
        }
      }),
    };

    try {
      const response = await customFetch(url, options)

      if (!response.ok) {
        throw new Error('Problem starting the request');
      }
  
      const responseData = await response.json();
      console.log('Job started:', responseData);
  
    } catch (error) {
      console.error('Error starting the request:', error);
    }
  };

  const completeRequest = async () => {
 
    const url =  `/requests/${acceptedRequestId}/complete`;
    const options = {
      method:'PUT' ,
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        requestId: acceptedRequest.id, 
        customerId: acceptedRequest.cart[0].userId,
        snowtechId: localStorage.getItem('currentUserId'),
        stages: {
          live: false,
          complete: true
        }
      }),
    };

    try {
      const response = await customFetch(url, options)

      if (!response.ok) {
        throw new Error('Problem completing the request');
      }
  
      const responseData = await response.json();
      console.log('Job complete:', responseData);
  
    } catch (error) {
      console.error('Error completing the request:', error);
    }
  };
  
  return (
    <>
      <MainHeader/>
      <div className='snowtech-container'>
        <div className='left-side-form'>
          <h1>Live Requests</h1>
          <div className='travel'>
            <h1> Set Travel Mode:</h1>
            <div className='methods-of-transport'>
              <input type="radio" id="car" name="transport" value="DRIVING" onChange={handleTravelModeChange} className="transpo-input" />
              <label htmlFor='car' className='icon-container'>
                <FaCar className='transpo-icon'/>
              </label>
              <input type="radio" id="bus" name="transport" value="TRANSIT" onChange={handleTravelModeChange} className="transpo-input" />
              <label htmlFor='bus' className='icon-container'>
                <FaBus className='transpo-icon'/>
              </label>
              <input type="radio" id="walking" name="transport" value="WALKING" onChange={handleTravelModeChange} className="transpo-input" />
              <label htmlFor='walking' className='icon-container'>
                <FaWalking className='transpo-icon'/>
              </label>
              <input type="radio" id="bike" name="transport" value="BICYCLING" onChange={handleTravelModeChange} className="transpo-input" />
              <label htmlFor='bike' className='icon-container'>
                <MdDirectionsBike className='transpo-icon'/>
              </label>
            </div>
          </div>
          <RequestsList/>
        </div>
        <Flex className='mapbox' position='relative' flexDirection='column' alignItems='center' bgColor='blue.200' h='550px' w='750px' >
          <Box position='absolute' left={0} top={0} h='100%' w='100%'>
            {/*display mapbox*/}
            <GoogleMap center={localCenter} zoom={16} mapContainerStyle={{width: '100%', height: '100%'}}
            options={{
              zoomControl: false, // Takes away the + and - icons that were on the bottom right.
              streetViewControl: false, // Takes away the little icon fella.
              mapTypeControl: false, // Takes away the satellite and Map controlls that were on the top left.
              fullscreenControl: false // Takes away the screen thing that was on the top left to make the map the full page.
            }}
            onLoad={(map) => {setMap(map)}}
            >
              <Marker position={localCenter}/>
              {directionResponse && <DirectionsRenderer directions={directionResponse}/>}
            </GoogleMap>
          </Box>
          <Box className='route' mt={10} bgColor='white' minW='container.md' zIndex={10} >
          <HStack >
            <div className='origin-dest'>
              <Text className='text' >Origin: {formatAddress(snowtechLocation)}</Text>
              <Text className='text'>Destination: {selectedDestination}</Text>
            </div>
            <ButtonGroup>
              <div className='request-buttons'>
                <Button className='request-button' onClick={startRoute}>
                Start Route
                </Button>
                <Button className='request-button' onClick={cancelRequest}>
                Cancel Request
                </Button>
                <Button className='request-button' onClick={startRequest}>
                  Start Request
                </Button>
                <Button className='request-button' onClick={completeRequest}>
                  Complete Request
                </Button>
              </div>
              <IconButton className='center-back' aria-label='center back' icon={<FaLocationArrow/>} isRound onClick={() => map.panTo(localCenter)}/>
             {/* <IconButton aria-label='center back' icon={<FaTimes/>} onClick={clearRoute}/> */}
            </ButtonGroup>
          </HStack>
          <HStack className='eta-area' >
            <Text>Distance: {distance} </Text>
            <Text>ETA: {duration} </Text>
          </HStack>
          </Box>
        </Flex>
      </div>
    </>
  )
}

export default SnowTech