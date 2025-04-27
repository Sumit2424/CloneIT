const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({

    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'cloneit-f1199.appspot.com'
})

const db = admin.firestore()
const storage = admin.storage()

module.exports= {db,storage}

