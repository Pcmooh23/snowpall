import React from 'react';
import cleaningSnow from '../assets/cleaningSnow.webp';
import { SparklesCore } from '../utils/sparkles.tsx';

const Hero = () => {
  return (
    <>

      <section className='snowfall-cover'>
          <div className='cover-title'>
              <h1>Clear Snow, Get Paid</h1>
              <h2>You never have to do it yourself again, stay snug this winter and let someone do the work for you.</h2>
              <button className='try-out'>Try Us Out</button>
          </div>
          <img className='cleaningSnow' src={cleaningSnow}/>
      </section>
    </>
  )
}

export default Hero;
