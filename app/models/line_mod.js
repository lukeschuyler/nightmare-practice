'use strict'

const { bookshelf } = require('../db/database')

const Line = bookshelf.Model.extend({
  tableName: 'line'
}, {
  addLine(newLine) {
    return this.forge(newLine)
    .save()
    .then(item => item)
    .catch(error => error)
  }
})

module.exports = bookshelf.model('Line', Line)
