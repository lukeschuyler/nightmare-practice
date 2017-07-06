
const environment = process.env.NODE_ENV || 'development';
const config = require('../../knexfile.js')[environment];
const knex = require('knex')(config);
const bookshelf = require('bookshelf')(knex);

bookshelf.plugin('registry');

module.exports = { knex, bookshelf }
