const mongoose = require('mongoose')
const Schema = mongoose.Schema


let userSchema = new Schema({
  userId: {
    type: String,
    default: '',
    index: true,
    unique: true,
    requied: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    default: ''
  },
  userName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  countryCode: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    min: 1111111111,
    max: 9999999999,
    required: true
  },
  admin: {
    type: Boolean,
    default: false
  },
  createdOn: {
    type: Date,
    default: Date.now()
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifyUserToken: String,
  resetPwdToken: String,
  resetPwdLinkExpiry: Date
})



mongoose.model('UserModel', userSchema);