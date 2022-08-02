const mongoose = require('mongoose')

const ServerSchema = new mongoose.Schema({
  serverID: {
    type: String,
    required: true,
  },
  channelName: {
    type: String,
    required: true,
  },
  collectionName: {
    type: String,
    required: true,
  },
  updateAuthority: {
    type: String,
    required: true,
  },
  roleType: {
    type: Boolean,
    required: true,
  },
  attributes: {
    type: Array,
  },
  amounts: {
    type: Array
  }
})

module.exports = mongoose.model('Server', ServerSchema);