import React, { createContext, useState, useRef, useEffect, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
/* global google */ //This is needed to use the google object 
const libraries = ['places']; 
// Created context.
export const SnowPallContext = createContext();

// Provider component.
export const SnowPallProvider = ({ children }) => {

  // The main url endpoint for my backend server.
  const baseUrl = process.env.REACT_APP_SERVER_URL;

  // So each service component has access to the weather data when the user either logs in or registers.
  let currentWeather;

  try {
    const currentWeatherString = localStorage.getItem(`${localStorage.getItem('currentUserId')}_currentWeather`);
    currentWeather = currentWeatherString ? JSON.parse(currentWeatherString) : null;
  } catch (error) {
    console.error("Parsing error in currentWeather:", error);
    currentWeather = null; // Default to null if parsing fails
  }
  const basePrice = 15;
  const defaultWeather = {
    temperature: 32,
    precipitationType: 'snow',
    precipitationIntensity: 'heavy',
  };

  // Set userID upon login.
  const [userId, setUserId] = useState(null);

  // Authentication state management.
  const [accessToken, setAccessToken] = useState(null);

  // Props for the LoginPage.
  const registerLinkRef = useRef(null);
  const loginLinkRef = useRef(null);
  const pageFormRef = useRef(null);
  const loginRef = useRef(null);
  const iconCloseRef = useRef(null);
  const signUpRef = useRef(null);
  const loginFormRef = useRef(null);
  const registerFormRef = useRef(null);

  const loginActive = () => {
    const pageForm = pageFormRef.current;
    const loginForm = loginFormRef.current;
    const registerForm = registerFormRef.current;
    if (pageForm && loginForm && registerForm) {
      pageForm.classList.add('active-popup');
      pageForm.classList.remove('register-active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
    }
  };

  const registerActive = () => {
    const pageForm = pageFormRef.current;
    const loginForm = loginFormRef.current;
    const registerForm = registerFormRef.current;
    if (pageForm && loginForm && registerForm) {
      pageForm.classList.add('active-popup', 'register-active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
    }
  };

  const [loginName, setLoginName] = useState('');
  // Props for HomePage services.
  const [active, setActive] = useState('');
  const [cart, setCart] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [shouldRefetch, setShouldRefetch] = useState(true); 
  const [carPreview, setCarPreview] = useState(null);
  const [drivewayPreview, setDrivewayPreview] = useState(null);
  const [streetPreview, setStreetPreview] = useState(null);
  const [lawnPreview, setLawnPreview] = useState(null);
  const [otherPreview, setOtherPreview] = useState(null);
  const [carFormData, setCarFormData] = useState({
    checkedService: false,
    makeAndModel: '',
    color: '',
    licensePlate: '',
    image: null,
    carMessage: '',
  });
  const [drivewayFormData, setDrivewayFormData] = useState({
    selectedSize: '',
    image: null,
    drivewayMessage: '',
    price: 0,
  });
  const [lawnFormData, setLawnFormData] = useState({
    walkway: false,
    frontYard: false,
    backyard: false,
    image: null,
    lawnMessage: '',
 });
  const [streetFormData, setStreetFormData] = useState({
    from: '',
    to: '',
    image: null,
    streetMessage: ''
  });
  const [otherFormData, setOtherFormData] = useState({
    selectedSize: '',
    image: null,
    otherMessage: ''
  });
  // Opens the cover for the individual services so users can selct what they want to get done.
  const toggleActive = (id) => {
    setActive(active === id ? "" : id);
  };

  // Props for the contents of the SubmitRequest components.
  const [addressLog, setAddressLog] = useState([]);
  const [selectedAddressForUse, setSelectedAddressForUse] = useState(null);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
  const [addressInfo, setAddressInfo] = useState({
    userName: '',
    userNumber: '',
    userStreet: '',
    userUnit: '',
    userCity: '',
    userState: '',
    userZip: ''
  });

  const fetchAddresses = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('currentUserId') ? localStorage.getItem(`${localStorage.getItem('currentUserId')}_accessToken`) : null;
      if (!accessToken) {
        console.error('No access token available.');
        return;
      }
      const response = await fetch(`${baseUrl}/addresses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include' 
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAddressLog(data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  }, [baseUrl]);
  
  // Use useRef to make a reference to the PaymentArea component itself.
  const paymentRef = useRef();
  // Calculate the total based on cart items
  const calculateTotal = () => {
    let total = 0;
    if (Array.isArray(cart)) {
      cart.forEach(item => {
        if (item.objectType === 'car' && item.checkedService) {
          total += Number(item.price);
        } else if (item.objectType === 'driveway') {
          total += Number(item[`${item.selectedSize}Price`]);
        } else if (item.objectType === 'lawn') {
          if (item.walkway) total += Number(item.walkwayPrice);
          if (item.frontYard) total += Number(item.frontYardPrice);
          if (item.backyard) total += Number(item.backyardPrice);
        } else if (item.objectType === 'street') {
          total += Number(item.price);
        } else if (item.objectType === 'other') {
          total += Number(item[`${item.selectedSize}Price`]);
        }
      });
    }
    return total;
  };
  const total = calculateTotal();
  const estimatedTax = total * 0.1; // Assuming tax rate is 10%
  const grandTotal = total + estimatedTax;

  // Log to keep track of all live user requests.
  const [requestsLog, setRequestsLog] = useState([]);
  const [refetchRequests, setRefetchRequests] = useState(true)
  const [directionResponse, setDirectionResponse] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const selectedTravelMode =  localStorage.getItem('selectedTravelMode') ? localStorage.getItem('selectedTravelMode') : 'WALKING';
  const [directionsService, setDirectionsService] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const {isLoaded} = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_SNOWPALL_GOOGLE_MAPS_API_KEY,
    libraries
  })

  useEffect(() => {
    const initDirectionsService = () => {
      if (window.google) {
        setDirectionsService(new google.maps.DirectionsService());
      }
    };
  
    if (isLoaded) {
      initDirectionsService();
    }
  }, [isLoaded]);

 // Adjust the calculateRoute function to handle different types of input
const calculateRoute = async (origin, destination, travelMode) => {
  if (!directionsService) return null;

  let originLocation;
  let destinationLocation;

  // Check if the origin and destination are strings or coordinates
  if (origin && typeof origin === 'object' && 'userStreet' in origin) {
    originLocation = formatAddress(origin);
  } else if (origin && origin.lat && origin.lng) {
    originLocation = new google.maps.LatLng(origin.lat, origin.lng);
  } else {
    console.error('Invalid origin:', origin);
    return null;
  }

  if (destination && typeof destination === 'object' && 'userStreet' in destination) {
    destinationLocation = formatAddress(destination);
  } else if (destinationLocation && destinationLocation.lat && origin.lng) {
    destinationLocation = new google.maps.LatLng(destinationLocation.lat, destinationLocation.lng);
  } else {
    console.error('Invalid destination:', destinationLocation);
    return null;
  }

  try {
    const results = await directionsService.route({
      origin: originLocation,
      destination: destinationLocation,
      travelMode: google.maps.TravelMode[travelMode],
    });
    return {
      distance: results.routes[0].legs[0].distance.text,
      duration: results.routes[0].legs[0].duration.text,
      directions: results,
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    return null;
  }
};


  // Snowtech tools.
  const userID = localStorage.getItem('currentUserId');
  const snowtechLocationRaw = localStorage.getItem(`${userID}_snowtechLocation`);
  const snowtechLocation = snowtechLocationRaw ? JSON.parse(snowtechLocationRaw) : null;
  const formatAddress = (address) => {
    return `${address?.userStreet}, ${address?.userCity}, ${address?.userState} ${address?.userZip}`;
  };  
  const [currentJob, setCurrentJob] = useState({
    requestId: null,
    userId: null
  });

  const [acceptedRequest, setAcceptedRequest] = useState(null);
  const [acceptedRequestId, setAcceptedRequestId] = useState(null);


  const cancelRequestGlobal = () => {
      setAcceptedRequest(null); // or whatever logic you need to reset the accepted request
  };

  return (
    <SnowPallContext.Provider value={{
      // UserId management.
      userId, setUserId, baseUrl,

      // Authentication state management.
      accessToken, setAccessToken,

      //Login Props.
      registerLinkRef, loginLinkRef,
      pageFormRef, loginRef,
      iconCloseRef, signUpRef,
      loginFormRef, registerFormRef,
      loginName, setLoginName,
      registerActive, loginActive,
      // Services and checkout form props.
      active, setActive,
      toggleActive, cart, setCart,
      editingIndex, setEditingIndex,
      shouldRefetch, setShouldRefetch,
      carPreview, setCarPreview,
      drivewayPreview, setDrivewayPreview,
      streetPreview, setStreetPreview,
      lawnPreview, setLawnPreview,
      otherPreview, setOtherPreview,
      carFormData, setCarFormData,
      drivewayFormData, setDrivewayFormData,
      lawnFormData, setLawnFormData,
      streetFormData, setStreetFormData,
      otherFormData, setOtherFormData,
      currentWeather, basePrice,  defaultWeather,
      
      // SubmitRequest area props.
      addressLog, setAddressLog,
      addressInfo, setAddressInfo, fetchAddresses,
      selectedAddressForUse, setSelectedAddressForUse,
      selectedAddressIndex, setSelectedAddressIndex,
      paymentRef, total, estimatedTax, grandTotal,
      weatherData, setWeatherData,


      // Log all user active requests.
      requestsLog, setRequestsLog,
      refetchRequests, setRefetchRequests,
      snowtechLocation, formatAddress,
      distance, setDistance,
      duration, setDuration,
      selectedTravelMode,
      directionResponse, setDirectionResponse,
      selectedDestination, setSelectedDestination, calculateRoute,
      currentJob, setCurrentJob,
      acceptedRequest, setAcceptedRequest,
      cancelRequestGlobal,
      acceptedRequestId, setAcceptedRequestId,
      }}>
      {children}
    </SnowPallContext.Provider>
  );
};
