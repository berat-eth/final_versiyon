const { Sequelize } = require('sequelize');

const isProd = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'u987029066_mobil',
  process.env.DB_USER || 'u987029066_Admin',
  process.env.DB_PASSWORD || '38cdfD8217..',
  {
    host: process.env.DB_HOST || '92.113.22.70',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    dialectOptions: isProd
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {},
    define: {
      freezeTableName: true,
      timestamps: false,
    },
  }
);

module.exports = { sequelize };


