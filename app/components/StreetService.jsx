import React, {useContext, useRef, useState} from 'react';
import { ChevronUp, ImageIcon } from 'lucide-react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';
import { SnowPall_Pricing_Model } from './PricingModel';

const StreetService = () => {

    const {
        cart, setCart, setShouldRefetch, defaultWeather,
        active, toggleActive, currentWeather, basePrice,
        editingIndex, setEditingIndex, 
        streetFormData, setStreetFormData,
        streetPreview, setStreetPreview
    } = useContext(SnowPallContext)

    const fileInputRef = useRef();
    const { customFetch } = useApi();
    const [error, setError] = useState('');

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setStreetFormData({ ...streetFormData, [name]: value });
    };

    const resetStreetForm = () => {
        setStreetFormData({
            from: '',
            to: '',
            image: null,
            streetMessage: ''
        });
        setStreetPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }; 

    const handleSubmit = async (event) => {
        event.preventDefault();
        const weather = currentWeather || defclaultWeather;
        const price = SnowPall_Pricing_Model(
            weather.temperature,
            weather.precipitationType,
            weather.precipitationIntensity,
            'medium' // The job size is medium for demo purposes
        );
        
        const formData = new FormData();
        formData.append('from', streetFormData.from);
        formData.append('to', streetFormData.to);
        formData.append('price', price.toString()); 
        formData.append('streetMessage', streetFormData.streetMessage);
        formData.append('objectType', 'street');
        if (streetFormData.image) {
            formData.append('image', streetFormData.image); 
        }

        const url = editingIndex === null ? '/street' : `/street/${cart[editingIndex].id}`;
        const options = {
            method: editingIndex === null ? 'POST' : 'PUT',
            body: formData,
        };

        try {
            const response = await customFetch(url, options);
            if (!response.ok) {
                throw new Error(`Failed to ${editingIndex === null ? 'create' : 'update'} street service: ${response.statusText}`);
            }

            const data = await response.json();
            setCart((currentCart) => {
                const updatedCart = [...currentCart];
                if (editingIndex != null) {
                    updatedCart[editingIndex] = data;
                } else {
                    updatedCart.push(data);
                }
                return updatedCart;
            });
            resetStreetForm();
            setEditingIndex(null);
            setError(''); 
            setShouldRefetch(true);
            console.log('Success:', data.message || 'Street service saved successfully.');
        } catch (error) {
            console.error('Error:', error);
            setError(error.message || 'An error occurred.');
        }
    };

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setStreetPreview(reader.result);
            };
            reader.readAsDataURL(file);
            setStreetFormData({ ...streetFormData, image: file });
        }
    };

    const handleIconClick = () => {
        fileInputRef.current.click();
    };

  return (
    <>
        <div className="street service-box">
            <div id="s4" onClick={() => toggleActive('s4')} className={`service-box-cover ${active === "s4" ? "active-cover" : ""}`}>
                <p>Street Service</p>
                <ChevronUp className={`chevron-icon ${active === "s4" ? 'active' : ''}`}/>
            </div>
            <form id="street-service-form" className={`service-box__detail ${active === "s4" ? "active-detail" : ""}`} onSubmit={handleSubmit}>
                <div className='street-service-top'>
                    <div className='from-to'>
                        <p className='address-word'>From:</p>
                        <input 
                            className='address' 
                            placeholder='Ex: 123 Main Street'
                            name='from'
                            value={streetFormData.from}
                            onChange={handleInputChange}
                            required/>
                        <p className='address-word'>To:</p>
                        <input 
                            className='address' 
                            placeholder='Ex: 124 Main Street'
                            name='to'
                            value={streetFormData.to}
                            onChange={handleInputChange}/>
                    </div>
                    <div className='street-upload-area'>
                        {streetPreview ? (
                            <img 
                            src={streetPreview} 
                            alt="Preview" 
                            className="uploaded-image-preview"
                            style={{ maxWidth: '100px', cursor: 'pointer' }}
                            onClick={handleIconClick}/>) : (
                            <div htmlFor='image-upload' className='street-upload-label' onClick={handleIconClick}>
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
                    className='street-message' 
                    placeholder='Opional Message: My tip depends on your the performance.'
                    name='streetMessage'
                    value={streetFormData.streetMessage}
                    onChange={handleInputChange}/>
                <div className='street service-detail-bottom'>
                    <div className='bottom-buttons'>
                        <button type='submit' className='push'>Push</button>
                        <button className='express'>Express Checkout</button>
                    </div>
                    <p onClick={() => resetStreetForm()} className='reset'>RESET</p>
                </div>
                {error && <p className="error">{error}</p>}
            </form>
        </div>
    </>
  )
}

export default StreetService
