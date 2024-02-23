import React, { useEffect, useState } from 'react';
import MainHeader from './MainHeader';
import { useApi } from '../useApi';

const SnowtechOnboarding = () => {

  const [stripeOnboardingLink, setStripeOnboardingLink] = useState('');
  const { customFetch } = useApi();

  useEffect(() => {
    // Function to fetch the Stripe onboarding link from the backend
    const fetchStripeOnboardingLink = async () => {
      const url = '/update-stripe-link';
      const options = {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
      };
      try {
        const response = await customFetch(url, options);
      
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe onboarding link');
        }

        const data = await response.json();
        setStripeOnboardingLink(data.url);
      } catch (error) {
        console.error('Error fetching Stripe onboarding link:', error);
      }
    };

    fetchStripeOnboardingLink();
  }, []);

  return (
    <>
      <MainHeader />
      <div className="onboarding-container">
        <h2>Welcome to Your Onboarding</h2>
        <p>
          Before you can start accepting jobs, you need to set up your payment
          information with Stripe.
        </p>
        {stripeOnboardingLink ? (
          <a href={stripeOnboardingLink} className="onboarding-link">Complete Onboarding</a>
        ) : (
          <p>Loading your onboarding link...</p>
        )}
      </div>
    </>
  );
}

export default SnowtechOnboarding;
