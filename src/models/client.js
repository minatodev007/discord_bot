const mongoose = require('mongoose')

const ClientSchema = new mongoose.Schema({
  clientID: {
    type: String,
    required: true,
  },
  wallets: {
    type: Array,
  }
})

module.exports = mongoose.model('Client', ClientSchema);