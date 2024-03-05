import React, {useContext} from 'react';
import redcoat from '../assets/redcoat.webp';
import { SnowPallContext } from './SnowPallContext';

const Work = () => {

  const { loginActive, registerActive } = useContext(SnowPallContext);

  return (
    <>
      <section className='snow-tech'>
          <img src={redcoat}/>
          <div className='work-details'>
              <p className='work-title'>Work when you want making what you need, or more.</p>
              <p className='work-info'>Make money on your schedule fulfilling the active requests in your area on your own time, cleaning snow, completing jobs and get paid through SnowPall.</p>
              <div className='work-bottom'>
                  <button className='start-button' onClick={registerActive}>Start now</button> 
                  <a className='work-sign-in' onClick={loginActive}>Already have an account? Sign in</a>
              </div>
          </div>
      </section>
    </>
  )
}

export default Work
