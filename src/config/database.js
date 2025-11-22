import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  development: {
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  production: {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};

const env = process.env.NODE_ENV || 'development';
const baseConfig = config[env] || config.development;

let sequelize;

// Use DATABASE_URL if available (Neon PostgreSQL), otherwise fall back to individual parameters
if (process.env.DATABASE_URL) {
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !databaseUrl.includes('://')) {
  databaseUrl = `postgres://${databaseUrl}`;
}


if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required and cannot be empty');
}
  sequelize = new Sequelize(databaseUrl, {
    ...baseConfig,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  throw new Error('DATABASE_URL environment variable is required');
}

export default sequelize;
export { config };
