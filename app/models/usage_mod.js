'use strict'

const { bookshelf } = require('../db/database')

const Usage = bookshelf.Model.extend({
  tableName: 'usage'
}, {
  addUsage(newUsage) {
    return this.forge(newUsage)
    .save()
    .then(item => item)
    .catch(error => error)
  }
})

module.exports = bookshelf.model('Usage', Usage)
