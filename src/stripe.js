import { loadStripe } from '@stripe/stripe-js';

// LoadStripe outside of a component’s render to avoid recreating the Stripe object on every render.
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export default stripePromise;