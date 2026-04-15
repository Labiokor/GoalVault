exports.success = (res,data,message='success')=>{

  res.json({

    status:true,

    message,

    data

  })

}

exports.error = (res,message)=>{

  res.status(400).json({

    status:false,

    message

  })

}