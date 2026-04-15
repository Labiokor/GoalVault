require('dotenv').config()

const mongoose = require('mongoose')

const app = require('./app')

mongoose.connect(process.env.ATLAS_URI)

.then(()=>{

  console.log('Database connected')

  app.listen(5000,()=>{

    console.log('Server running on port 5000')

  })

})

.catch(err=>{

  console.log(err)

})