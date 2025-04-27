const mongoose = require('mongoose')


const projectSchema = new mongoose.Schema({ 
    userID: {
        type : String,
        required : true,
    },
    projectName:{
        type : String,
        required: true,
    },
    timeStamp: {
        type : Date,
        default : Date.now,
    },
    imageUrl:{
        type: String,
    },
    prompt:{
        type: String
    },
    jsonData:{
        type: Object,
    },
    status:{
        type: String,
        default: "generated"
    },
    files: [{
        fileId: mongoose.Schema.Types.ObjectId,
        filename: String,
        fileType: String,
        relativePath: String,
        contentType: String,
        size: Number,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }]
})

const Project = mongoose.model('Project',projectSchema)


module.exports = Project

