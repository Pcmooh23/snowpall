const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');

const requestSchema = new Schema({});

const addressSchema = new Schema({
  name: String,
  number: String,
  unit: String,
  street: String,
  city: String,
  state: String,
  zip: String
});

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

const customerSchema = new Schema({
  userCart: [cartItemSchema], 
  userRequests: []
}, {_id: false});

const snowtechSchema = new Schema({
  completedRequests: [{
      type: Schema.Types.ObjectId,
      ref: 'Request' // Assuming 'Request' is a model you've defined elsewhere
    }],
}, {_id: false});


const activeRequestSchema = new Schema({});

const completedRequestSchema = new Schema({});

// Models from these schemas
const User = mongoose.model('User', userSchema);
const Customer = User.discriminator('Customer', customerSchema); 
const Snowtech = User.discriminator('Snowtech', snowtechSchema); 
const Request = mongoose.model('Request', requestSchema);
const ActiveRequest = Request.discriminator('ActiveRequest', activeRequestSchema);
const CompletedRequest = Request.discriminator('CompletedRequest', completedRequestSchema);

module.exports = { 
    User, 
    Customer, 
    Snowtech, 
    Request, 
    ActiveRequest,
    CompletedRequest
};
