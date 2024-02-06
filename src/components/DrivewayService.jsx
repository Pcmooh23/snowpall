import React, {useContext, useRef, useState} from 'react';
import { ChevronUp, ImageIcon } from "lucide-react";
import { SnowPallContext } from "./SnowPallContext";
import { useApi } from '../useApi';

const DrivewayService = () => {

  const {
    cart, setCart, setShouldRefetch,
    active, toggleActive, 
    editingIndex, setEditingIndex,
    drivewayFormData, setDrivewayFormData, 
    drivewayPreview, setDrivewayPreview
  } = useContext(SnowPallContext);

  const fileInputRef = useRef();
  const { customFetch } = useApi();
  const [error, setError] = useState('');

  const handleInputChange = (event) => {
    const { name, value, type } = event.target;
    setDrivewayFormData({ ...drivewayFormData, [name]: type === 'radio' ? value : value });
  };

  const resetDrivewayForm = () => {
    setDrivewayFormData({
      selectedSize: '',
      image: null,
      drivewayMessage: ''
    });
    setDrivewayPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
  
    const formData = new FormData();
    formData.append('selectedSize', drivewayFormData.selectedSize);
    formData.append('drivewayMessage', drivewayFormData.drivewayMessage);
    formData.append('objectType', 'driveway');
    if (drivewayFormData.image) {
      formData.append('image', drivewayFormData.image);
    }
  
    const url = editingIndex === null ? '/driveway' : `/driveway/${cart[editingIndex].id}`;
    const options = {
      method: editingIndex === null ? 'POST' : 'PUT',
      body: formData,
    };
  
    try {
      const response = await customFetch(url, options);
  
      if (!response.ok) {
        throw new Error(`Failed to ${editingIndex == null ? 'create' : 'update'} driveway service: ${response.statusText}`);
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
  
      resetDrivewayForm();
      setEditingIndex(null);
      setError('');
      setShouldRefetch(true);
      console.log('Success:', data.message || 'Driveway service saved successfully.');
    } catch (error) {
      console.error('Error:', error.message);
      setError(error.message || 'An error occurred.');
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDrivewayPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setDrivewayFormData({ ...drivewayFormData, image: file });
    }
  };

  const handleIconClick = () => {
    fileInputRef.current.click();
  };
  
  return (
    <>
      <div className="driveway service-box">
        <div id="s2" onClick={() => toggleActive("s2")} className={`service-box-cover ${active === "s2" ? "active-cover" : ""}`}>
          <p>Driveway Service</p>
          <ChevronUp className={`chevron-icon ${active === "s2" ? 'active' : ''}`}/>
        </div>
        <form id="driveway-service-form" className={`service-box__detail ${active === "s2" ? "active-detail" : ""}`} onSubmit={handleSubmit}>
          <div className='driveway-service-top'>
            <div className='driveway-size-options'>
              <h1 className='driveway-header'>Driveway Size:</h1>
              <div className='driveway-options'>
                <input 
                type='radio'
                value='size1'
                name='selectedSize'
                className='box' 
                id='size1'
                checked={drivewayFormData.selectedSize === 'size1'}
                onChange={handleInputChange}
                required/>
                <label htmlFor='size1' className='driveway-service-label'>
                  <div className='service-button'>
                    <span className='circle'></span>
                    <span className='subject'>10 x 24ft. (240 sq. ft.)</span>
                  </div>
                  <span className='price'>$40</span>
                </label>  
                <input 
                type='radio'
                value='size2'
                name='selectedSize'
                className='box' 
                id='size2'
                checked={drivewayFormData.selectedSize === 'size2'}
                onChange={handleInputChange}
                required/>
                <label htmlFor='size2' className='driveway-service-label'>
                  <div className='service-button'>
                    <span className='circle'></span>
                    <span className='subject'>20 x 20 ft. (400 sq. ft.)</span>
                  </div>
                  <span className='price'>$60</span>
                </label>
                <input 
                type='radio'
                value='size3'
                name='selectedSize'
                className='box' 
                id='size3'
                checked={drivewayFormData.selectedSize === 'size3'}
                onChange={handleInputChange}
                required/>
                <label htmlFor='size3' className='driveway-service-label'>
                  <div className='service-button'>
                    <span className='circle'></span>
                    <span className='subject'>24 x 24 ft. (576 sq. ft.)</span>
                  </div>
                  <span className='price'>$80</span>
                </label>
                <input 
                type='radio'
                value='size4'
                name='selectedSize'
                className='box' 
                id='size4'
                checked={drivewayFormData.selectedSize === 'size4'}
                onChange={handleInputChange}
                required/>
                <label htmlFor='size4' className='driveway-service-label'>
                  <div className='service-button'>
                    <span className='circle'></span>
                    <span className='subject'>24 x 36 ft. (864 sq. ft.)</span>
                  </div>
                  <span className='price'>$110</span>
                </label>
              </div>
            </div> 
            <div className='driveway-upload-area'>
              {drivewayPreview ? (
                <img 
                src={drivewayPreview} 
                alt="Preview" 
                className="uploaded-image-preview"
                style={{ maxWidth: '100px', cursor: 'pointer' }}
                onClick={handleIconClick}/>) : (
                <div htmlFor='image-upload' className='driveway-upload-label' onClick={handleIconClick}>
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
            className='driveway-message' 
            placeholder='Opional Message: My tip depends on your the performance.'
            name='drivewayMessage'
            value={drivewayFormData.drivewayMessage}
            onChange={handleInputChange}/>
          <div className='driveway service-detail-bottom'>
            <div className='bottom-buttons'>
              <button type='submit' className='push'>Push</button>
              <button className='express'>Express Checkout</button>
            </div>
            <p onClick={() => resetDrivewayForm()} className='reset'>RESET</p>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </>
  );
}

export default DrivewayService;


