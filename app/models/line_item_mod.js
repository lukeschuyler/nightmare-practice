'use strict'

const { bookshelf } = require('../db/database')

const LineItem = bookshelf.Model.extend({
  tableName: 'line_items'
}, {
  addItem(newItem) {
    return this.forge(newItem)
    .save()
    .then(item => item)
    .catch(error => error)
  }
})

module.exports = bookshelf.model('LineItem', LineItem)
