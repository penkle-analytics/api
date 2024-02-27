const env = {
  port: +process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET,
};

export type Config = typeof env;
export const configuration = () => env;
