import React, {useContext, useRef, useState } from 'react';
import { ChevronUp, ImageIcon } from 'lucide-react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';
import { SnowPall_Pricing_Model } from './PricingModel';

const CarService = () => {

    const {
        cart, setCart, currentWeather, basePrice,
        active, toggleActive, setShouldRefetch,
        editingIndex, setEditingIndex, 
        carFormData, setCarFormData, 
        carPreview, setCarPreview
    } = useContext(SnowPallContext);
    
    const fileInputRef = useRef();
    const { customFetch } = useApi();
    const [error, setError] = useState('');


    const jobSize = 'small';

    const dynamicPrice = currentWeather ? SnowPall_Pricing_Model(
        currentWeather.temperature,
        currentWeather.precipitationType,
        currentWeather.precipitationIntensity,
        jobSize
    ) : basePrice;

    const handleInputChange = ({ target: { name, value, type, checked } }) =>
    setCarFormData({ ...carFormData, [name]: type === 'checkbox' ? checked : value });  

    const resetCarForm = () => {
        setCarFormData({
            checkedService: false,
            makeAndModel: '',
            color: '',
            licensePlate: '',
            carMessage: '',
            image: null
        });
        setCarPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }; 

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Initialize FormData and append data from the form state
        const formData = new FormData();
        formData.append('checkedService', carFormData.checkedService);
        formData.append('makeAndModel', carFormData.makeAndModel);
        formData.append('color', carFormData.color);
        formData.append('licensePlate', carFormData.licensePlate);
        formData.append('carMessage', carFormData.carMessage);
        formData.append('price', dynamicPrice);
        formData.append('objectType', 'car');
        if (carFormData.image) {
            formData.append('image', carFormData.image); // This is the File object
        }

        // Determine the API URL and HTTP method based on the operation (add new or update)
        const url = editingIndex === null ? '/car' : `/car/${cart[editingIndex].id}`;
        const options = {
            method: editingIndex === null ? 'POST' : 'PUT',
            body: formData,
            // Note: 'headers' will be set by customFetch
        };

        try {
            const response = await customFetch(url, options);
            if (!response.ok) {
                // If the server response is not OK, throw an error to jump to the catch block
                throw new Error(`Failed to ${editingIndex === null ? 'create' : 'update'} car service: ${response.statusText}`);
            }
            const data = await response.json();

            // If the request was successful, update the cart state
            setCart(currentCart => {
                let updatedCart = [...currentCart];
                if (editingIndex !== null) {
                    // If updating an existing entry, replace it
                    updatedCart[editingIndex] = data;
                } else {
                    // If adding a new entry, append it
                    updatedCart.push(data);
                }
                return updatedCart;
            });

            resetCarForm(); // Reset form and any other state related to the car service entry
            setEditingIndex(null);
            setError(''); // Clear any previous errors
            setShouldRefetch(true); // Reset the ShouldRefetch in the CheckoutForm.jsx useEffect to true to trigger re-render
            console.log('Success:', data.message || 'Car service saved successfully.');
        } catch (error) {
            // Handle errors related to the API request
            console.error('Error:', error);
            setError(error.message || 'An error occurred.');
        }
    };

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCarPreview(reader.result);
          };
          reader.readAsDataURL(file);
          setCarFormData({ ...carFormData, image: file }); // Store the File object
        }
    };     

    const handleIconClick = () => {
        fileInputRef.current.click();
    };

    return (
    <>
        <div className="car service-box">
            <div id="s1" onClick={() => toggleActive('s1')} className={`service-box-cover  ${active === "s1" ? "active-cover" : ""}`}>
                <p>Car Service</p>
                <ChevronUp className={`chevron-icon ${active === "s1" ? 'active' : ''}`} />
            </div>
            <form id="car-service-form" className={`service-box__detail ${active === "s1" ? "active-detail" : ""}`} onSubmit={handleSubmit}>
                <input 
                    type='checkbox'
                    name='checkedService'
                    className='carServiceBox' 
                    id='car'
                    checked={carFormData.checkedService}
                    onChange={handleInputChange}
                    required/>
                <label htmlFor='car' className='car-service-label'>
                    <div className='service-button'>
                        <span className='circle'></span>
                        <span className='subject'>Clear snow of vehicle</span>
                    </div>
                    <span className='price'>${dynamicPrice}</span>
                </label>
                <div className='car-service-top'>
                    <div className='car-specs'>
                        <input 
                        className='car-spec' 
                        placeholder='Make & Model' 
                        name='makeAndModel'
                        value={carFormData.makeAndModel}
                        onChange={handleInputChange}
                        required/>
                        <input 
                        className='car-spec' 
                        placeholder='Color'
                        name='color'
                        value={carFormData.color}
                        onChange={handleInputChange}
                        required/>
                        <input 
                        className='car-spec' 
                        placeholder='License Plate'
                        name='licensePlate'
                        value={carFormData.licensePlate}
                        onChange={handleInputChange}
                        />
                    </div>
                    <div className='upload-area'>
                        {carPreview ? (
                            <img 
                            src={carPreview} 
                            alt="Preview" 
                            className="uploaded-image-preview"
                            style={{ maxWidth: '100px', cursor: 'pointer' }}
                            onClick={handleIconClick}/>) : (
                            <div htmlFor='image-upload' className='upload-label' onClick={handleIconClick}>
                            <ImageIcon size={90} className='imageIcon'/>
                            <p className='words'>Optional: Upload Image</p>
                        </div> )}
                        {<input 
                            id='image-upload'
                            type='file' 
                            name='image'
                            className='image-upload' 
                            accept="image/*" 
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            style={{ display: 'none' }}/>} 
                    </div>
                </div>
                <textarea 
                    rows='5' 
                    cols='20' 
                    className='carMessage' 
                    placeholder='Opional Message: My tip depends on your the performance.'
                    name='carMessage'
                    value={carFormData.carMessage}
                    onChange={handleInputChange}/>
                <div className='car service-detail-bottom'>
                    <div className='bottom-buttons'>
                        <button type='submit' className='push'>Push</button>
                        <button className='express'>Express Checkout</button>
                    </div>
                    <p onClick={() => resetCarForm()} className='reset'>RESET</p>
                </div>
                {error && <p className="error">{error}</p>}
            </form> 
        </div>
    </>
  )
}

export default CarService;
