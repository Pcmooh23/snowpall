import React, { useContext } from 'react'
import { SnowPallContext } from './SnowPallContext';


const LoginHeader = () => {

  const {loginRef, signUpRef} = useContext(SnowPallContext);
  
  return (
    <>
        <header className='login-header'>
          <h1>SnowPall</h1>
          <div className='register-buttons'>
              <button className='login' ref={loginRef}>
                  Login
              </button>
              <button className='sign-up' ref={signUpRef}>
                  Sign Up
              </button>
          </div>
        </header>
    </>
  )
}

export default LoginHeader;

