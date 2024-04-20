const env = {
  port: +process.env.PORT || 4000,

  jwtSecret: process.env.JWT_SECRET,

  frontendUrl: process.env.FRONTEND_URL,

  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeSigningSecret: process.env.STRIPE_SIGNING_SECRET,

  stripePromo42: process.env.STRIPE_PROMO_42,

  tinyBirdKey: process.env.TINYBIRD_KEY,
};

export type Config = typeof env;
export const configuration = () => env;
