const User = require('../models/User')
const jwt = require('jsonwebtoken')

exports.register = async (req,res)=>{

  try{

    const {name,email,password} = req.body

    const existing = await User.findOne({email})

    if(existing){
      return res.status(400).json({message:'Email already exists'})
    }

    const user = await User.create({name,email,password})

    const token = jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'7d'})

    res.json({token,user})

  }catch(err){

    res.status(500).json({message:err.message})

  }

}

exports.login = async (req,res)=>{

  try{

    const {email,password} = req.body

    const user = await User.findOne({email})

    if(!user){
      return res.status(400).json({message:'Invalid credentials'})
    }

    const match = await user.comparePassword(password)

    if(!match){
      return res.status(400).json({message:'Invalid credentials'})
    }

    const token = jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'7d'})

    res.json({token,user})

  }catch(err){

    res.status(500).json({message:err.message})

  }

}