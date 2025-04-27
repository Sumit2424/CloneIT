const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
const { log } = require('console')
const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGO_URI

const connectDB = async()=>{
    try{
        await mongoose.connect(MONGO_URI)
        console.log("MONGO DB CONNECTED");

        
    }catch(error){
        console.error("MONGO DB CONNECTION FAILED",error);
        process.exit(1)
    }
}

module.exports = connectDB
