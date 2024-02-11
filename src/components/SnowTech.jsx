import React, { useState, useRef, useContext } from 'react';
import { Box, Button, ButtonGroup, Flex, HStack, IconButton, Input, Text } from '@chakra-ui/react'
import { FaBus, FaCar, FaLocationArrow, FaTimes, FaWalking,  } from 'react-icons/fa'
import { MdDirectionsBike } from "react-icons/md";
import MainHeader from "./MainHeader";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, DirectionsRenderer} from '@react-google-maps/api';
import { SnowPallContext } from './SnowPallContext';
import RequestsList from './RequestsList';

/* global google */ //This is needed to use the google object 
const libraries = ['places'];
const SnowTech = () => {
  
  const [map, setMap] = useState(/** @type google.maps.Map */ (null)); // Re-centering the map 
  const [directionResponse, setDirectionResponse] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const {requestsLog} = useContext(SnowPallContext);
  console.log(requestsLog)

  /** @type React.MutableRefObject<HTMLInputElements> */
  const originRef = useRef();
  /** @type React.MutableRefObject<HTMLInputElements> */
  const destinationRef = useRef();

  const snowtechLocation = JSON.parse(localStorage.getItem('snowtechLocation'));

  const localCenter = { lat:40.776676, lng: -73.971321 }
  
  const {isLoaded} = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_SNOWPALL_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  const calculateRoute = async () => {
    if (originRef.current.value === '' || destinationRef.current.value === '') {
      return; // If the current value of the origin input or destination input is empty the function stops.
    }
    // eslint-disable-next-line no-undef
    const directionsService = new google.maps.DirectionsService()
    const results = await directionsService.route({
      origin: originRef.current.value,
      destination: destinationRef.current.value,
      // eslint-disable-next-line no-undef
      travelMode: google.maps.TravelMode.WALKING
    })
    setDirectionResponse(results);
    setDistance(results.routes[0].legs[0].distance.text);
    setDuration(results.routes[0].legs[0].duration.text);
  }

  const clearRoute = () => {
    setDirectionResponse(null);
    setDistance('');
    setDuration('');
    originRef.current.value = '';
    destinationRef.current.value = '';
  }
  
  return (
    <>
      <MainHeader/>
      <div className='snowtech-container'>
        <div className='left-side-form'>
          <h1>Live Requests</h1>
          <div className='travel'>
            <h1> Set Travel Mode:</h1>
            <div className='methods-of-transport'>
              <label htmlFor='car' className='icon-container'>
                <FaCar className='transpo-icon'/>
              </label>
              <label htmlFor='bus' className='icon-container'>
                <FaBus className='transpo-icon'/>
              </label>
              <label htmlFor='walking' className='icon-container'>
                <FaWalking className='transpo-icon'/>
              </label>
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
            <GoogleMap center={localCenter} zoom={14} mapContainerStyle={{width: '100%', height: '100%'}}
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
          <Box className='route' p={4}  mt={10} bgColor='white' minW='container.md' zIndex={99} >
          <HStack spacing={4}>
            <Autocomplete>
              <Input type='text' placeholder='Origin' ref={originRef} />
            </Autocomplete>
            <Autocomplete>
              <Input type='text' placeholder='Destination' ref={destinationRef} />
            </Autocomplete>
            <ButtonGroup>
              <Button colorScheme='pink' type='submit' onClick={calculateRoute}>
                Cancel Request
              </Button>
              <IconButton aria-label='center back' icon={<FaLocationArrow/>} isRound onClick={() => map.panTo(localCenter)}/>
             {/* <IconButton aria-label='center back' icon={<FaTimes/>} onClick={clearRoute}/> */}
            </ButtonGroup>
          </HStack>
          <HStack spacing={4} mt={4} justifyContent='space-between'>
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