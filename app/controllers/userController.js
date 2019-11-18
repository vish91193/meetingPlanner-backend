const mongoose = require('mongoose')
const shortid = require('shortid')
const time = require('./../libs/timeLib')
const passwordLib = require('./../libs/generatePasswordLib')
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib')
const validateInput = require('../libs/paramsValidationLib')
const check = require('../libs/checkLib')
const token = require('../libs/tokenLib')
const mailerLib = require('../libs/mailerLib')
const UserModel = mongoose.model('UserModel')
const AuthModel = mongoose.model('Auth')
const uuid = require('uuid')


let signUpFunction = (req, res) => {

    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (req.body.email) {
                if (!validateInput.Email(req.body.email)) {
                    let apiResponse = response.generate(true, 'Email invalid!', 400, null)
                    reject(apiResponse)
                } else if (check.isEmpty(req.body.password)) {
                    let apiResponse = response.generate(true, '"password" parameter missing"', 400, null)
                    reject(apiResponse)
                } else {
                    resolve(req)
                }
            } else {
                logger.error('Field Missing During User Creation', 'userController: createUser()', 5)
                let apiResponse = response.generate(true, 'One or More Parameter(s) is missing', 400, null)
                reject(apiResponse)
            }
        })
    }// end validate user input
    let createUser = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ email: req.body.email })
                .select(' -__v -_id')
                .exec((err, retrievedUserDetails) => {
                    if (err) {
                        logger.error(err.message, 'userController: createUser', 10)
                        let apiResponse = response.generate(true, 'Failed To Create User', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(retrievedUserDetails)) {
                        // console.log(req.body)
                        let newUser = new UserModel({
                            userId: shortid.generate(),
                            firstName: req.body.firstName,
                            lastName: req.body.lastName || '',
                            userName: req.body.userName,
                            email: req.body.email.toLowerCase(),
                            countryCode: req.body.countryCode,
                            mobileNumber: req.body.mobileNumber,
                            admin: (req.body.userName.endsWith('-admin') ? true : false),
                            password: passwordLib.hashpassword(req.body.password),
                            verifyUserToken: uuid.v4(),
                            createdOn: time.now()
                        })
                        newUser.save((err, newUser) => {
                            if (err) {
                                logger.error(err.message, 'userController: createUser', 10)
                                let apiResponse = response.generate(true, 'Failed to save new User', 500, null)
                                reject(apiResponse)
                            } else {
                                //toObject(): converts result from save operation ie mongoose document
                                //to a plain JS object
                                let newUserObj = newUser.toObject();
                                mailerLib.sendEmail('"Meeting Planner" <admin@meetingPlanner.in>',
                                    newUserObj.email, 'Welcome to Meeting Planner App', `Hi ${newUserObj.firstName} ${newUserObj.lastName}<br>
                                Welcome to Meeting Planner App! <br> Please click
                                <a href="http://themeetingplanner.xyz/verifyUser?verifyUserToken=${newUserObj.verifyUserToken}"> here </a> to verify your e-mail.<br>
                                <br>Keep planning!<br>Meeting Planner Team`)
                                resolve(newUserObj)
                            }
                        })
                    } else {
                        logger.error('A user with this email-ID already exists! Try with a different one.', 'userController: createUser', 4)
                        let apiResponse = response.generate(true, 'User Already Present With this Email', 403, null)
                        reject(apiResponse)
                    }
                })
        })
    }// end create user function


    validateUserInput(req, res)
        .then(createUser)
        .then((resolve) => {
            delete resolve.password
            let apiResponse = response.generate(false, 'User created', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err);
        })

}// end user signup function 



let verifyUserFunction = (req, res) => {
    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.body.verifyUserToken)) {
                let apiResponse = response.generate(true, 'verifyUserToken parameter is missing', 400, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    }
    let verifyUser = () => {
        return new Promise((resolve, reject) => {
            UserModel.update({ verifyUserToken: req.body.verifyUserToken }, { $unset: { verifyUserToken: 1 }, verified: true }, (err, result) => {
                if (err) {
                    console.log(err)
                    logger.error('Failed to Retrieve User Data', 'User Controller : verifyUser', 5)
                    let apiResponse = response.generate(true, 'Failed to verify the user', 400, null)
                    reject(apiResponse)
                } else if (result.n === 0) {
                    logger.error('No User Found', 'User Controller : verifyUser', 5)
                    let apiResponse = response.generate(true, 'No User Details Found', 400, null)
                    reject(apiResponse)
                } else {
                    resolve(result)
                }
            })
        })
    }
    validateUserInput(req, res)
        .then(verifyUser)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Your account is successfully verified!', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err)
        })
}


let signinFunction = (req, res) => {
    let findUser = () => {
        return new Promise((resolve, reject) => {
            if (req.body.email) {

                UserModel.findOne({ email: req.body.email }, (err, userDetails) => {
                    /* handle the error here if the User is not found */
                    if (err) {
                        logger.error('Failed To Retrieve User Data', 'userController: findUser()', 10)
                        /* generate the error message and the api response message here */
                        let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                        reject(apiResponse)

                    } else if (check.isEmpty(userDetails)) {
                        /* generate the response and the console error message here */
                        logger.error('No User Found', 'userController: findUser()', 7)
                        let apiResponse = response.generate(true, 'No such user found', 404, null)
                        reject(apiResponse)
                    }
                    else if (userDetails.verified == false) {
                        logger.error('User not verified', 'User Controller : findUser', 5)
                        let apiResponse = response.generate(true, 'Email is not verified', 400, null)
                        reject(apiResponse)
                    }
                    else {
                        /* prepare the message and the api response here */
                        logger.info('User Found', 'userController: findUser()', 10)
                        resolve(userDetails)
                    }
                });

            } else {
                let apiResponse = response.generate(true, '"email" parameter is missing', 400, null)
                reject(apiResponse)
            }
        })
    }
    let validatePassword = (retrievedUserDetails) => {
        return new Promise((resolve, reject) => {
            passwordLib.comparePassword(req.body.password, retrievedUserDetails.password, (err, isMatch) => {
                if (err) {
                    logger.error(err.message, 'userController: validatePassword()', 10)
                    let apiResponse = response.generate(true, 'Internal error: signin Failed', 500, null)
                    reject(apiResponse)
                } else if (isMatch) {
                    let retrievedUserDetailsObj = retrievedUserDetails.toObject()
                    delete retrievedUserDetailsObj.password
                    delete retrievedUserDetailsObj._id
                    delete retrievedUserDetailsObj.__v
                    delete retrievedUserDetailsObj.createdOn
                    delete retrievedUserDetailsObj.modifiedOn
                    resolve(retrievedUserDetailsObj)
                } else {
                    logger.info('signin Failed Due To Invalid Password', 'userController: validatePassword()', 10)
                    let apiResponse = response.generate(true, 'Wrong Password: signin Failed', 400, null)
                    reject(apiResponse)
                }
            })
        })
    }

    let generateToken = (userDetails) => {
        return new Promise((resolve, reject) => {
            token.generateToken(userDetails, (err, tokenDetails) => {
                if (err) {
                    logger.error(err.message, 'userController: generateToken()', 10)
                    let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                    reject(apiResponse)
                } else {
                    tokenDetails.userId = userDetails.userId
                    tokenDetails.userDetails = userDetails
                    resolve(tokenDetails)
                }
            })
        })
    }
    let saveToken = (tokenDetails) => {
        return new Promise((resolve, reject) => {
            AuthModel.findOne({ userId: tokenDetails.userId }, (err, retrievedTokenDetails) => {
                if (err) {
                    logger.error(err.message, 'userController:saveToken()', 10)
                    let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(retrievedTokenDetails)) {
                    let newAuthToken = new AuthModel({
                        userId: tokenDetails.userId,
                        authToken: tokenDetails.token,
                        tokenSecret: tokenDetails.tokenSecret,
                        tokenGenerationTime: time.now()
                    })
                    newAuthToken.save((err, newTokenDetails) => {
                        if (err) {
                            logger.error(err.message, 'userController: saveToken', 10)
                            let apiResponse = response.generate(true, 'Failed To save Token', 500, null)
                            reject(apiResponse)
                        } else {
                            let responseBody = {
                                authToken: newTokenDetails.authToken,
                                userDetails: tokenDetails.userDetails
                            }
                            resolve(responseBody)
                        }
                    })
                } else {
                    retrievedTokenDetails.authToken = tokenDetails.token
                    retrievedTokenDetails.tokenSecret = tokenDetails.tokenSecret
                    retrievedTokenDetails.tokenGenerationTime = time.now()
                    retrievedTokenDetails.save((err, newTokenDetails) => {
                        if (err) {
                            logger.error(err.message, 'userController: saveToken', 10)
                            let apiResponse = response.generate(true, 'Failed To renew Token', 500, null)
                            reject(apiResponse)
                        } else {
                            let responseBody = {
                                authToken: newTokenDetails.authToken,
                                userDetails: tokenDetails.userDetails
                            }
                            resolve(responseBody)
                        }
                    })
                }
            })
        })
    }

    findUser(req, res)
        .then(validatePassword)
        .then(generateToken)
        .then(saveToken)
        .then((resolve) => {
            // console.log("Signin Resolve: " +resolve)
            let apiResponse = response.generate(false, 'Signin successful', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            // console.log("Signin errorhandler: " + JSON.stringify(err))
            // res.status(err.status)
            res.send(err)
        })
}// end of the signin function 


// to validate email id and send pwd reset link to user
let forgotPasswordFunction = (req, res) => {
    let validateEmail = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ email: req.body.email }, (err, result) => {
                if (err) {
                    logger.error(err.message, 'User Controller : validateEmail', 10)
                    let apiResponse = response.generate(true, `Internal error occured : ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'No User Found', 400, null)
                    reject(apiResponse)
                } else {
                    resolve()
                }
            })
        })
    }
    let updateToken = () => {
        return new Promise((resolve, reject) => {
            let findQuery = {
                email: req.body.email
            }
            let updateQuery = {
                resetPwdToken: uuid.v4(),
                resetPwdLinkExpiry: Date.now() + 900000 //pwd reset link expires after 15 mins
            }
            UserModel.findOneAndUpdate(findQuery, updateQuery, { multi: true, new: true })
                .exec((err, result) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'User Controller: updateToken', 10)
                        let apiResponse = response.generate(true, `Update Token Failed`, 500, null)
                        reject(apiResponse)
                    } else {
                        let resultObj = result.toObject()
                        delete resultObj._id
                        delete resultObj.__v
                        delete resultObj.password
                        delete resultObj.admin
                        mailerLib.sendEmail('"Meeting Planner" <admin@meetingPlanner.in>',
                            resultObj.email, 'Password reset for Meeting Planner App', `Hi ${resultObj.firstName} ${resultObj.lastName}<br>
                        You requested to reset your passowrd. <br>Please click <a href="http://themeetingplanner.xyz/resetPwd?resetPwdToken=${resultObj.resetPwdToken}" > here </a>to reset it.<br>
                        Keep planning!<br>Meeting Planner Team`)
                        resolve(resultObj)
                    }
                })
        })
    }
    validateEmail(req, res)
        .then(updateToken)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Token updated & reset link sent!', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err)
        })
}


let resetPwdFunction = (req, res) => {
    let findUser = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ resetPwdToken: req.body.resetPwdToken, resetPwdLinkExpiry: { $gt: new Date(Date.now()) } }, (err, result) => {
                if (err) {
                    logger.error(err.message, 'User Controller : findUser', 10)
                    let apiResponse = response.generate(true, `error occured : ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'Link Expired', 400, null)
                    reject(apiResponse)
                } else {
                    resolve()
                }
            })
        })
    }

    let validatePassword = () => {
        return new Promise((resolve, reject) => {
            if (!validateInput.Password(req.body.password)) {
                let apiResponse = response.generate(true, `Password must be 6 characters long & only characters,numeric digits, underscore and first character must be a letter`, 400, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    }

    let updatePassword = () => {
        return new Promise((resolve, reject) => {
            let updateQuery = {
                password: passwordLib.hashpassword(req.body.password),
                $unset: { resetPwdToken: 1, resetPwdLinkExpiry: 1 }
            }
            UserModel.update({ resetPwdToken: req.body.resetPwdToken }, updateQuery, (err, result) => {
                if (err) {
                    logger.error(err.message, 'User Controller : resetPassword', 10)
                    let apiResponse = response.generate(true, `Password update failed`, 500, null)
                    reject(apiResponse)
                }
                else if (check.isEmpty(result)) {
                    let apiResponse = response.generate(true, 'No User Found', 400, null)
                    reject(apiResponse)
                } else {
                    resolve(result)
                }
            })
        })

    }
    findUser(req, res)
        .then(validatePassword)
        .then(updatePassword)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Your password has been changed!', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.send(err)
        })
}


/**
 * function to logout user.
 * auth params: userId.
 */
let logoutFunction = (req, res) => {
    AuthModel.findOneAndRemove({ userId: req.params.userId }, (err, result) => {
        if (err) {
            // console.log(err)
            logger.error(err.message, 'user Controller: logout', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'Already Logged Out or Invalid UserId', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Logged Out Successfully', 200, null)
            res.send(apiResponse)
        }
    })
} // end of the logout function.

let getUserDetailsFunction = (req, res) => {
    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.params.userId)) {
                let apiResponse = response.generate(true, 'userId parameter is missing', 400, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    }

    let getUserDetails = () => {
        return new Promise((resolve, reject) => {
            UserModel.findOne({ userId: req.params.userId })
                .select('-_id -__v -password')
                .lean()
                .exec((err, result) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'User Controller: getUserDetails', 10)
                        let apiResponse = response.generate(true, 'Error occured while getting the User', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(result)) {
                        logger.info('No User Found', 'User Controller: getUserDetails')
                        let apiResponse = response.generate(true, 'No User Found', 404, null)
                        reject(apiResponse)
                    } else {
                        resolve(result)
                    }
                })
        })
    }
    validateUserInput(req, res)
        .then(getUserDetails)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'User Found', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log(err)
            res.send(err)
        })
}

module.exports = {

    signUp: signUpFunction,
    signin: signinFunction,
    verifyUser: verifyUserFunction,
    forgotPassword: forgotPasswordFunction,
    resetPwd: resetPwdFunction,
    logout: logoutFunction,
    getUserDetails: getUserDetailsFunction
}// end exports