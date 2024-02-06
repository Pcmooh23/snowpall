import React from 'react';
import {ChevronRight, ScrollText, BadgeCheck, Snowflake} from 'lucide-react';

const HowItWorks = () => {
  return (
    <>
        <section className='service-explanation'>
            <h4>How we work</h4>
            <div className='process'>
                <div className='step-1'>
                    <ScrollText size="2em" className='icon'/>
                    <p className='head'>1. What do you need to get done</p>
                    <p>Select from a list of jobs available for what you need to get done, and send out the request.</p>
                </div>
                <div className='step-2'>
                    <BadgeCheck size="2em" className='icon'/>
                    <p className='head'>2. Request and received </p>
                    <p>Once your request goes out detailing whatever you need to get done someone accepts the snow job and gets it done.</p>
                </div>
                <div className='step-3'>
                    <Snowflake size="2em" className='icon'/>
                    <p className='head'>3. Use us again</p>
                    <p>Once the job is completed, feel free to use us again anytime you need.</p>
                </div>
            </div>
            <button className='learn-more'>Learn More <ChevronRight/></button>
        </section>  
    </>
  )
}

export default HowItWorks
