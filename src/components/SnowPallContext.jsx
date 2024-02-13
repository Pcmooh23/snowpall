import React, { createContext, useState, useRef, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
/* global google */ //This is needed to use the google object 
const libraries = ['places']; 
// Created context.
export const SnowPallContext = createContext();

// Provider component.
export const SnowPallProvider = ({ children }) => {

   // The main url endpoint for my backend server.
  const baseUrl = process.env.REACT_APP_SERVER_URL;

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
    drivewayMessage: ''
  });
  const [lawnFormData, setLawnFormData] = useState({
    walkway: false,
    frontYard: false,
    backyard: false,
    image: null,
    lawnMessage: ''
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

  const fetchAddresses = async () => {
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
  };
  
  // Use useRef to make a reference to the PaymentArea component itself.
  const paymentRef = useRef();
  // Calculate the total based on cart items
  const calculateTotal = () => {
    let total = 0;
    if (Array.isArray(cart)) {
      cart.forEach(item => {
        if (item.objectType === 'car' && item.checkedService) {
          total += 20;
        } else if (item.objectType === 'driveway') {
          const prices = { size1: 40, size2: 60, size3: 80, size4: 110 };
          total += prices[item.selectedSize];
        } else if (item.objectType === 'lawn') {
          if (item.walkway) total += 15;
          if (item.frontYard) total += 25;
          if (item.backyard) total += 25;
        } else if (item.objectType === 'street') {
          total += 25;
        } else if (item.objectType === 'other') {
          const prices = { job1: 25, job2: 35, job3: 45, job4: 55 };
          total += prices[item.selectedSize];
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
  const selectedTravelMode = localStorage.getItem('selectedTravelMode');
  const [directionsService, setDirectionsService] = useState(null);
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


  const calculateRoute = async (origin, destination, travelMode) => {
    if (!directionsService) return null;

    try {
      const results = await directionsService.route({
        origin: formatAddress(origin),
        destination: formatAddress(destination),
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
  const snowtechLocation = JSON.parse(localStorage.getItem(`${userID}_snowtechLocation`));
  const formatAddress = (address) => {
    return `${address.userStreet}, ${address.userCity}, ${address.userState} ${address.userZip}`;
  };
  const [currentJob, setCurrentJob] = useState({
    requestId: null,
    userId: null
  });
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
      
      // SubmitRequest area props.
      addressLog, setAddressLog,
      addressInfo, setAddressInfo, fetchAddresses,
      selectedAddressForUse, setSelectedAddressForUse,
      selectedAddressIndex, setSelectedAddressIndex,
      paymentRef, total, estimatedTax, grandTotal,

      // Log all user active requests.
      requestsLog, setRequestsLog,
      refetchRequests, setRefetchRequests,
      snowtechLocation, formatAddress,
      distance, setDistance,
      duration, setDuration,
      selectedTravelMode,
      directionResponse, setDirectionResponse,
      selectedDestination, setSelectedDestination, calculateRoute,
      currentJob, setCurrentJob
      }}>
      {children}
    </SnowPallContext.Provider>
  );
};
