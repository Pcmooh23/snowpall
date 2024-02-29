const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');

const addressSchema = new Schema({
  id: { type: String, required: true },
  userName: String,
  userNumber: String,
  userUnit: String,
  userStreet: String,
  userCity: String,
  userState: String,
  userZip: String
}, {_id: false});

const cartItemSchema = new Schema({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  objectType: { type: String, required: true, enum: ['car', 'driveway', 'lawn', 'street', 'other'] },
  imagePath: { type: String }, 
  price: { type: Number }, 

  // Car specific fields
  checkedService: Boolean,
  makeAndModel: String,
  color: String,
  licensePlate: String,
  carMessage: String,

  // Driveway specific fields
  selectedSize: String,
  size1Price: Number,
  size2Price: Number,
  size3Price: Number,
  size4Price: Number,
  drivewayMessage: String,

  // Lawn specific fields
  walkway: Boolean,
  frontYard: Boolean,
  backyard: Boolean,
  lawnMessage: String,
  walkwayPrice: Number,
  frontYardPrice: Number,
  backyardPrice: Number,

  // Street specific fields
  from: String,
  to: String,
  streetMessage: String,

  // Other specific fields
  job1Price: Number,
  job2Price: Number,
  job3Price: Number,
  job4Price: Number,
  otherMessage: String,

}, { timestamps: true, _id: false }); 

const userSchema = new Schema({
  userName: String,
  userEmail: { type: String, unique: true },
  accountType: String,
  userNumber: String,
  userStreet: String,
  userUnit: String,
  userCity: String,
  userState: String,
  userZip: String,
  userPasswordHash: String,
  userAddresses: [addressSchema], 
  userNotifications: [{ 
    id: { type: String, default: () => uuidv4() },
    message: String,
    created: Date,
    read: Boolean
  }],
  refreshToken: String,
});

const customerSchema = new Schema({
  userCart: [cartItemSchema],
  activeRequests: [{
    type: Schema.Types.ObjectId,
    ref: 'ActiveRequests' 
  }],
  completedRequests: [{
    type: Schema.Types.ObjectId,
    ref: 'CompletedRequests' 
  }]
}, { _id: false });

const snowtechSchema = new Schema({
  completedRequests: [{
      type: Schema.Types.ObjectId,
      ref: 'CompletedRequests' 
    }],
  stripeAccountId: { 
    type: String, 
    default: null 
  }
}, {_id: false});

const completedRequestsSchema = new Schema({
  completionDate: { type: Date, default: Date.now },
});

const requestsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  id: { type: String, default: uuidv4 },
  cart: [{ type: Object, required: true }],
  selectedAddress: { type: Object, required: true },
  charge: {
    id: String,
    amount: Number,
    currency: String,
    description: String,
    created: Date,
  },
  status: { type: String, required: true, enum: ['active', 'completed'] },
  stages: {
    live: Boolean,
    accepted: Boolean,
    started: Boolean,
    complete: Boolean,
  },
  orderDate: { type: Date, default: Date.now }
}, {_id: false});

// Models from these schemas
const User = mongoose.model('User', userSchema);
const Customer = User.discriminator('Customer', customerSchema); 
const Snowtech = User.discriminator('Snowtech', snowtechSchema); 
const Requests = mongoose.model('Requests', requestsSchema);
const ActiveRequests = Requests.discriminator('ActiveRequests', new Schema({}));
const CompletedRequests = Requests.discriminator('CompletedRequests', completedRequestsSchema);

module.exports = { 
    User, 
    Customer, 
    Snowtech, 
    Requests, 
    ActiveRequests,
    CompletedRequests
};
