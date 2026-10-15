import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3100),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(1433),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),

  DB_ENCRYPT: Joi.boolean().default(false),
  DB_TRUST_SERVER_CERTIFICATE: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().valid('1h').default('1h'),
});
