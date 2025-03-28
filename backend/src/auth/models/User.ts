import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    username?: string;
    password: string;
    tokenBalance: number;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String},
    password: { type: String, required: true },
    tokenBalance: { type: Number, default: 0 }
});

export default mongoose.model<IUser>('User', UserSchema);