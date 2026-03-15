import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const registerUser = async (email, password) => {
    const userExists = await User.findOne({ email });
    if (userExists) throw new Error('User already exists');

    const user = await User.create({ email, password });
    return {
        _id: user._id,
        email: user.email,
        token: generateToken(user._id)
    };
};

export const loginUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
        return {
            _id: user._id,
            email: user.email,
            token: generateToken(user._id)
        };
    } else {
        throw new Error('Invalid email or password');
    }
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};
