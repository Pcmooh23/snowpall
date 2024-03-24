import React, {useContext, useRef, useState, useEffect} from 'react';
import { ChevronUp, ImageIcon} from 'lucide-react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';
import { SnowPall_Pricing_Model } from './PricingModel';


const OtherService = () => {

  const {
    cart, setCart, setShouldRefetch, defaultWeather,
    active, toggleActive, currentWeather, basePrice,
    editingIndex, setEditingIndex, 
    otherFormData, setOtherFormData, 
    otherPreview, setOtherPreview
  } = useContext(SnowPallContext)

  const [dynamicPrices, setDynamicPrices] = useState({
    size1: 0,
    size2: 0,
    size3: 0,
    size4: 0
  });

  useEffect(() => {
    const weather = currentWeather || defaultWeather;
    const prices = {
      size1: SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'small'),
      size2: SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'medium'),
      size3: SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'large'),
      size4: SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'x-large'),
    };
    setDynamicPrices(prices);
  }, [currentWeather, basePrice]);

  const fileInputRef = useRef();
  const { customFetch } = useApi();
  const [error, setError] = useState('');

  const handleInputChange = (event) => {
    const { name, value } = event.target;
  
    // Declare newPrice at the beginning of the function
    let newPrice = basePrice;
  
    if (name === 'selectedSize') {
      // Assign newPrice based on the case
      const weather = currentWeather || defaultWeather;
      switch (value) {
        case 'job1':
          newPrice = SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'small');
          break;
        case 'job2':
          newPrice = SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'medium');
          break;
        case 'job3':
          newPrice = SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'large');
          break;
        case 'job4':
          newPrice = SnowPall_Pricing_Model(weather.temperature, weather.precipitationType, weather.precipitationIntensity, 'x-large');
          break;
        default:
          newPrice = basePrice;
          break;
      }
    }
  
    // Then use newPrice when setting state
    setOtherFormData(prevFormData => ({ ...prevFormData, [name]: value, price: newPrice }));
  };

  const resetOtherForm = () => {
    setOtherFormData({
      selectedSize: '',
      image: null,
      otherMessage: ''
    });
    setOtherPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('handle prices: ', dynamicPrices.size1.toFixed(2).toString(), dynamicPrices.size2.toFixed(2).toString(), dynamicPrices.size3.toFixed(2).toString(), dynamicPrices.size4.toFixed(2).toString())
    const formData = new FormData();
    formData.append('selectedSize', otherFormData.selectedSize);
    formData.append('job1Price', dynamicPrices.size1.toFixed(2).toString());
    formData.append('job2Price', dynamicPrices.size2.toFixed(2).toString());
    formData.append('job3Price', dynamicPrices.size3.toFixed(2).toString());
    formData.append('job4Price', dynamicPrices.size4.toFixed(2).toString());
    formData.append('otherMessage', otherFormData.otherMessage);
    formData.append('objectType', 'other');
    if (otherFormData.image) {
      formData.append('image', otherFormData.image);
    }

    const url = editingIndex === null ? '/other' : `/other/${cart[editingIndex].id}`;
    const options = {
      method: editingIndex === null ? 'POST' : 'PUT',
      body: formData,
    };

    try {
      const response = await customFetch(url, options);
      if (!response.ok) {
        throw new Error(`Failed to ${editingIndex === null ? 'create' : 'update'} other service: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Success:', data);
      setCart(currentCart => {
        const updatedCart = [...currentCart];
        if (editingIndex != null) {
          updatedCart[editingIndex] = data;
        } else {
          updatedCart.push(data);
        }
        return updatedCart;
      });
      resetOtherForm();
      setEditingIndex(null);
      setError('');
      setShouldRefetch(true);
      console.log('Success:', data.message || 'Other service saved successfully.');
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
        setOtherPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setOtherFormData({ ...otherFormData, image: file });
    }
  };

  const handleIconClick = () => {
    fileInputRef.current.click();
  };

  return (
    <>
        <div className="other service-box">
            <div id="s5" onClick={() => toggleActive('s5')} className={`service-box-cover ${active === "s5" ? "active-cover" : ""}`}>
                <p>Other</p>
                <ChevronUp className={`chevron-icon ${active === "s5" ? 'active' : ''}`}/>
            </div>
            <form id="s5" className={`service-box__detail ${active === "s5" ? "active-detail" : ""}`} onSubmit={handleSubmit}>
            <div className='other-service-top'>
              <div className='other-size-options'>
                <h1 className='other-header'>Job Size:</h1>
                <div className='other-options'>
                  <input 
                  type='radio'
                  value='job1'
                  name='selectedSize'
                  className='box' 
                  id='job1'
                  checked={otherFormData.selectedSize === 'job1'}
                  onChange={handleInputChange}
                  required/>
                  <label htmlFor='job1' className='other-service-label'>
                    <div className='service-button'>
                      <span className='circle'></span>
                      <span className='subject'>(100 sq. ft.)</span>
                    </div>
                    <span className='price'>${dynamicPrices.size1.toFixed(2)}</span>
                  </label>  
                  <input 
                  type='radio'
                  value='job2'
                  name='selectedSize'
                  className='box' 
                  id='job2'
                  checked={otherFormData.selectedSize === 'job2'}
                  onChange={handleInputChange}
                  required/>
                  <label htmlFor='job2' className='other-service-label'>
                    <div className='service-button'>
                      <span className='circle'></span>
                      <span className='subject'>(200 sq. ft.)</span>
                    </div>
                    <span className='price'>${dynamicPrices.size2.toFixed(2)}</span>
                  </label>
                  <input 
                  type='radio'
                  value='job3'
                  name='selectedSize'
                  className='box' 
                  id='job3'
                  checked={otherFormData.selectedSize === 'job3'}
                  onChange={handleInputChange}
                  required/>
                  <label htmlFor='job3' className='other-service-label'>
                    <div className='service-button'>
                      <span className='circle'></span>
                      <span className='subject'>(300 sq. ft.)</span>
                    </div>
                    <span className='price'>${dynamicPrices.size3.toFixed(2)}</span>
                  </label>
                  <input 
                  type='radio'
                  value='job4'
                  name='selectedSize'
                  className='box' 
                  id='job4'
                  checked={otherFormData.selectedSize === 'job4'}
                  onChange={handleInputChange}
                  required/>
                  <label htmlFor='job4' className='other-service-label'>
                    <div className='service-button'>
                      <span className='circle'></span>
                      <span className='subject'>(400 sq. ft.)</span>
                    </div>
                    <span className='price'>${dynamicPrices.size4.toFixed(2)}</span>
                  </label>
                </div>
              </div> 
              <div className='other-upload-area'>
                {otherPreview ? (
                  <img 
                  src={otherPreview} 
                  alt="Preview" 
                  className="uploaded-image-preview"
                  style={{ maxWidth: '100px', cursor: 'pointer' }}
                  onClick={handleIconClick}/>) : (
                  <div htmlFor='image-upload' className='other-upload-label' onClick={handleIconClick}>
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
                className='other-message' 
                placeholder='Opional Message: My tip depends on your the performance.'
                name='otherMessage'
                value={otherFormData.otherMessage}
                onChange={handleInputChange}/>
              <div className='other service-detail-bottom'>
                <div className='bottom-buttons'>
                  <button type='submit' className='push'>Push</button>
                  <button className='express'>Express Checkout</button>
                </div>
                <p onClick={() => resetOtherForm()} className='reset'>RESET</p>
              </div>
              {error && <p className="error">{error}</p>}
            </form>
        </div>
    </>
  )
}

export default OtherService
