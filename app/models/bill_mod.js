'use strict'

const { bookshelf } = require('../db/database')
require('./user_mod.js')
require('./line_item_mod.js')
require('./usage_mod.js')

const Bill = bookshelf.Model.extend({
  tableName: 'bill',
  user: function() { return this.belongsTo('User') },
  usages: function() { return this.belongsToMany('Usage') },
  lineItems: function() { return this.belongsToMany('LineItem') }
}, {
  addBill(newBill) {
    return this.forge(newBill)
    .save()
    .then(item => item)
    .catch(error => error)
  }
})

module.exports = bookshelf.model('Bill', Bill)
