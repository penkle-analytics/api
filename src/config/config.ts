const env = {
  port: +process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeSigningSecret: process.env.STRIPE_SIGNING_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
};

export type Config = typeof env;
export const configuration = () => env;
