// message schema for saving to database is defined here //

const mongoose = require("mongoose"),
  { Schema } = require("mongoose");
const messageSchema = new Schema({
  content: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  time: {
      type: String,
      required: true
  },
  roomId: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);


