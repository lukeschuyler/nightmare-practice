
exports.up = function(knex, Promise) {
  return knex.schema
  .createTable('users', (table) => {
    table.increments()
    table.string('user_name')
    table.string('address')
    table.string('account_number').unique()
    table.string('provider')
  })
  .createTable('bill', (table) => {
    table.increments()
    table.integer('user_id').unsigned().references('users.id')
    table.string('bill_date')
  })
  .createTable('line', (table) => {
    table.increments()
    table.integer('bill_id').unsigned().references('bill.id')
    table.integer('user_id').unsigned().references('users.id')
    table.string('number')
    table.string('name')
  })
  .createTable('line_items', (table) => {
    table.increments()
    table.integer('user_id').unsigned().references('users.id')
    table.integer('bill_id').unsigned().references('bill.id')
    table.integer('line_id').unsigned().references('line.id')
    table.string('title')
    table.string('amount')
    table.string('type')
  })
  .createTable('usage', (table) => {
    table.increments()
    table.integer('bill_id').unsigned().references('bill.id')
    table.string('total_used')
    table.string('total_max')
  })
  .createTable('usage_line', (table) => {
    table.increments()
    table.integer('usage_id').unsigned().references('usage.id')
    table.integer('line_id').unsigned().references('line.id')
    table.string('usage_amount')
  })
};

exports.down = (knex, Promise) => 
  knex.schema
  .dropTable('line_items')
  .dropTable('usage_line')
  .dropTable('line')
  .dropTable('usage')
  .dropTable('bill')
  .dropTable('users')
