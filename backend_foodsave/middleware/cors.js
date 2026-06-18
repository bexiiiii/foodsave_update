const cors = require('cors');

const corsOptions = {
  origin: [
    'https://vendor.foodsave.kz',
    'https://admin.foodsave.kz',
    'https://foodsave.kz',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
