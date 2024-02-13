import React, { useState, useContext } from 'react';
import { Mail, LockKeyhole, X, CircleUserRound } from 'lucide-react';
import { SnowPallContext } from './SnowPallContext';
import { useNavigate } from 'react-router-dom';

const UserForms = () => {

    const {
        pageFormRef, iconCloseRef, baseUrl,
        loginFormRef, registerLinkRef, fetchAddresses, 
        registerFormRef, loginLinkRef,
        setAccessToken, userId, setUserId, setLoginName
    } = useContext(SnowPallContext);

    const navigate = useNavigate();
    const [loginError, setLoginError] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [registerForm, setRegisterForm] = useState({
        userName: '',
        userEmail: '',
        accountType: '',
        userNumber: '',
        userStreet: '',
        userUnit: '',
        userCity: '',
        userState: '',
        userZip: '',
        userPassword: '',
        confirmPassword: '',
    });
    const [userForm, setUserForm] = useState({
        userEmail: '',
        userPassword: '',
    });

    const inputLoginChange = (event) => {
        const {name, value} = event.target;
        setUserForm({...userForm, [name]: value})
    }

    const inputRegisterChange = (event) => {
        const {name, value, type} = event.target;
        if (type === 'radio') { 
            // Turns out type isn't needed and I can just use the content in the else block.
            setRegisterForm({...registerForm, [name]: value});
        } else {
            setRegisterForm({...registerForm, [name]: value});
        }
    }

    const resetRegisterForm = () => {
        setRegisterForm({
            userName: '',
            userEmail: '',
            accountType: '',
            userNumber: '',
            userStreet: '',
            userUnit: '',
            userCity: '',
            userState: '',
            userZip: '',
            userPassword: '',
            confirmPassword: '',
        });
    };

    const resetLoginForm = () => {
        setUserForm({
            userEmail: '',
            userPassword: '',
        })
    }
    
    const signInUser = async (event) => {
        event.preventDefault();
        
        try {
            const response = await fetch(`${baseUrl}/validateLogin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: userForm.userEmail, userPassword: userForm.userPassword }),
                credentials: 'include', // Necessary to include the cookie for the refresh token
            });
    
            const data = await response.json();
            if (response.ok) {
                const { userId, accessToken, username, accountType } = data;
            
                localStorage.setItem('currentUserId', userId);
                setUserId(userId);
            
                localStorage.setItem(`${userId}_accessToken`, accessToken);
                setAccessToken(accessToken);
            
                localStorage.setItem('currentUserName', username);
                setLoginName(username);
            
                resetLoginForm();

                if (accountType === 'customer') {
                    navigate('/home');
                } else if (accountType === 'snowtech') {
                    navigate('/snowtech');
                }

            } else {
                setLoginError(data.message);
            }
            
        } catch (error) {
            console.error('Error:', error);
            setLoginError('An unexpected error occurred.');
        }
    };    

    const registerUser = async (event) => {
        event.preventDefault();
     
        if (registerForm.userPassword !== registerForm.confirmPassword) {
            setRegisterError('Passwords do not match.');
            return;
        }
     
        // Data for user registration
        const registerData = {
          userName: registerForm.userName,
          userEmail: registerForm.userEmail,
          accountType: registerForm.accountType,
          userNumber: registerForm.userNumber,
          userStreet: registerForm.userStreet,
          userUnit: registerForm.userUnit,
          userCity: registerForm.userCity,
          userState: registerForm.userState,
          userZip: registerForm.userZip,
          userPassword: registerForm.userPassword,
        }
     
        try {
          const registrationResponse = await fetch(`${baseUrl}/registerUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registerData),
            credentials: 'include',
           });
     
            if (!registrationResponse.ok) {
                throw new Error('Registration failed');
            }
     
            const registrationData = await registrationResponse.json();
    
            if (registrationData) {
                console.log('User Object:', registrationData.user);

                const { id, userName, userNumber, userStreet, userUnit, userCity, userState, userZip, accountType } = registrationData.user;                
                const { accessToken } = registrationData;

                localStorage.setItem('currentUserId', id); // this might not work for production as every account has the same localstorage name for currentID
                localStorage.setItem(`${id}_accessToken`, accessToken);
                localStorage.setItem('currentUserName', userName);
                
                setUserId(id);
                setAccessToken(accessToken);
                setLoginName(userName);

                resetRegisterForm();

                if (accountType === 'customer') {
                    navigate('/home');
                } else if (accountType === 'snowtech') {
                    navigate('/snowtech');
                    localStorage.setItem(`${id}_snowtechLocation`, JSON.stringify({
                        userStreet: userStreet,
                        userCity: userCity,
                        userState: userState,
                        userZip: userZip
                    }));
                }
            
                setRegisterError('');

                const addressData = { userName, userNumber, userStreet, userUnit, userCity, userState, userZip }

                try {
                    const response = await fetch(`${baseUrl}/address`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}` 
                        },
                        body: JSON.stringify(addressData),
                        credentials: 'include' 
                    });
            
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    console.log('New address added:', data.newAddress);
                    await fetchAddresses();
                } catch (error) {
                    console.error('Error adding new address:', error);
                }
            } else {
                throw new Error(registrationData.message || 'Registration succeeded but no access token provided.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setRegisterError(error.message || 'An unexpected error occurred during registration.');
        }
    };
    
  return (
    <>
        <div className='form-container'>
            <div className='page-form' ref={pageFormRef}>
                <span className='close-icon' ref={iconCloseRef}><X/></span>
                <div className='form-box login' ref={loginFormRef}>
                    <h2>Login</h2>
                    <form onSubmit={signInUser}>
                        <div className='input-box'>
                            <span className='icon'><Mail/></span>
                            <input 
                                className='user-email'
                                value={userForm.userEmail}
                                type='email' 
                                placeholder='Email' 
                                onChange={inputLoginChange}
                                name='userEmail'
                                required/>
                        </div>
                        <div className='input-box'>
                            <span className='icon'><LockKeyhole/></span>
                            <input 
                                className='password'
                                value={userForm.userPassword}
                                type='password' 
                                placeholder='Password' 
                                onChange={inputLoginChange}
                                name='userPassword'
                                required/>     
                        </div>
                        <div className='remember-forgot'>
                            <label>
                            <input type='checkbox'/>Remember me
                            </label>
                            <a href='#'>
                            Forgot Password?
                            </a>
                        </div>
                        <button type='submit' className='login submit-button'>
                            Login
                        </button>
                        <p className={`error-message ${loginError? 'visible' : ''}`}>{loginError || ''}</p>
                        <div className='login-register'>
                            <p>
                                Don't have an account? 
                                <a href='#' className='register-link' ref={registerLinkRef}>
                                    Register
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
                <div className='form-box register' ref={registerFormRef}>
                    <h3 className='create-account'>Create Account</h3>
                    <form onSubmit={registerUser}>
                        <div className='top-register'>
                            <div className='username input-box'>
                                <span className='icon'><CircleUserRound/></span>
                                <input 
                                    className='username'
                                    value={registerForm.userName}
                                    type='text'
                                    placeholder='Full name'
                                    onChange={inputRegisterChange}
                                    name='userName'
                                    required/>
                            </div>
                            <div className='email input-box'>
                                <span className='icon'><Mail/></span>
                                <input 
                                    className='user-recovery-email'
                                    value={registerForm.userEmail}
                                    type='email'
                                    placeholder='Email'
                                    onChange={inputRegisterChange}
                                    name='userEmail'
                                    required/>
                            </div>
                        </div>
                        <div className='register-mid-p1'>
                            <input 
                            type='radio'
                            value='snowtech'
                            name='accountType'
                            className='accountRadio'
                            id='snowtech'
                            checked={registerForm.accountType === 'snowtech'}
                            onChange={inputRegisterChange}
                            style={{display: 'none'}}
                            required/>
                            <label htmlFor='snowtech' className='snowTech accountType-label'>
                                <div className='accountType-button'>
                                <span className='circle'></span>
                                <span className='subject'>SnowTech</span>
                                </div>
                            </label> 
                            <input 
                                type='radio'
                                value='customer'
                                name='accountType'
                                className='accountRadio'
                                id='customer'
                                checked={registerForm.accountType === 'customer'}
                                onChange={inputRegisterChange}
                                style={{display: 'none'}}
                                required/>
                            <label htmlFor='customer' className='customer accountType-label'>
                                <div className='accountType-button'>
                                <span className='circle'></span>
                                <span className='subject'>Customer</span>
                                </div>
                            </label> 
                        </div>
                        <div className='address-info register-mid-p2'>
                            <div className='input-box'>
                                <input 
                                    className='user-number input-box'
                                    value={registerForm.userNumber}
                                    type='text'
                                    placeholder='Optional: Phone number'
                                    onChange={inputRegisterChange}
                                    name='userNumber'/>
                            </div>
                            <div className='input-box'>
                                <input 
                                    className='user-building input-box'
                                    value={registerForm.userUnit}
                                    type='text' 
                                    placeholder='Optional: Apt/Building/Suite/Unit'
                                    onChange={inputRegisterChange}
                                    name='userUnit'/>
                            </div>
                            <div className='input-box'>
                                <input 
                                    className='user-street input-box'
                                    value={registerForm.userStreet}
                                    type='text' 
                                    placeholder='Street address' 
                                    onChange={inputRegisterChange}
                                    name='userStreet'
                                    required/>
                            </div>
                            <div className='input-box'>
                                <input 
                                    className='user-city input-box' 
                                    value={registerForm.userCity}
                                    type='text' 
                                    placeholder='City Ex: New York' 
                                    onChange={inputRegisterChange}
                                    name='userCity'
                                    required/>
                            </div>
                            <div className='input-box'>
                                <input 
                                    className='user-state input-box' 
                                    value={registerForm.userState}
                                    type='text' 
                                    placeholder='State Ex: NY' 
                                    onChange={inputRegisterChange}
                                    name='userState'
                                    required/>
                            </div>
                            <div className='input-box'>
                                <input 
                                    className='user-zip-code' 
                                    value={registerForm.userZip}
                                    type='text' 
                                    placeholder='Zip code Ex: 10001' 
                                    onChange={inputRegisterChange}
                                    name='userZip'
                                    required/>
                            </div>
                        </div>
                        <div className='register-bottom'>
                            <div className='pass input-box'>
                                <span className='icon'><LockKeyhole/></span>
                                <input 
                                    className='user-password'
                                    value={registerForm.userPassword}
                                    type='password' 
                                    placeholder='Password' 
                                    onChange={inputRegisterChange}
                                    name='userPassword'
                                    required/>     
                            </div>
                            <div className='re-enter-pass input-box'>
                                <span className='icon'><LockKeyhole/></span>
                                <input 
                                    type='password' 
                                    placeholder='Re-enter Password' 
                                    value={registerForm.confirmPassword}
                                    onChange={inputRegisterChange}
                                    name='confirmPassword'
                                    required/> 
                            </div>  
                        </div>
                        <div className={`error-message ${registerError ? 'visible' : ''}`}>
                            {registerError}
                        </div>
                        <div className='terms-conditions'>
                            <input type='checkbox' required/>
                            <a href='#'>
                            I agree to terms & conditions
                            </a>
                        </div>
                        <button type='submit' className='register submit-button'>
                            Register
                        </button>
                        <div className='login-register'>
                            <p>
                                Already have an account? 
                                <a href='#' className='login-link' ref={loginLinkRef}>
                                    Login
                                </a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </>
  )
}

export default UserForms;