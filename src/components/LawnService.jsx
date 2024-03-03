import React, {useContext, useRef, useState, useEffect} from 'react';
import { ChevronUp, ImageIcon, Check } from 'lucide-react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';
import { SnowPall_Pricing_Model } from './PricingModel';

const LawnService = () => {

    const {
      cart, setCart, setShouldRefetch,
      active, toggleActive, currentWeather,
      editingIndex, setEditingIndex,
      lawnFormData, setLawnFormData,
      lawnPreview, setLawnPreview
    } = useContext(SnowPallContext);

  const fileInputRef = useRef();
  const { customFetch } = useApi();
  const [error, setError] = useState('');

    // Initialize state for dynamic prices
    const [dynamicPrices, setDynamicPrices] = useState({
      walkway: null,
      frontYard: null,
      backyard: null
    });

  // Function to calculate prices
  const calculatePrices = () => {
    return {
      walkway: SnowPall_Pricing_Model(
        currentWeather.temperature,
        currentWeather.precipitationType,
        currentWeather.precipitationIntensity,
        'small'
      ),
      frontYard: SnowPall_Pricing_Model(
        currentWeather.temperature,
        currentWeather.precipitationType,
        currentWeather.precipitationIntensity,
        'medium'
      ),
      backyard: SnowPall_Pricing_Model(
        currentWeather.temperature,
        currentWeather.precipitationType,
        currentWeather.precipitationIntensity,
        'medium'
      )
    };
  };

  // Calculate and set prices when currentWeather changes
  useEffect(() => {
    if (currentWeather) {
      setDynamicPrices(calculatePrices());
    }
  }, [currentWeather, calculatePrices]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === 'checkbox') {
      // Update the state for checkboxes
      setLawnFormData({ ...lawnFormData, [name]: checked });
    } else {
      // Update the state for other inputs like 'textarea'
      setLawnFormData({ ...lawnFormData, [name]: value });
    }
  };
  

  const resetLawnForm = () => {
    setLawnFormData({
      walkway: false,
      frontYard: false,
      backyard: false,
      image: null,
      lawnMessage: ''
    });
    setLawnPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    console.log(lawnFormData.lawnMessage)

    const formData = new FormData();
    formData.append('walkway', lawnFormData.walkway);
    formData.append('frontYard',lawnFormData.frontYard);
    formData.append('backyard', lawnFormData.backyard);
    formData.append('walkwayPrice', dynamicPrices.walkway.toString());
    formData.append('frontYardPrice', dynamicPrices.frontYard.toString());
    formData.append('backyardPrice', dynamicPrices.backyard.toString());
    formData.append('lawnMessage', lawnFormData.lawnMessage);
    formData.append('objectType', 'lawn');
    if (lawnFormData.image) {
      formData.append('image', lawnFormData.image);
    }

    const url = editingIndex === null ? `/lawn` : `/lawn/${cart[editingIndex].id}`;
    const options = {
      method: editingIndex === null ? 'POST' : 'PUT',
      body: formData,
    };
    
    try {
      const response = await customFetch(url, options);
      if (!response.ok) {
        throw new Error(`Failed to ${editingIndex === null ? 'create' : 'update'} lawn service: ${response.statusText}`);
      }
  
      const data = await response.json();
      setCart((currentCart) => {
        const updatedCart = [...currentCart];
        if (editingIndex !== null) {
          updatedCart[editingIndex] = data;
        } else {
          updatedCart.push(data);
        }
        return updatedCart;
      });
  
      resetLawnForm();
      setEditingIndex(null);
      setError('');
      setShouldRefetch(true);
      console.log('Success:', data.message || 'Lawn service saved successfully.');
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
        setLawnPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setLawnFormData({ ...lawnFormData, image: file });
    }
  };

  const handleIconClick = () => {
    fileInputRef.current.click();
  };

  return (
    <>
       <div className="lawn service-box">
            <div id="s3" onClick={() => toggleActive('s3')} className={`service-box-cover ${active === "s3" ? "active-cover" : ""}`}>
                <p>Lawn Service</p>
                <ChevronUp className={`chevron-icon ${active === "s3" ? 'active' : ''}`}/>
            </div>
            <form id="lawn-service-form" className={`service-box__detail ${active === "s3" ? "active-detail" : ""}`} onSubmit={handleSubmit}>
              <div className='lawn-service-top'>
                <div className='lawn-service-types'>
                  <label className='lawn-label'>
                    <input 
                      type='checkbox' 
                      name='walkway'
                      checked={lawnFormData.walkway}
                      onChange={handleInputChange}
                      className='hidden-checkbox'/>
                    <div className='lawn-task'>
                      <span className='checkmark'>
                        {lawnFormData.walkway && <Check className='check-icon'/>}
                      </span>
                      <p className='lawn-detail'>Clear Snow off walkway</p>
                    </div>
                    <span className='price'>${dynamicPrices.walkway?.toFixed(2)}</span>
                  </label>
                  <label className='lawn-label'>
                    <input 
                      type='checkbox' 
                      name='frontYard'
                      checked={lawnFormData.frontYard}
                      onChange={handleInputChange}
                      className='hidden-checkbox'/>
                    <div className='lawn-task'>
                      <span className='checkmark'>
                        {lawnFormData.frontYard && <Check className='check-icon'/>}
                      </span>
                      <p className='lawn-detail'>Clear Snow off front yard</p>
                    </div>
                    <span className='price'>${dynamicPrices.frontYard?.toFixed(2)}</span>
                  </label>
                  <label className='lawn-label'>
                    <input 
                      type='checkbox' 
                      name='backyard'
                      checked={lawnFormData.backyard}
                      onChange={handleInputChange}
                      className='hidden-checkbox'/>
                    <div className='lawn-task'>
                      <span className='checkmark'>
                      {lawnFormData.backyard && <Check className='check-icon'/>}
                      </span>
                      <p className='lawn-detail'>Clear Snow off backyard</p>
                    </div>                
                    <span className='price'>${dynamicPrices.backyard?.toFixed(2)}</span>
                  </label>
                </div>
                <div className='lawn-upload-area'>
                  {lawnPreview ? (
                    <img 
                    src={lawnPreview}
                    alt="Preview" 
                    className="uploaded-image-preview"
                    style={{ maxWidth: '100px', cursor: 'pointer' }}
                    onClick={handleIconClick}
                    />) : (
                    <div htmlFor='image-upload' className='lawn-upload-label' onClick={handleIconClick}>
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
                  className='lawn-message' 
                  placeholder='Opional Message: My tip depends on your the performance.'
                  name='lawnMessage'
                  value={lawnFormData.lawnMessage}
                  onChange={handleInputChange}
                  />
                <div className='driveway service-detail-bottom'>
                    <div className='bottom-buttons'>
                    <button type='submit' className='push'>Push</button>
                    <button className='express'>Express Checkout</button>
                    </div>
                    <p onClick={resetLawnForm} className='reset'>RESET</p>
                </div>
                {error && <p className="error">{error}</p>}
            </form>
        </div>
    </>
  )
}

export default LawnService
