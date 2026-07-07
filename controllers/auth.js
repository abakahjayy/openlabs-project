require('dotenv').config();

const jwt = require('jsonwebtoken');
const User = require("../models/User");
const {
    UnauthenticatedError,
    BadRequestError,
    NotFoundError
} = require('../errors');
const { StatusCodes } = require('http-status-codes');
const sendVerificationEmail = require('../utils/sendVerficationEmail.js');
const path = require('path');
const { appPath } = require('../app.js');


// =========================
// SIGN UP
// =========================
const signUp = async (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    const newUser = await User.create({
        firstName,
        lastName,
        username,
        email,
        password,
        isVerified: false,
        created: new Date(),
    });

    const userId = newUser._id.toString();

    const token = newUser.createJWT();

    const verificationToken = jwt.sign(
        { email },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    newUser.tokens.push(token);
    await newUser.save(); // ✅ FIXED

    const origin = `${req.protocol}://${req.get('host')}`;

    await sendVerificationEmail({
        name: username,
        email,
        verificationToken,
        origin,
    });

    // ✅ FIXED COOKIE (string only)
    res.cookie(`authToken-${userId}`, token, {
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie(`User`, { userId }, {
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(StatusCodes.CREATED).json({
        message: "User registered successfully!",
        token,
        userId
    });
};


// =========================
// LOGIN
// =========================
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequestError('Please provide email and password');
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new UnauthenticatedError("Invalid email.");
    }

    const isPasswordCorrect = await user.comparePasswords(password);

    if (!isPasswordCorrect) {
        throw new UnauthenticatedError('Invalid Password');
    }

    const token = user.createJWT();

    user.tokens.push(token);
    await user.save(); // ✅ FIXED

    const userId = user._id.toString();

    res.cookie(`authToken-${userId}`, token, {
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie(`User-${userId}`, { userId }, {
        httpOnly: true,
        sameSite: "Lax",
        maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(StatusCodes.OK).json({
        message: "Login successful!",
        token,
        userId
    });
};


// =========================
// DASHBOARD
// =========================
const dashboard = async (req, res) => {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
        throw new BadRequestError('Invalid token provided');
    }

    return res.status(StatusCodes.OK).json({
        user,
        token: req.user.token
    });
};


// =========================
// USER COOKIE CHECK
// =========================
const userId = async (req, res) => {
    const { userId, userTok } = req.body;

    let user;
    let cookie;

    const userCookie = req.cookies[`User-${userId}`];

    if (userCookie) {
        user = await User.findById(userCookie.userId);
        cookie = req.cookies[`authToken-${user._id}`];
    } else {
        cookie = req.cookies[`authToken-${userId}`];
    }

    return res.status(StatusCodes.OK).json({
        message: 'Successful',
        user,
        cookie,
        userTok
    });
};


// =========================
// LOGOUT
// =========================
const logout = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        throw new BadRequestError('Please provide UserId');
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new UnauthenticatedError('Invalid userId');
    }

    // optional but recommended
    user.tokens = [];
    await user.save();

    res.clearCookie(`authToken-${userId}`);
    res.clearCookie(`User-${userId}`);

    return res.status(StatusCodes.OK).json({
        message: `Successfully logged out: ${user.firstName}`
    });
};


// =========================
// EMAIL VERIFICATION
// =========================
const verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        throw new BadRequestError('No Token Provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email: decoded.email });

    if (!user) {
        throw new NotFoundError(`No user with email: ${decoded.email}`);
    }

    user.isVerified = true;
    await user.save();

    return res.sendFile(
        path.resolve(appPath, './public/success/email-verification-success.html')
    );
};


// =========================
// CHANGE PASSWORD
// =========================
const changePassword = async (req, res) => {
    const { userId } = req.params;
    const { newPassword, oldPassword } = req.body;

    if (!userId || !newPassword || !oldPassword) {
        throw new BadRequestError('Missing fields');
    }

    if (newPassword === oldPassword) {
        throw new BadRequestError('New password must be different');
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new UnauthenticatedError('User not found');
    }

    const isPasswordCorrect = await user.comparePasswords(oldPassword);

    if (!isPasswordCorrect) {
        throw new UnauthenticatedError('Old password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return res.status(StatusCodes.OK).json({
        message: "Password changed successfully"
    });
};


// =========================
// EXPORTS
// =========================
module.exports = {
    signUp,
    login,
    dashboard,
    userId,
    verifyEmail,
    logout,
    changePassword
};
// require('dotenv').config()
// const jwt = require('jsonwebtoken');
// const User = require("../models/User");
// // const Cookie = require('js-cookie');
// const { UnauthenticatedError, BadRequestError,NotFoundError } = require('../errors')
// const { StatusCodes } = require('http-status-codes');
// const sendVerificationEmail = require('../utils/sendVerficationEmail.js');
// const path= require('path')
// const {appPath} =require('../app.js')
// let Id;//Test 2

// // Generate a JWT
// //When generating the token always the first parameter is the id(how to access the user) in an object
// //And the second parameter is is the secret key
// //The third parameter is the expiring time
// //We created a function to handle the generating of the tokens
// // const generateToken = (userId,username) => {
// //     return jwt.sign({ id: userId ,username:username}, process.env.JWT_SECRET, { expiresIn: '30d' });
// // };

// // Signup Route
// const signUp = async (req, res) => {
//     //Destructure the req.body
//     const { firstName, lastName, username, email, password } = req.body;
//     console.log(req.body);


//     // Create a new user
//     const newUser = await User.create({ firstName, lastName, username, email, password, isVerified: false ,created: new Date(),});

//     const UserId = JSON.stringify(newUser._id);
//     console.log(`\x1b[32m%s\x1b[0m`,`New user created with id: ${UserId.split('"')[1]}`);

//     const token = newUser.createJWT();
//     const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '30d' });
//     newUser.tokens.push(token); // Add token to the tokens array
//     // await newUser.save(); // Save the user with the new token
//     sendVerificationEmail({
//         name: username,
//         email,
//         verificationToken,
//         origin: 'http://localhost:7004/',
//     })
//     res.cookie(`authToken-${newUser._id}`, { token, userId: newUser._id }, {
//         httpOnly: true, // Secure cookie, inaccessible to JavaScript
//         sameSite: "Lax", // Restrict cookie sharing for cross-site requests
//         maxAge: 24 * 60 * 60 * 1000, // Expiry time (optional)
//     });
//     res.cookie(`User`, { userId: newUser._id }, {
//         httpOnly: true, // Secure cookie, inaccessible to JavaScript
//         sameSite: "Lax", // Restrict cookie sharing for cross-site requests
//         maxAge: 24 * 60 * 60 * 1000, // Expiry time (optional)
//     });
//     // req.session.userId = newUser._id;
//     res.status(StatusCodes.CREATED).json({ message: "User registered successfully!", token, userId: UserId.split('"')[1] });
// };

// // Login Route
// const login = async (req, res) => {
//     const { email, password } = req.body;
//     console.log(req.body);
//     if (!email || !password) {
//         throw new BadRequestError('PLease Provide Email and Password')
//     }

//     // Find user by email
//     const user = await User.findOne({ email })//.select('-password');

//     if (!user) {
//         throw new UnauthenticatedError("Invalid email.");
//     }
//     //Check if password is correct
//     const isPasswordCorrect = await user.comparePasswords(password)
//     console.warn("Password Correct:", isPasswordCorrect);  // Log result of password check
//     //If not throw an error
//     if (!isPasswordCorrect) {
//         throw new UnauthenticatedError('Invalid Password');
//     }
//     const token = user.createJWT();
//     user.tokens.push(token); // Add token to the tokens array
//     // await user.save(); // Save the user with the new token
//     // req.session.userId =user._id
//     res.cookie(`authToken-${user._id}`, { token, userId: user._id }, {
//         httpOnly: true, // Secure cookie, inaccessible to JavaScript
//         sameSite: "Lax", // Restrict cookie sharing for cross-site requests
//         maxAge: 24 * 60 * 60 * 1000, // Expiry time (optional)
//     });
//     res.cookie(`User-${user._id}`, { userId: user._id }, {
//         httpOnly: true, // Secure cookie, inaccessible to JavaScript
//         sameSite: "Lax", // Restrict cookie sharing for cross-site requests
//         maxAge: 24 * 60 * 60 * 1000, // Expiry time (optional)
//     });
//     Id = user._id;
//     res.status(StatusCodes.OK).json({ message: "Login successful!",token, userId: user._id });
// };


// //Dashboard route
// //This is for the jwt verification process
// // Add a route to fetch user details after login
// const dashboard = async (req, res) => {
//     const user = await User.findById(req.user.userId).select('-password');//Select will omit that parameter
//     if (!user) {
//         throw new BadRequestError('Invalid token provided');
//     }
//     const token = req.user.token;
//     res.status(StatusCodes.OK).json({ user, token });
// };

// const userId = async (req, res) => {
//     const { userId, userTok } = req.body;
//     let user = req.cookies[`User-${userId}`] ? await User.findById(req.cookies[`User-${userId}`].userId) : undefined;
//     // console.log(user);
//     let cookie;
//     if (user) {
//         cookie = req.cookies[`authToken-${user._id}`];
//     } else {
//         cookie = req.cookies[`authToken-${userId}`]
//     }
//     console.log('User Cookie:', req.cookies[`User-${userId}`])
//     res.status(StatusCodes.OK).json({ message: 'Successful', user: user, cookie: cookie, userTok });
// }





// //Logout
// const logout =async(req, res) => {
//     const {userId} = req.query;
//     console.log(req.query)
//     if (!userId) {
//         throw new BadRequestError('PLease Provide UserId')
//     }

//     const user = await User.findOne({ _id:userId })

//     if (!user) {
//         throw new UnauthenticatedError(`Invalid userId:${userId}, you are not authorized to logout this user.`);
//     }

//     res.status(StatusCodes.OK).json({ message: `Successfully logged out: ${user.firstName}`});
// }



// //Email Verification

// const verifyEmail = async (req, res) => {
//     const { token,email } = req.query;
//         if(!token){
//             throw new BadRequestError('No Token Provided')
//         }
//         // Verify the token
//         const decoded = jwt.verify(token,process.env.JWT_SECRET,);
//         if(!decoded){
//             throw new UnauthenticatedError('Email Was not Verified(Invalid Token)')
//         }

//         // Find the user and mark them as verified
//         const user = await User.findOne({ email:decoded.email })
//         if (!user) {
//             throw new NotFoundError(`No user with email:${decoded.email}`)
//         }
//         user.isVerified = true;
//         await user.save()
//         res.sendFile(path.resolve(appPath, './public/success/email-verification-success.html'));
// };


// const changePassword= async(req,res)=>{
//     const {userId} = req.params
//     const {newPassword,oldPassword} = req.body;


//     if (!userId) {
//         throw new BadRequestError('PLease Provide UserId')
//     }
//     if (!newPassword) {
//         throw new BadRequestError('PLease Provide UserId New Password')
//     }
//     if (!oldPassword) {
//         throw new BadRequestError('PLease Provide The Old Password')
//     }

//     if(newPassword===oldPassword) {
//         throw new BadRequestError('PLease Provide a new password ')
//     }
//     const user = await User.findOne({ _id:userId })

//     if (!user) {
//         throw new UnauthenticatedError(`Invalid userId:${userId}, you are not authorized to logout this user.`);
//     }

//     //Check if password is correct
//     const isPasswordCorrect = await user.comparePasswords(oldPassword)
//     console.warn("Password Correct:", isPasswordCorrect);  // Log result of password check
//     //If not throw an error
//     if (!isPasswordCorrect) {
//         throw new UnauthenticatedError(`The old password: ${oldPassword} is incorrect`);
//     }

//     user.password=newPassword;

//     await user.save()

//     res.status(StatusCodes.OK).json({ message: `Successfully changed the password from: ${oldPassword}  to  ${newPassword}`,user});
// }


// //Export the controllers
// module.exports = {
//     signUp,
//     login,
//     dashboard,
//     userId,
//     verifyEmail,
//     logout,
//     changePassword
// };