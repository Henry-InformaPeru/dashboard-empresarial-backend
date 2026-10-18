import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3100),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),

  DB_SSL: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().valid('1h').default('1h'),

  // Direcciones de la web que pueden llamar a la API, separadas por coma. Vacío = cualquiera (solo desarrollo).
  CORS_ORIGIN: Joi.string().allow('').default(''),
  // Detrás del túnel de Cloudflare hay un proxy: true para leer bien la IP del cliente
  TRUST_PROXY: Joi.boolean().default(false),
});
