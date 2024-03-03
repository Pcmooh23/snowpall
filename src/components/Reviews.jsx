import React from 'react';
import greg from '../assets/house.jpeg';
import mark from '../assets/marcus.jpeg';
import {Star} from 'lucide-react';

const Reviews = () => {
  return (
    <>
    <section className='reviews-section spacer layer1'>
        <h1 className='reviews-header'>Client Reviews</h1>
        <p className='reviews-info'>Discover the impact we've made on our users by reading their honest reviews of our service from our valued customers</p>
        <div className='review-area'>
          <div className='review'>
            <div className='cover'>
              <img className='character' src={greg}/>
              <p> <span className='name'> Gregory House </span><br/>New Jersey</p>
            </div>
            <div className='review-details'>
              <p className='words'>
                "An app that gets other people to clean snow for me? It's like hiring minions to do the grunt work.
                Surprisingly efficient, but don't expect me to throw a party over it.
                I'll admit it's slightly better than doing it myself – which is like saying a root canal is slightly 
                better than a kick in the teeth."
              </p>
              <div className='stars house'>
                {[...Array(5)].map((star, index) => <Star key={index} />)} 
              </div>
            </div>
          </div>
          <div className='review'>
            <div className='cover marcus'>
              <img className='character' src={mark}/>
              <p> <span className='name'> Marcus Aurelius</span><br/> Rome </p>
            </div>
            <div className='review-details'>
              <p className='words'>
                "As an emperor, I've learned the value of delegation and efficiency. This application, designed to
                arrange the clearing of snow, embodies these principles well. It harnesses the potential of human 
                cooperation for a communal benefit. However, I must reflect on the importance of personal 
                endeavor and hardship in shaping character. While the service is commendable for its utility
                and effectiveness, it should not replace the virtues gained through facing nature's challenges 
                oneself."
              </p>
              <div className='stars marcus'>
                {[...Array(5)].map((star, index) => <Star key={index} />)}  
              </div>
            </div>
          </div>
        </div>
      </section>
      
    </>
  )
}

export default Reviews
