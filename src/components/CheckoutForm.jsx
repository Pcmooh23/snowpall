import React, {useContext, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { SnowPallContext } from './SnowPallContext';
import { useApi } from '../useApi';

const CheckoutForm = () => {
    
    const {
        cart, setCart, toggleActive, baseUrl,
        setEditingIndex, shouldRefetch, setShouldRefetch,
        setCarFormData, setCarPreview, setDrivewayFormData, 
        setDrivewayPreview, setLawnFormData, setLawnPreview, 
        setStreetFormData, setStreetPreview, setOtherPreview,
        setOtherFormData
    } = useContext(SnowPallContext);
    
    const { customFetch } = useApi();

    const navigate = useNavigate();

    const handleContinueToCheckout = () => {
        navigate('/submit-request');
    }

    const editCarItem = (indexToEdit) => {
        const item = cart[indexToEdit];

        setCarFormData(item);
        setCarPreview(item.imagePath ? `${baseUrl}/${item.imagePath}` : null); // Check if imagePath exists and is not null, else set carPreview to null.
        setEditingIndex(indexToEdit); // Set editing index to know which item is being updated.
        toggleActive("s1"); // Optionally, toggle the active tab if needed.
    };
        
    const editDrivewayItem = (indexToEdit) => {
        const item = cart[indexToEdit];

        setDrivewayFormData(item);
        setDrivewayPreview(item.imagePath ? `${baseUrl}/${item.imagePath}` : null);
        setEditingIndex(indexToEdit);
        toggleActive("s2")
    }

    const editLawnItem = (indexToEdit) => {
        const item = cart[indexToEdit];
    
        setLawnFormData(item);
        setLawnPreview(item.imagePath ? `${baseUrl}/${item.imagePath}` : null);
        setEditingIndex(indexToEdit);
        toggleActive("s3")
    }

    const editStreetItem = (indexToEdit) => {
        const item = cart[indexToEdit];

        setStreetFormData(item);
        setStreetPreview(item.imagePath ? `${baseUrl}/${item.imagePath}` : null);
        setEditingIndex(indexToEdit);
        toggleActive("s4")
    }
    
    const editOtherItem = (indexToEdit) => {
        const item = cart[indexToEdit];

        setOtherFormData(item);
        setOtherPreview(item.imagePath ? `${baseUrl}/${item.imagePath}` : null);
        setEditingIndex(indexToEdit);
        toggleActive("s5")
    }

    const handleRemoveCarItem = async (indexToRemove) => {
        const item = cart[indexToRemove];
    
        const url = `/car/${item.id}`;
        const options = {
          method: 'DELETE',
        };
    
        try {
            // Use customFetch for the DELETE request
            const response = await customFetch(url, options);
    
            if (!response.ok) {
                // If the server response is not OK, throw an error
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            // Optional: Check if there's content to return (this might not be necessary for DELETE operations)
            const data = response.status !== 204 ? await response.json() : null;
            
            if (data && data.error) {
                // If there is a JSON error message, throw it
                throw new Error(data.error);
            }
    
            // Update state to reflect the item being removed
            setCart(currentCart => currentCart.filter((_, index) => index !== indexToRemove));
    
            // Optionally, if you created a blob URL for previewing images, revoke it here
            if (item.imagePath && item.imagePath.startsWith('blob:')) {
                URL.revokeObjectURL(item.imagePath);
            }
    
            setShouldRefetch(true); // Trigger a re-fetch to ensure cart is up-to-date
        } catch (error) {
            console.error('Error:', error);
        }
    };   

    const handleRemoveDrivewayItem = async (indexToRemove) => {
        const item = cart[indexToRemove];
    
        const url = `/driveway/${item.id}`;
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
    
            setCart(currentCart => currentCart.filter((_, index) => index !== indexToRemove));
    
            if (item.imagePath && item.imagePath.startsWith('blob:')) {
                URL.revokeObjectURL(item.imagePath);
            }
    
            setShouldRefetch(true);
        } catch (error) {
            console.error('Error:', error);
        }
    };
    

    const handleRemoveLawnItem = async (indexToRemove) => {
        const item = cart[indexToRemove];
    
        const url = `/lawn/${item.id}`;
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
    
            setCart(currentCart => currentCart.filter((_, index) => index !== indexToRemove));
    
            if (item.imagePath && item.imagePath.startsWith('blob:')) {
                URL.revokeObjectURL(item.imagePath);
            }
    
            setShouldRefetch(true); 
        } catch (error) {
            console.error('Error:', error);
        }
    };
    

    const handleRemoveStreetItem = async (indexToRemove) => {
        const item = cart[indexToRemove];
    
        const url = `/street/${item.id}`;
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
    
            setCart(currentCart => currentCart.filter((_, index) => index !== indexToRemove));
    
            if (item.imagePath && item.imagePath.startsWith('blob:')) {
                URL.revokeObjectURL(item.imagePath);
            }
    
            setShouldRefetch(true);
        } catch (error) {
            console.error('Error:', error);
        }
    };
    

    const handleRemoveOtherItem = async (indexToRemove) => {
        const item = cart[indexToRemove];
    
        const url = `/other/${item.id}`;
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
    
            setCart(currentCart => currentCart.filter((_, index) => index !== indexToRemove));
    
            if (item.imagePath && item.imagePath.startsWith('blob:')) {
                URL.revokeObjectURL(item.imagePath);
            }
    
            setShouldRefetch(true);
        } catch (error) {
            console.error('Error:', error);
        }
    };
    

    useEffect(() => {
        const fetchServicesData = async () => {
          try {
            const response = await customFetch('/services');
            if (!response.ok) {
              throw new Error('Failed to fetch services data');
            }
            const data = await response.json();
            setCart(data);
          } catch (error) {
            console.error('Error:', error);
          } finally {
            setShouldRefetch(false); 
          }
        };
      
        if (shouldRefetch) { 
          fetchServicesData();
        }
    }, [shouldRefetch]);

  return (
    <>
        <form className='checkout'>
            <div className='content-container'>
                {cart.map((item, index) => {
                    if (item.objectType === 'car') {
                        return (
                            <div key={index} className='checked-service'>
                                <p>Service: {item.checkedService ? "Clear snow of vehicle": "No service selected"}<span className='price'>${item.price}</span></p>
                                <p>Make & Model: {item.makeAndModel}</p>
                                <p>Color: {item.color}</p>
                                { item.licensePlate !== '' && <p>License Plate: {item.licensePlate}</p>}
                                {item.imagePath && <img
                                    className='image-cover'
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Uploaded car"
                                    />}
                                { item.carMessage !== '' && <p>Message: {item.carMessage}</p>}
                                <Pencil className='pencil-icon' onClick={() => editCarItem(index)} />
                                <Trash2 className='trash-icon' onClick={() => handleRemoveCarItem(index)}/>
                            </div>
                        );
                    } else if (item.objectType === 'driveway') {
                        return (
                            <div key={index} className='checked-service'>
                                {item.selectedSize === 'size1' && <p>10 x 24 ft. (240 sq. ft.)<span className='price'>${item.size1Price}</span></p>}
                                {item.selectedSize === 'size2' && <p>20 x 20 ft. (400 sq. ft.)<span className='price'>${item.size2Price}</span></p>}
                                {item.selectedSize === 'size3' && <p>24 x 24 ft. (576 sq. ft.)<span className='price'>${item.size3Price}</span></p>}
                                {item.selectedSize === 'size4' && <p>24 x 36 ft. (864 sq. ft.)<span className='price'>${item.size4Price}</span></p>}
                                {item.imagePath && <img 
                                    className='image-cover' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload driveway"/>}
                                { item.drivewayMessage !== '' && <p>Message: {item.drivewayMessage}</p>}
                                <Pencil className='pencil-icon' onClick={() => editDrivewayItem(index)}/>
                                <Trash2 className='trash-icon' onClick={() => handleRemoveDrivewayItem(index)}/>
                            </div>
                        );
                    } else if (item.objectType === 'lawn') {
                        return (
                            <div key={index} className='checked-service'>
                                {item.walkway && <p>Clear Snow off walkway<span className='price'>${item.walkwayPrice}</span></p>}
                                {item.frontYard && <p>Clear Snow off front yard<span className='price'>${item.frontYardPrice}</span></p>}
                                {item.backyard && <p>Clear Snow off backyard<span className='price'>${item.backyardPrice}</span></p>}
                                {item.imagePath && <img 
                                    className='image-cover' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload lawn"/>}
                                 { item.lawnMessage !== '' && <p>Message: {item.lawnMessage}</p>}
                                <Pencil className='pencil-icon' onClick={() => editLawnItem(index)}/>
                                <Trash2 className='trash-icon' onClick={() => handleRemoveLawnItem(index)}/>
                            </div>
                        )
                    } else if (item.objectType === 'street') {
                        return (
                            <div key={index} className='checked-service'>
                                {item.from && <p>From: {item.from}</p>}
                                {item.to && <p>To: {item.to}</p>}
                                {<span className='price'>${item.price}</span>}
                                {item.imagePath && <img 
                                    className='image-cover' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload street"/>}
                                { item.streetMessage !== '' && <p>Message: {item.streetMessage}</p>}
                                <Pencil className='pencil-icon' onClick={() => editStreetItem(index)}/>
                                <Trash2 className='trash-icon' onClick={() => handleRemoveStreetItem(index)}/>
                            </div>
                        )
                    } else if (item.objectType === 'other') {
                        return (
                            <div key={index} className='checked-service'>
                                {item.selectedSize === 'job1' && <p>(100 sq. ft.)<span className='price'>${item.job1Price}</span></p>}
                                {item.selectedSize === 'job2' && <p>(200 sq. ft.)<span className='price'>${item.job2Price}</span></p>}
                                {item.selectedSize === 'job3' && <p>(300 sq. ft.)<span className='price'>${item.job3Price}</span></p>}
                                {item.selectedSize === 'job4' && <p>(400 sq. ft.)<span className='price'>${item.job4Price}</span></p>}
                                {item.imagePath && <img 
                                    className='image-cover' 
                                    src={`${baseUrl}/${item.imagePath}`}
                                    alt="Upload other"/>}
                                { item.otherMessage !== '' && <p>Message: {item.otherMessage}</p>}
                                <Pencil className='pencil-icon' onClick={() => editOtherItem(index)}/>
                                <Trash2 className='trash-icon' onClick={() => handleRemoveOtherItem(index)}/>
                            </div>
                        )

                    }else {
                        return null;
                    }
                })}
            </div>
            <div className='button-container'>
            <button onClick={handleContinueToCheckout} type='submit' className='checkout-button'>Continue to Checkout</button>
            </div>
        </form>
    </>
  )
}

export default CheckoutForm
