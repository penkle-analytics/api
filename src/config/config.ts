const env = {
  env:
    process.env.NODE_ENV ||
    ('development' as 'development' | 'production' | 'test'),

  port: +process.env.PORT || 4000,

  jwtSecret: process.env.JWT_SECRET,

  frontendUrl: process.env.FRONTEND_URL,

  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeSigningSecret: process.env.STRIPE_SIGNING_SECRET,

  stripePromo42: process.env.STRIPE_PROMO_42,

  sentryDsn: process.env.SENTRY_DSN,
};

export type Config = typeof env;
export const configuration = () => env;
