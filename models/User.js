const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    // --- old (email-based) app fields — now conditionally required ---
    firstName: {
        type: String,
        required: [function () { return !this.phone; }, 'Please enter your first name'],
        maxlength: 50,
        minlength: 3
    },
    lastName: {
        type: String,
        required: [function () { return !this.phone; }, 'Please enter your last name'],
        maxlength: 50,
        minlength: 3
    },
    username: {
        type: String,
        required: [function () { return !this.phone; }, 'Please enter your username'],
        maxlength: 50,
        minlength: 3,
        unique: true,
        sparse: true,
    },
    email: {
        type: String,
        required: [function () { return !this.phone; }, 'Please enter your email address'],
        minlength: 8,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please provide a valid email',
        ],
        unique: true,
        sparse: true,
    },

    // --- new (phone-based) app fields — required only when there's no email ---
    name: {
        type: String,
        required: [function () { return !this.email; }, 'Please enter your name'],
    },
    phone: {
        type: String,
        required: [function () { return !this.email; }, 'Please enter your phone number'],
        unique: true,
        sparse: true,
    },
    role: {
        type: String,
        enum: ['farmer', 'buyer', 'driver', 'agent'],
        required: [function () { return !this.email; }, 'Please select a role'],
    },
    region: {
        type: String,
    },

    // --- shared ---
    password: {
        type: String,
        required: [true, 'Please Enter your password'],
        minlength: 6
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    profile_picture: {
        type: String,
        default: './placeholder.jpg'
    },
    profile_picture_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "uploads",
        default: null
    },
    bio: {
        type: String,
        default: 'Add your Bio'
    },
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    ],
    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    ],
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Posts",
            default: null
        }
    ],
    tokens: [{ type: String }],
    created: {
        type: Number,
        default: Date.now()
    }
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

UserSchema.methods.createJWT = function () {
    return jwt.sign(
        { userId: this._id, username: this.username || this.phone },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_LIFETIME }
    );
};

UserSchema.methods.comparePasswords = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// unique indexes on email/username/phone are already declared inline above via
// `unique: true, sparse: true` — no need to redeclare them here, and doing so
// twice can cause conflicting index definitions.

UserSchema.index({ email: 1 }, { unique: true }); // Ensure unique index on email
UserSchema.index({ username: 1 }, { unique: true }); // Ensure unique index on username

const User = mongoose.model("User", UserSchema);
module.exports = User;
// const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");
// // const { required } = require("joi");

// const UserSchema = new mongoose.Schema({
//     firstName: {
//         type: String,
//         required: [true, 'Please Enter your first name'],
//         maxlength: 50,
//         minlength: 3
//     },
//     lastName: {
//         type: String,
//         required: [true, 'Please Enter your last name'],
//         maxlength: 50,
//         minlength: 3
//     },
//     username: {
//         type: String,
//         required: [true, 'Please Enter your username'],
//         maxlength: 50,
//         minlength: 3,
//         unique: true,
//     },
//     email: {
//         type: String,
//         required: [true, 'Please Enter your email address'],
//         minlength: 8,
//         match: [
//             /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
//             'Please provide a valid email',
//         ],//Validator for the email
//         unique: true,
//     },
//     password: {
//         type: String,
//         required: [true, 'Please Enter your password'],
//         minlength: 6
//     },
//     isVerified:{
//         type:Boolean,
//         required: [true,'Please Provide Verification Status']
//     },
//     profile_picture: {
//         type: String,
//         default: './placeholder.jpg'
//     }, // Default profile picture
//     profile_picture_id: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "uploads", // Reference to the GridFS bucket
//         default: null // By default, no profile picture is associated
//     },
//     bio: {
//         type:String,
//         default: 'Add your Bio'
//     },
//     followers: [
//         {
//             type:mongoose.Schema.Types.ObjectId,
//             ref: "User", // Reference to the GridFS bucket
//             default: null
//         }
//     ],
//     following: [
//         {
//             type:mongoose.Schema.Types.ObjectId,
//             ref: "User", // Reference to the GridFS bucket
//             default: null
//         }
//     ],
//     posts: [
//         {
//             type:mongoose.Schema.Types.ObjectId,
//             ref: "Posts",
//             default: null
//         }
//     ],
//     tokens: [{ type: String }], // Array to store tokens
//     created:{
//         type:Number,
//         default:Date.now()
//     }
// },{ timestamps: true });
// //We can can also pass functions(middleware) to our model here`using the schema;
// //We can use .pre and .post to create  the function
// //Every single this over here refers to the document


// //We always have to use the function keyword because using this on arrow functions will return undefined
// // UserSchema.pre('save', async function () {//The first parameter is the conditional parameter
// //     //So in this case the function will run before save
// //     //If we are using an  async function we don't need to bring the next parameter.
// //     const salt = await bcrypt.genSalt(10)
// //     this.password = await bcrypt.hash(this.password, salt)
// // })
// UserSchema.pre('save', async function (next) {
//     // Only hash the password if it has been modified
//     if (this.isModified('password')) {
//         const salt = await bcrypt.genSalt(10);
//         this.password = await bcrypt.hash(this.password, salt);
//     }
//     next(); // Proceed to save
// });



// //We can also generate the token here with the UserSchema.methods object
// UserSchema.methods.createJWT = function () {
//     return jwt.sign({ userId: this._id, username: this.username },process.env.JWT_SECRET,{expiresIn: process.env.JWT_LIFETIME}
//     )
// }



// //We can never reverse the password after hashing it with bcrypt
// //We can only compare them
// UserSchema.methods.comparePasswords =async function (canditatePassword) {
//     console.log("Candidate Password:", canditatePassword);  // Log the password the user inputs
//     console.log("Stored Password (Hash):", this.password);  // Log the hashed password in the database
    
//     const isMatch = await bcrypt.compare(canditatePassword, this.password);
    
//     console.log("Passwords Match:", isMatch);  // Log the result of the comparison

//     //this.password refers to the password in  the database

//     //The canditate password is the password the user input
//     return isMatch;
// };

// UserSchema.index({ email: 1 }, { unique: true }); // Ensure unique index on email
// UserSchema.index({ username: 1 }, { unique: true }); // Ensure unique index on username

// const User = mongoose.model("User", UserSchema);
// module.exports = User;
