import mongoose from 'mongoose';

const userSchema = mongoose.Schema({
  fullName:{type:String, require:true},
  email:{type:String, require:true},
  password:{type:String, require:false},
  googleId:{type:String, require:false},
  id:{type:String}
})

export default mongoose.model('User', userSchema);