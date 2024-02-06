import React, {useState} from 'react';
import {Plus, Minus} from 'lucide-react';
import cleancar from '../assets/car_in_snow.png';
import cleanwalk from '../assets/snow_on_sidewalk&store.png';
import cleanlawn from '../assets/snow_on_lawn.png';
import cleandrive from '../assets/snow_in_driveway.png';
import snowflake from '../assets/snowflake.png';
import snowcar from '../assets/cleanedcar.webp';
import openstore from '../assets/openstore.webp';
import snowlawn from '../assets/snowlawn.webp';
import snowdrive from '../assets/snowdrive.webp';
import snowman from '../assets/snowman.png';

const Services = () => {

    const [activeDetail, setActiveDetail] = useState('car');
    const jobDetail = (detailId) => {
        setActiveDetail(currentDetail => currentDetail === detailId ? null : detailId);
      };
    const service_list = [
        {
            detailName: 'car',
            named: 'car-cleaning',
            image: cleancar,
            paragraph: 'Clear Car'
        },
        {
            detailName: 'sidewalk',
            named: 'sidewalk-cleaning',
            image: cleanwalk,
            paragraph: 'Clear Sidewalk'
        },
        {
            detailName: 'lawn',
            named: 'lawn-caring',
            image: cleanlawn,
            paragraph: 'Clear Lawn'
        },
        {
            detailName: 'driveway',
            named: 'clear-driveway',
            image: cleandrive,
            paragraph: 'Clear Driveway'
        },
        {
            detailName: 'other',
            named: 'other-work',
            image: snowflake,
            paragraph: 'Other'
        },
    ]

    const service_details = [
        {
            name: 'car-details',
            activeName: 'car',
            paragraph: <p>Everyone likes a clean car. Bid farewell to the icy grip on your vehicle. 
                        A snow remover can clear your car and its surroundings of snow, ensuring 
                        you can start your day with a smooth ride </p>,
            imageName: 'snowcar',
            image: snowcar
        },
        {
            name: 'sidewalk-details',
            activeName: 'sidewalk',
            paragraph: <p>Keep the streets clean. Take a load off as shovelers clear the snow off the sidewalk,
                        providing a safe path for pedestrians or ensuring local businesses have a welcoming entrance.</p>,
            imageName: 'store-open',
            image: openstore
        },
        {
            name: 'lawn-details',
            activeName: 'lawn',
            paragraph: <p>Not on my lawn. Reclaim your outdoors from mother nature! A snow cleaner can sweep
                        away the snow from your lawn, carve out a path for your walkway from driveway to doorstep, 
                        and backyards can be included. Prices vary based on the scope of the winter work.</p>,
            imageName: 'snowlawn',
            image: snowlawn
        },
        {
            name: 'driveway-details',
            activeName: 'driveway',
            paragraph: <p>Escape the snow blockade! A snow handler can be there to clear your driveway, 
                        allowing trapped vehicles to break free or creating space for a snow-free parking 
                        spot. Prices vary based on the scope of the snow-clearing task.</p>,
            imageName: 'snowdrive',
            image: snowdrive
        },
        {
            name: 'other-details',
            activeName: 'other',
            paragraph: <p>Escape the snow blockade! A snow handler can be there to clear your driveway, 
                        allowing trapped vehicles to break free or creating space for a snow-free parking 
                        spot. Prices vary based on the scope of the snow-clearing task.</p>,
            imageName: 'snowman',
            image: snowman
        },
    ]
  return (
    <>
        <section className='service-provided'>
            <h5> Services provided:</h5>
            <div className='service-details'>
                <div className='left-side-buttons'>
                <div className='snow-services'>
                    {service_list.map((service, index) => (
                        <div key={`${service.detailName}-${index}`}>
                             <button  onClick={() => jobDetail(service.detailName)} 
                                    className={`snowJob ${service.named} ${activeDetail === service.detailName ? 'active' : ''}`}>
                                <div className='job-cover'>
                                    <img src={service.image} alt={`Cover for ${service.detailName}`}/>
                                    <p>{service.paragraph}</p>
                                </div>
                                {activeDetail === service.detailName ? <Minus className='expand-on'/> : <Plus className='expand-on'/>}
                            </button>
                        </div>
                    ))}
                </div>
                </div>
                <div className='right-side-details'>
                    {service_details.map((detail, index) => (
                        <div key={`${detail.name}-${index}`} className={`${detail.name} ${activeDetail === detail.activeName ? 'active':''}`}>
                            {detail.paragraph}
                            <img className={`${detail.imageName}`} src={detail.image} alt={`${detail.imageName}`}/>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    </>
  )
}

export default Services
