import axios from 'axios';
import { showAlert } from './alert';
import Stripe from 'stripe';
const stripe = Stripe('pk_test_51LtvGZDvtdd4BEDEpTOLpjJ3EaB5ACBrDba2PyUu9PWvrMxlPGxs0UAg4xKzO6UfnkCcT9DtzDYizg3hxhgU2MTp00pn9J56ep');

export const bookTour = async tourId => {
    try {
        const session = await axios(
            `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
        )
        
        // 2) Create checkout form + chanre credit card
        console.log(`session is ${JSON.stringify(session)}`)
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        })
    
    } catch (err) {
        console.log(err)
        showAlert('err', err)
    }
    
}