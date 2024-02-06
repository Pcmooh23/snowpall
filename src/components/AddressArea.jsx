import React, {useState, useContext, useEffect} from 'react';
import { X, Plus } from 'lucide-react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';

const AddressArea = () => {    
    const [isOverlayActive, setIsOverlayActive] = useState(false);
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    const [indexToEdit, setIndexToEdit] = useState(null);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
    const [selectedAddressForUse, setSelectedAddressForUse] = useState(null);
    const [addressLog, setAddressLog] = useState([]);
    const [addressInfo, setAddressInfo] = useState({
        userName: '',
        userNumber: '',
        userStreet: '',
        userUnit: '',
        userCity: '',
        userState: '',
        userZip: ''
    });

    const {userId} = useContext(SnowPallContext);
    const { customFetch } = useApi();
    
    const toggleOverlay = () => {
        setIsOverlayActive(!isOverlayActive);
    };

    const handleNewAddressClick = () => {
        setShowNewAddressForm(!showNewAddressForm);

        if (showNewAddressForm) {
            setIndexToEdit(null); 
            resetAddressForm();
        }
    };

    const resetAddressForm = () => {
        setAddressInfo({
            userName: '',
            userNumber: '',
            userStreet: '',
            userUnit: '',
            userCity: '',
            userState: '',
            userZip: ''
        });
    };

    const inputChange = (event) => {
        const {name, value} = event.target;
        setAddressInfo(prevAddressInfo => ({
            ...prevAddressInfo,
            [name]: value
        }));
    };

    const AddressSubmit = async (event) => {
        event.preventDefault();
    
        const addressData = { ...addressInfo };
        const url = indexToEdit === null ? '/address' : `/address/${addressLog[indexToEdit].id}`;
        const options = {
            method: indexToEdit === null ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressData),
        };
    
        try {
            const response = await customFetch(url, options);
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            await fetchAddresses(); // Refresh the address log
            resetAddressForm();
            setIndexToEdit(null);
            setShowNewAddressForm(false);
        } catch (error) {
            console.error('Error:', error);
        }
    };
    
    const editAddress = (itemIndex) => {
        const item = addressLog[itemIndex];

        setAddressInfo(item);
        setIndexToEdit(itemIndex);
        setShowNewAddressForm(true);
    }

    const removeAddress = async (itemIndex) => {
        const item = addressLog[itemIndex];
    
        const url = `/address/${item.id}`;
        const options = {
            method: 'DELETE',
        };
    
        try {
            const response = await customFetch(url, options);
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = response.status !== 204 ? await response.json() : null;
            if (data && data.error) {
                throw new Error(data.error);
            }
    
            setAddressLog(currentLog => currentLog.filter((_, index) => index !== itemIndex));
    
            if (selectedAddressIndex === itemIndex) {
                setSelectedAddressIndex(null);
            }

        } catch (error) {
            console.error('Error:', error);
        }
    };
    
    const setSelectedAddressAndStore = (index) => {
        setSelectedAddressIndex(index);
        localStorage.setItem(`${userId}_selectedAddressIndex`, index.toString());
    };
    
    const addressHandler = (index) => {
        if (index === null || index >= addressLog.length) return; // Guard clause if no address is selected.
        setSelectedAddressForUse(addressLog[index]);

        // Save selected Address for locaal Storage when the page closes and refreshes.
        const selectedAddress = addressLog[index];
        setSelectedAddressForUse(selectedAddress);
        localStorage.setItem(`${userId}_selectedAddressForUse`, JSON.stringify(selectedAddress));
    }; 

    const fetchAddresses = async () => {
        try {
            const response = await customFetch('/addresses');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setAddressLog(data);
        } catch (error) {
            console.error('Error fetching addresses:', error);
        }
    };    

    useEffect(() => {
        // Retrieving index for active radio address in user-addresses area.
        const savedAddressIndex = localStorage.getItem(`${userId}_selectedAddressIndex`);
        if (savedAddressIndex !== null) {
            setSelectedAddressIndex(parseInt(savedAddressIndex));
        }

        // Retrieving the array of address objects in the addressDB.
        fetchAddresses();

        // Retrieving the selected address from local storage.
        const savedAddress = localStorage.getItem(`${userId}_selectedAddressForUse`);
        if (savedAddress) {
            setSelectedAddressForUse(JSON.parse(savedAddress));
        }
    }, []);

  return (
    <>
        <div className='address-area'>
            <div className='order-top'>
                <h1>1. Address</h1>
                <p className='change-address' onClick={toggleOverlay}> Change</p>
            </div>
            <div className='user-location'>
                {selectedAddressForUse ? (
                    <>
                        <p>{selectedAddressForUse.userName}</p>
                        <p>{selectedAddressForUse.userStreet}</p>
                        <p>{selectedAddressForUse.userUnit}</p>
                        <p>{`${selectedAddressForUse.userCity}, ${selectedAddressForUse.userState} ${selectedAddressForUse.userZip}`}</p>
                    </>
                ) : (
                    <>
                        <p>No address selected.</p>
                    </>
                )}
            </div>
            {isOverlayActive && (
            <div className={`overlay`}>
                <div className='change-address-area'>
                    <div className='change-top'>
                        <h1>Addresses on File</h1>
                        <X className='x-out' size={30} onClick={toggleOverlay}/>
                    </div>
                    <div className='divider'></div>
                    <div className='addresses-container'>
                        <div className={`user-addresses ${showNewAddressForm ? 'hide-element' : ''}`}>
                            {addressLog.map((address, index) => (
                                <div key={address.id}>
                                    <input 
                                        className='address-radio' 
                                        name='addressSelection' 
                                        type='radio' 
                                        value={index} 
                                        id={`address${index}`}
                                        onChange={() => setSelectedAddressAndStore(index)}
                                        checked={selectedAddressIndex === index}/>
                                    <label htmlFor={`address${index}`} className='address-label'>
                                        <div className='address-holder'>
                                            <span className='circle'></span>
                                            <div className='location-container'>
                                                <p className='address-on-file'>
                                                {`${address.userName} | ${address.userStreet}, ${address.userUnit}, ${address.userCity}, ${address.userState}, ${address.userZip}`}
                                                </p>
                                                <div className='address-choices'>
                                                    <p className='edit-address' onClick={() => editAddress(index)}>Edit Address</p>
                                                    <p className='delete-address' onClick={() => removeAddress(index)}>Delete Address</p>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                        {showNewAddressForm ? (
                            <div className='new-address-overlay'>
                                <div className='new-address-container'>
                                    <div className='new-address-header'>
                                    <h2>{ indexToEdit !== null ? 'Edit Address' : 'Enter New Address'}</h2>
                                        <X className='x-out' size={30} onClick={handleNewAddressClick}/>
                                    </div>
                                    <div className='divider'></div>
                                    <form className='new-address-form' onSubmit={AddressSubmit}>
                                        <input 
                                            className='full-name detail' 
                                            value={addressInfo.userName} 
                                            type="text" 
                                            placeholder="Full name" 
                                            onChange={inputChange}
                                            name='userName'
                                            required/>
                                        <input 
                                            className='number detail' 
                                            value={addressInfo.userNumber} 
                                            type="text" 
                                            placeholder="Optional: Phone number" 
                                            onChange={inputChange}
                                            name='userNumber'/>
                                        <input 
                                            className='street detail' 
                                            value={addressInfo.userStreet} 
                                            type="text" 
                                            placeholder="Street address" 
                                            onChange={inputChange}
                                            name='userStreet'
                                            required/>
                                        <input 
                                            className='building detail'
                                            value={addressInfo.userUnit} 
                                            type="text" 
                                            placeholder="Optional: Apt/Building/Suite/Unit"
                                            onChange={inputChange}
                                            name='userUnit'/>
                                        <input 
                                            className='city detail' 
                                            value={addressInfo.userCity} 
                                            type="text" 
                                            placeholder="City Ex: New York" 
                                            onChange={inputChange}
                                            name='userCity'
                                            required/>
                                        <input 
                                            className='state detail' 
                                            value={addressInfo.userState} 
                                            type="text" 
                                            placeholder="State Ex: NY" 
                                            onChange={inputChange}
                                            name='userState'
                                            required/>
                                        <input 
                                            className='zip-code detail' 
                                            value={addressInfo.userZip} 
                                            type="text" 
                                            placeholder="Zip code" 
                                            onChange={inputChange}
                                            name='userZip'
                                            required/>
                                        <button className='save-address' type="submit">Save Address</button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className='add-new-address' onClick={handleNewAddressClick}>
                                <Plus/>
                                <p className='newly-added'>Add a new address</p>
                            </div>
                        )}
                        <button className='use-this-address' onClick={() => addressHandler(selectedAddressIndex)}>Use this address</button>
                    </div>
                </div>
            </div>
            )}
        </div>
    </>
  )
}

export default AddressArea
