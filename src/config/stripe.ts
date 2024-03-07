import { SubscriptionPlan } from 'src/subscriptions/dto/create-checkout-session';

export const plans: {
  [key in SubscriptionPlan]: {
    priceId: string;
  };
} = {
  [SubscriptionPlan.DEVELOPER]: {
    priceId: 'price_1OrEdzBymC44pZVLtr3VRrXH',
  },
  [SubscriptionPlan.HOBBYIST]: {
    priceId: 'price_1OrEeGBymC44pZVLaMc7qPg8',
  },
  [SubscriptionPlan.INDIE]: {
    priceId: 'price_1OrEeTBymC44pZVL0QFlLRZy',
  },
  [SubscriptionPlan.STARTUP]: {
    priceId: '',
  },
};
