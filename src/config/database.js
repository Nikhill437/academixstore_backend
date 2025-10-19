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
    use_env_variable: 'DATABASE_URL',
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

if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const useSSL = process.env.DB_SSL_REQUIRE === 'true' || /sslmode=require/i.test(url);
  const options = { ...baseConfig };
  if (useSSL) {
    options.dialectOptions = options.dialectOptions || {};
    options.dialectOptions.ssl = { require: true, rejectUnauthorized: false };
  }
  sequelize = new Sequelize(url, options);
} else {
  const username = process.env.DB_USER || process.env.DB_USERNAME || baseConfig.username;
  const password = process.env.DB_PASS || process.env.DB_PASSWORD || baseConfig.password;
  const database = process.env.DB_NAME || baseConfig.database;
  const host = process.env.DB_HOST || baseConfig.host;
  const port = process.env.DB_PORT || baseConfig.port;
  
  const connectionOptions = { ...baseConfig, host, port };
  
  // Add SSL configuration if connecting to Supabase
  if (host && host.includes('supabase.co')) {
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
}

export default sequelize;
export { config };
