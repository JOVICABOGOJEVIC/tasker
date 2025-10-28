import mongoose from 'mongoose';

const userSchema = mongoose.Schema({
  fullName:{type:String, require:true},
  email:{type:String, require:true},
  password:{type:String, require:false},
  googleId:{type:String, require:false},
  id:{type:String},
  role:{type:String, enum:['user', 'coordinator', 'admin'], default:'user'}
})

export default mongoose.model('User', userSchema);