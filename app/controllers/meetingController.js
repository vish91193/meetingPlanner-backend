const mongoose = require('mongoose')
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib')
const check = require('../libs/checkLib')
const UserModel = mongoose.model('UserModel')
const MeetingModel = mongoose.model('MeetingModel')


let getAllUsersFunction = (req, res) => {

    UserModel.find({ admin: false })
        .select('-_id -__v -admin -createdOn -active -password')
        .lean()
        .exec((err, result) => {
            if (err) {
                console.log(err)
                logger.error(err.message, 'Meeting Controller: findUsers', 10)
                let apiResponse = response.generate(true, 'Internal error occured in getting the Users', 500, null)
                res.send(apiResponse)
            } else if (check.isEmpty(result)) {
                logger.info('No Users Found', 'Meeting Controller: findUsers')
                let apiResponse = response.generate(true, 'No Users Found', 404, null)
                res.send(apiResponse)
            } else {
                let apiResponse = response.generate(false, 'Users Found', 200, result)
                res.send(apiResponse)
            }
        })
}

let getUserMeetingsFunction = (req, res) => {
    let validateUserInput = () => {
        return new Promise((resolve, reject) => {
            if (check.isEmpty(req.params.userId)) {
                let apiResponse = response.generate(true, 'userId parameter missing', 400, null)
                reject(apiResponse)
            } else {
                resolve()
            }
        })
    }

    let getAllMeetings = () => {
        return new Promise((resolve, reject) => {
            MeetingModel.find({ $and: [{ userId: req.params.userId }, { currentYear: new Date().getFullYear() }] })
                .select('-_id -__v -currentYear')
                .lean()
                .exec((err, result) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'Meeting Controller: getAllMeetings', 10)
                        let apiResponse = response.generate(true, 'Error occured while getting the Meetings', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(result)) {
                        logger.info('No Meetings Found', 'Meeting Controller: getAllMeetings')
                        let apiResponse = response.generate(true, 'No Meetings Found', 404, null)
                        reject(apiResponse)
                    } else {

                        resolve(result)
                    }
                })
        })
    }
    validateUserInput(req, res)
        .then(getAllMeetings)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Meetings Found', 200, resolve)
            res.send(apiResponse)
        })
        .catch((err) => {
            console.log(err)
            res.send(err)
        })
}

module.exports = {
    getAllUsers: getAllUsersFunction,
    getUserMeetings: getUserMeetingsFunction
}