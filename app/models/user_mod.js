'use strict'

const { bookshelf } = require('../db/database')
// require('./bill_mod.js')

const User = bookshelf.Model.extend({
  tableName: 'users'
}, {
  addUser(user) {
    return this.forge(user)
    .save()
    .then(id => id)
    .catch(error => error)
  },
  findOneByAccountNumber(number) {
    return this.where({account_number: number})
    .fetch()
    .then(item => {
      console.log(item)
      return item.id
    })
    .catch(error => null)
  }
})

module.exports = bookshelf.model('User', User)
