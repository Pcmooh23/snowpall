import React, { useState, useContext, useEffect} from 'react';
import { Box, Button, ButtonGroup, Flex, HStack, IconButton, Input, Text } from '@chakra-ui/react'
import { FaBus, FaCar, FaLocationArrow, FaWalking,  } from 'react-icons/fa'
import { MdDirectionsBike } from "react-icons/md";
import MainHeader from "./MainHeader";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer} from '@react-google-maps/api';
import { SnowPallContext } from './SnowPallContext';
import RequestsList from './RequestsList';
import { useApi } from '../useApi';

/* global google */ //This is needed to use the google object 
const libraries = ['places']; 
const SnowTech = () => {
  
  const [map, setMap] = useState(/** @type google.maps.Map */ (null)); // Re-centering the map 
  
  const [localCenter, setLocalCenter] = useState(null);
  const [isProximityClose, setIsProximityClose] = useState(false);

  const { 
    snowtechLocation, formatAddress, 
    directionResponse, setDirectionResponse, selectedTravelMode, calculateRoute,
    distance, setDistance, duration, setDuration, selectedDestination, setSelectedDestination
  } = useContext(SnowPallContext);
  const { customFetch } = useApi();
  
  const {isLoaded} = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_SNOWPALL_GOOGLE_MAPS_API_KEY,
    libraries
  })

  const geocodeAddress = async (address) => {
    if (!isLoaded) return; // Ensure Google Maps API is loaded
    const geocoder = new google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ address: formatAddress(address) });
      return response.results[0].geometry.location;
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
  
        // Check if the snowtech is within one foot of the destination
        const destinationCoords = new google.maps.LatLng(selectedDestination); // Assume selectedDestination is an object with lat and lng
        const distance = calculateDistance(
          currentLocation.lat, currentLocation.lng, 
          destinationCoords.lat(), destinationCoords.lng()
        );
  
        // Check if the distance is less than or equal to one foot (approximately 0.3 meters)
        if (distance <= 3.048) {
          setIsProximityClose(true);
        } else {
          setIsProximityClose(false);
        }
  
        // Recalculate the route from the current location to the destination
        const routeInfo = await calculateRoute(currentLocation, selectedDestination, selectedTravelMode);
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
  const cancelRequest = () => {
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
    
    // Reset the map to the initial center
    setMap((prevMap) => {
      prevMap.panTo(localCenter);
      return prevMap;
    });
  };

  /*
  const startJob = async () => {
    if (!isProximityClose) {
      alert('You need to be at the location to start the job.');
      return;
    }
    const url =  '/start-job';
    const options = {
        method:'POST' ,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId, requestId: currentRequestId }),
    };

    try {
      const response = await customFetch(url, options)

      if (!response.ok) {
        throw new Error('Problem starting the job');
      }
  
      const responseData = await response.json();
      console.log('Job started:', responseData);
  
    } catch (error) {
      console.error('Error starting the job:', error);
    }
  };
  */
  
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
                <Button className='request-button'>
                  Start Request
                </Button>
                <Button className='request-button'>
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