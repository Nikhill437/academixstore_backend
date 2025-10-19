import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'bookapp_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co') ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'bookapp_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      // Force IPv4 to avoid IPv6 issues
      family: 4,
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

// Always use individual connection parameters to avoid IPv6 issues
const username = process.env.DB_USER || process.env.DB_USERNAME || baseConfig.username;
const password = process.env.DB_PASS || process.env.DB_PASSWORD || baseConfig.password;
const database = process.env.DB_NAME || baseConfig.database;
const host = process.env.DB_HOST || baseConfig.host;
const port = process.env.DB_PORT || baseConfig.port;

const connectionOptions = { 
  ...baseConfig, 
  host, 
  port,
  // Force IPv4 to avoid IPv6 connectivity issues
  dialectOptions: {
    ...baseConfig.dialectOptions,
    // Force IPv4
    family: 4
  }
};

// Add SSL configuration for production or Supabase
if (env === 'production' || (host && host.includes('supabase.co'))) {
  connectionOptions.dialectOptions = connectionOptions.dialectOptions || {};
  connectionOptions.dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}

sequelize = new Sequelize(
  database,
  username,
  password,
  connectionOptions
);

export default sequelize;
export { config };
