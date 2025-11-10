// models/Website.js
const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema({
  websiteName: { type: String, required: true },
  domain: { type: String, required: true },
},
{ timestamps: true }
);

module.exports = mongoose.model('Website', websiteSchema);
