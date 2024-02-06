import React from 'react';
import {Globe} from 'lucide-react';
import googleplay from '../assets/google-play.png';
import appstore from '../assets/on-app-store.png';
import meta from '../assets/meta.png';
import twitter from '../assets/twitter-dark.png';
import youtube from '../assets/you.png';
import insta from '../assets/instagram.png';
import linkedin from '../assets/linkedin.png';

const Footer = () => {
  return (
    <>
    <footer>
        <div className='top-footer'>
          <div className='top-footer-details'>
            <h1 className='footer-logo'>
              SnowPall
            </h1>
            <div className='extra-info'>
              <p>Accessibility Tools | Do not share my personal information</p>
              <p>&#169; Copyright 2024, SnowPall Inc. All Rights Reserved</p>
              <p>Terms of Use | Privacy Policy</p>
            </div>
          </div>
          <div className='top-footer-links'>
            <img className='app-store' src={appstore}/>
            <img className='google-play' src={googleplay}/>
          </div>
        </div>
        <div className='middle-footer'>
          <div className='middle-one'>
            <h1 className='middle-footer-header'>
              Company
            </h1>
            <ul>
              <li>About us</li>
              <li>FAQs</li>
              <li>Blog</li>
              <li>Newsroom</li>
              <li>Our offerings</li>
              <li>Gift cards</li>
              <li>Careers</li>
            </ul>
          </div>
          <div className='middle-two'>
            <h1 className='middle-footer-header'>
              Services
            </h1>
            <ul>
              <li>Car cleaning</li>
              <li>Lawn care</li>
              <li>Driveway cleaning</li>
              <li>Street cleaning</li>
              <li>Other</li>
            </ul>
          </div>
          <div className='middle-three'>
            <h1 className='middle-footer-header'>
              Our Commitments
            </h1>
            <ul>
              <li>Satisfaction guarantee</li>
              <li>Diversity & Inclusion</li>
              <li>Safety & Integrity</li>
              <li>Sustainability</li>
            </ul>
          </div>
          <div className='middle-four'>
            <h1 className='middle-footer-header'>Support</h1>
            <ul>
              <li>snowpall@gmail.com</li>
              <li>Fees</li>
            </ul>
          </div>
          <div className='middle-five'>
            <h1 className='middle-footer-header'>Subscription</h1>
            <p>Subscribe your email for latest news & promotional offers.</p>
           <form className='email-form'>
            <input className='input-email' type='email' placeholder='Email'/>
            <button className='submit-email'>Submit</button>
           </form>
          </div>
        </div>
        <div className='bottom-footer'>
          <div className='bottom-links'>
            <button className='meta'>
              <img src={meta}/>
            </button>
            <button className='twitter'>
              <img src={twitter}/>
            </button>
            <button className='youtube'>
              <img src={youtube}/>
            </button>
            <button className='instagram'>
              <img src={insta}/>
            </button>
            <button className='linkedin'>
              <img src={linkedin}/>
            </button>
          </div>
          <div className='language'>
            <Globe className='globe'/>
            <p className='active-language'>English</p>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer
