import React, {useState, useEffect, useContext} from 'react';
import {ChevronUp} from 'lucide-react';
import Hero from './Hero';
import HowItWorks from './HowItWorks';
import Work from './Work';
import Services from './Services';
import Reviews from './Reviews';
import UserForms from './UserForms';
import LoginHeader from './LoginHeader';
import Footer from './Footer';
import { SnowPallContext } from './SnowPallContext';

const LoginPage = () => {
  
  const {
    registerLinkRef, loginLinkRef,
    pageFormRef, iconCloseRef,
    loginFormRef, registerFormRef
  } = useContext(SnowPallContext);

  const [scroll, setscroll] = useState(false);

  useEffect(() => {
    const registerLink = registerLinkRef.current;
    const loginLink = loginLinkRef.current;
    const pageForm = pageFormRef.current;
    const closeButton = iconCloseRef.current;
    const loginForm = loginFormRef.current;
    const registerForm = registerFormRef.current;

    const handleRegisterClick = () => {
      if (loginForm && registerForm) {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        pageForm.classList.add('register-active');
      }
    };

    const handleLoginClick = () => {
      if (loginForm && registerForm) {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        pageForm.classList.remove('register-active');
      }
    };

    const closeForm = () => {
      if (pageForm) {
        pageForm.classList.remove('active-popup');
      }
    };

    const scrollPage = () => {
      if (window.pageYOffset > 100) {
        setscroll(true);
      } else {
        setscroll(false);
      }
    };

    window.addEventListener('scroll', scrollPage);

    if (registerLink) {
      registerLink.addEventListener('click', handleRegisterClick);
    };
  
    if (loginLink) {
      loginLink.addEventListener('click', handleLoginClick);
    }

    if (closeButton) {
      closeButton.addEventListener('click', closeForm);
    }
 
    return () => {
      if (registerLink) {
        registerLink.removeEventListener('click', handleRegisterClick);
      }
      if (loginLink) {
        loginLink.removeEventListener('click', handleLoginClick);
      }
      if (closeButton) {
        closeButton.removeEventListener('click', closeForm);
      }

      window.removeEventListener('scroll', scrollPage);
    };
  }, [iconCloseRef, loginFormRef, loginLinkRef, pageFormRef, registerFormRef, registerLinkRef ]); 

  const handleScroll = () => {
    window.scrollTo({top: (0,0), behavior: 'smooth'});
  };

  return (
    <>
      <LoginHeader/>
      <Hero/>
      <HowItWorks/>
      <Work/>
      <Services/>
      <Reviews/>
      <UserForms/>
      <Footer />
      <button onClick={handleScroll} className={`to-top-button ${scroll ? 'active' : ''}`}>
        <ChevronUp size="1.5em" className='top-icon'/>
      </button>
    </>
  )
}

export default LoginPage