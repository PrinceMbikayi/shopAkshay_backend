import catchAsyncErrors from '../middlewares/catchAsyncErros.js'
import User from '../models/user.js'
import { getResetPasswordTemplate } from '../utils/emailTemplates.js';
import ErrorHandler from '../utils/errorHandler.js'
import sendToken from '../utils/sendToken.js';
import sendEmail from '../utils/sendEmail.js'
import crypto from 'crypto'
import { delete_file, upload_file } from '../utils/cloudinary.js'

// Register User => /api/v1/register
export const registerUser = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password, role,  ID_national, RCCM } = req.body;

    // Assurez-vous que le rôle est soit 'seller' soit 'customer'
    if (!role || (role !== 'seller' && role !== 'customer')) {
        return next(new ErrorHandler('Please select a valid role (seller or customer)', 400));
    }

    // Si le rôle est 'seller', vérifier que ID_national et RCCM sont fournis
    if (role === 'seller') {
        if (!ID_national || !RCCM) {
            return next(new ErrorHandler('ID_national and RCCM are required for sellers', 400));
        }
    }

    const user = await User.create({
        name, 
        email, 
        password,
        role,
        ID_national,
        RCCM
    });

    sendToken(user, 201, res);
});

// Login User => /api/v1/login
export const loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    if(!email || !password) {
        return next(new ErrorHandler('Please enter email & password', 400));
    }

    // Find user in the database
    const user = await User.findOne({ email }).select("+password");

    if(!user) {
        return next(new ErrorHandler('Invalid email or password', 401));
    }

    // Check if password is correct
    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched) {
        return next(new ErrorHandler('Invalid email or password', 401));
    }

    sendToken(user, 200, res);
});

// Logout User => /api/v1/logout
export const logout = catchAsyncErrors(async (req, res, next) => {
    // Vérifiez si l'utilisateur est déjà connecté
    if (!token) {
        return next(new ErrorHandler('You are already logged out', 400));
    }
    
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: 'None', 
        secure: true
    });

    res.status(200).json({
        message: 'Logged Out',
    });
});

// Upload User Avatar => /api/v1/me/upload_avatar
export const uploadAvatar = catchAsyncErrors(async (req, res, next) => {
    const avatarResponse = await upload_file(req.body.avatar, "ritzglobal/avatars");

    // Remove previous avatar
    if(req?.user?.avatar?.url) {
        await delete_file(req?.user?.avatar?.public_id);
    }

    const user = await User.findByIdAndUpdate(req?.user?._id, {
        avatar: avatarResponse,
    });

    res.status(200).json({
        user,
    });
});

// Forgot Password => /api/v1/password/forgot
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {

    // Find user in the database
    const user = await User.findOne({ email: req.body.email });

    if(!user) {
        return next(new ErrorHandler('User not found with this email', 404));
    }

    // Get reset password token
    const resetToken = user.getResetPasswordToken();

    await user.save();

    // Create reset password url
    const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`

    const message = getResetPasswordTemplate(user?.name, resetUrl);

    try {
        await sendEmail({
            email: user.email,
            subject: 'RITZ GLOBAL Password Recovery',
            message,
        });

        res.status(200).json({
            message: `Email sent to ${user.email}`,
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();
        return next(new ErrorHandler(error?.message, 500));
    }
});

// Reset Password => /api/v1/password/reset/:token
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
    //Hash the URL TOKEN
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if(!user) {
            return next(new ErrorHandler('Password reset token is invalid or has been expired', 400));
        }
        
        if(req.body.password !== req.body.confirmPassword) {
            return next(new ErrorHandler('Password does not match', 400));
        }

        // Set the new password
        user.password = req.body.password;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        sendToken(user, 200, res);
})

// Get current user profile => /api/v1/me
export const getUserProfile = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req?.user?._id);

    res.status(200).json({
        user,
    });
});

// Update  Password => /api/v1/password/update
export const updatePassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req?.user?._id).select('+password');

    // Check the previous user password
    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if(!isPasswordMatched) {
        return next(new  ErrorHandler('Old Password is incorrect', 404));
    }

    user.password = req.body.password;
    user.save();

    res.status(200).json({
        success: true,
    });
});

// Update User Profile => /api/v1/me/update
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        ID_national: req.body.ID_national,
        RCCM: req.body.RCCM,
    }

    const user = await User.findByIdAndUpdate(req.user._id, newUserData, { new: true });

    res.status(200).json({
        user,
    });
});

// Get all Users - ADMIN => /api/v1/admin/users
export const allUsers = catchAsyncErrors(async (req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        users,
    });
});

// Get all User Details - ADMIN => /api/v1/admin/users/:id
export const getUserDetails = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User not found with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
        user,
    });
});

// Update User Details - ADMIN => /api/v1/admin/users/:id
export const updateUser = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        ID_national: req.body.ID_national,
        RCCM: req.body.RCCM,
    }

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, { new: true });

    res.status(200).json({
        user,
    });
});

// Delete User - ADMIN => /api/v1/admin/users/:id
export const deleteUser = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User not found with id: ${req.params.id}`, 404));
    }

    // TODO - Remove user avatar from cloudinary

    await user.deleteOne();

    res.status(200).json({
        success: true,
    });
});
