'use strict'

const { bookshelf } = require('../db/database')

const UsageLine = bookshelf.Model.extend({
  tableName: 'usage_line'
}, {
  addUsageLine(newItem) {
    return this.forge(newItem)
    .save()
    .then(item => item)
    .catch(error => error)
  }
})

module.exports = bookshelf.model('UsageLine', UsageLine)
