import React, { useContext } from 'react'
import { SnowPallContext } from './SnowPallContext';


const LoginHeader = () => {

  const { loginActive, registerActive } = useContext(SnowPallContext);
  
  return (
    <>
        <header className='login-header'>
          <h1>SnowPall</h1>
          <div className='register-buttons'>
              <button className='login' onClick={loginActive}>
                  Login
              </button>
              <button className='sign-up' onClick={registerActive}>
                  Sign Up
              </button>
          </div>
        </header>
    </>
  )
}

export default LoginHeader;

