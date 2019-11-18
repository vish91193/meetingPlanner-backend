const mongoose = require('mongoose')
const socketio = require('socket.io')
const events = require('events')
const eventEmitter = new events.EventEmitter()
const tokenLib = require('./tokenLib')
const check = require('../libs/checkLib')
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib')
const mailerLib = require('../libs/mailerLib')
const shortid = require('shortid')
const schedule = require('node-schedule')
const MeetingModel = mongoose.model('MeetingModel')
const dateformat = require('dateformat')

//called from app.js
//getting http server from there
let setServer = (server) => {
    let io = socketio.listen(server)
    let myIo = io.of('')  //namespace: global instance of io can be used for cross socket communication.
    console.log("Inside socket set server")

    //main event handler: everything happens here
    myIo.on('connection', (socket) => {
        console.log("Inside socket connection")
        /**
         * @apiGroup Emit
         * @apiVersion 1.0.0
         * @api {emit} forgot-password Password reset email        
         * @apiDescription <b>("forgot-password")</b> : To send an e-mail with password reset link.
         * @apiExample Example data emitted
            *{
                "email":string,
                "resetPasswordToken":string
            }
        */
        socket.on('forgot-password', (data) => {
            mailerLib.sendEmail('"Meeting Planner" <admin@meetingPlanner.in>',
                data.email, 'Password reset for Meeting Planner App', `Hi ${data.firstName} ${data.lastName},<br><br>
            You requested to reset your passowrd. <br>Please click this link to reset it <a href="http://themeetingplanner.xyz/verifyUser?activateToken=${data.resetPasswordToken}" ></a><br><br>FollowUp Team`)
        })


        //event handling on client side to get verified user with an authToken
        /**
         * @apiGroup Listen
         * @apiVersion 1.0.0
         * @api {listen} verifyUser Authenticate a user	  
         * @apiDescription <b>("verifyUser")</b> 
         * -> Called: On User's end.     
         */
        socket.emit('verifyUser', '')


        /**
         * @apiGroup Emit 
         * @apiVersion 1.0.0	 
         * @api {emit} setUser Set a user as online
         * @apiDescription <b>("set-user")</b>
         * -> Called: When a user comes online.
         * -> Params: authentication token        
         */

        socket.on('set-user', (authToken) => {

            tokenLib.verifyClaimWithoutSecret(authToken, (err, result) => {
                if (err) {
                	/**
                    * @apiGroup Listen
                    * @apiVersion 1.0.0                                      
                    * @api {listen} authError Failed authentication token authorization                              
                    * @apiDescription <b>("auth-error")</b>
                    * Called: Listened by current/main room when there is a problem with authentication token like incorrect/expired
                    * @apiExample Example data
                      {
                        "status": 500,
                        "error": Authentication token expired/incorrect                        
                       }
                     */
                    socket.emit('authError', { status: 500, error: 'Authentication token expired/incorrect' })

                
                } else {
                    socket.join(result.data.userId)
                    console.log("Inside backend: join user room")

                    /**
                     * @apiGroup Emit
                     * @apiVersion 1.0.0
                     * @api {emit} createNewMeeting Create a new meeting for a user.           
                     * @apiDescription <b>("createNewMeeting")</b> Emitted for creating a new meeting.It will also send meeting created email and also schedule an alarm.
                     * @apiExample Example data to be emitted
                     *  {
                                "meetingId" : string,
                                "title" : string,
                                "start" : date,
                                "end" : date,
                                "venue" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string
                        }
                    */
                    socket.on('createNewMeeting', (data) => {
                        data['meetingId'] = shortid.generate()
                        console.log("Inside backend: createNewMeeting")
                        eventEmitter.emit('saveMeetingToDb', data)
                    })
                    /**
                     * @apiGroup Emit 
                     * @apiVersion 1.0.0
                     * @api {emit} edit-meeting Edit an existing meeting  .
                     * @apiDescription <b>("edit-meeting")</b> Emitted for saving an edited meeting.It will also send meeting edited email and reschedule the meeting.
                     * @apiExample The following data has to be emitted
                     *{
                                "meetingId" : string,
                                "title" : string,
                                "start" : date,
                                "end" : date,
                                "venue" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string
                    }
                */
                    socket.on('edit-meeting', (data) => {
                        console.log("Inside backend: edit meeting")
                        eventEmitter.emit('editMeetingDb', data)
                    })

                    /**
                    * @apiGroup Emit 
                    * @apiVersion 1.0.0
                    * @api {emit} delete-meeting Delete meeting              
                    * @apiDescription <b>("delete-meeting")</b> Emitted to delete/cancel a meeting.It will also send meeting deletion email and cancel the scheduled alarm & email.
                    * @apiExample Example data emitted
                    *{
                                "meetingId" : string,
                                "title" : string,
                                "start" : date,
                                "end" : date,
                                "venue" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string
                    }
                */
                    socket.on('delete-meeting', (data) => {
                        console.log("Inside backend: delete meeting")
                        eventEmitter.emit('deleteMeetingFromDb', data)
                    })
                }

            })
        })

        socket.on('set-admin', (authToken) => {
            console.log("Inside backend: set-admin")
            tokenLib.verifyClaimWithoutSecret(authToken, (err, result) => {
                if (err) {
                    socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' })
                } else {
                    /**
                     * @apiGroup Listen
                     * @apiVersion 1.0.0                     
                     * @api {listen} start-room Starting the room                    
                     * @apiDescription <b>("start-room")</b> has to be listened to start a room when an admin logs in.
                    */
                    socket.emit('start-room', '')
                    console.log("Inside backend: start-room")


                    /**
                     * @apiGroup Emit
                     * @apiVersion 1.0.0
                     * @api {emit} join-room Joining the current room
                     * @apiDescription <b>("join-room")</b> Emitted when an admin opens a user page to check his meetings. Data required: <b>userId</b>
                    */
                    socket.on('join-room', (data) => {
                        socket.room = data
                        socket.join(socket.room)
                        console.log("Inside backend: join-room")
                    })


                    /**
                     * @apiGroup Emit
                     * @apiVersion 1.0.0
                     * @api {emit} createNewMeeting Create a new meeting for a user.           
                     * @apiDescription <b>("createNewMeeting")</b> Emitted for creating a new meeting.It will also send meeting created email and also schedule an alarm.
                     * @apiExample Example data to be emitted
                     *  {
                                "meetingId" : string,
                                "title" : string,
                                "start" : date,
                                "end" : date,
                                "venue" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string
                      }
                  */
                    socket.on('createNewMeeting', (data) => {
                        data['meetingId'] = shortid.generate()
                        console.log("Inside backend: createNewMeeting")
                        eventEmitter.emit('saveMeetingToDb', data)
                    })


                    /**
                     * @apiGroup Emit 
                     * @apiVersion 1.0.0
                     * @api {emit} edit-meeting Edit an existing meeting  .
                     * @apiDescription <b>("edit-meeting")</b> Emitted for saving an edited meeting.It will also send meeting edited email and reschedule the meeting.
                     * @apiExample The following data has to be emitted
                       *{
                                "meetingId" : string,
                                "title" : string,
                                "start" : date,
                                "end" : date,
                                "venue" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string
                       }
                   */
                    socket.on('edit-meeting', (data) => {
                        console.log("Inside backend: edit meeting")
                        eventEmitter.emit('editMeetingDb', data)
                    })

                    /**
                    * @apiGroup Emit 
                    * @apiVersion 1.0.0
                    * @api {emit} delete-meeting Delete meeting              
                    * @apiDescription <b>("delete-meeting")</b> Emitted to delete/cancel a meeting.It will also send meeting deletion email and cancel the scheduled alarm & email.
                    * @apiExample Example data emitted
                       *{
                                "meetingId" : string,
                                "title" : string,
                                "start" : date,
                                "end" : date,
                                "venue" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string
                       }
                   */
                    socket.on('delete-meeting', (data) => {
                        console.log("Inside backend: delete meeting")
                        eventEmitter.emit('deleteMeetingFromDb', data)
                    })
                }
            })
        })

        socket.on('disconnect', (userId) => {
            socket.leave(socket.room)
        })
    })


    // ------------ DB events -----------------
    eventEmitter.on('saveMeetingToDb', (data) => {
        let getDuplicateMeetings = () => {
            return new Promise((resolve, reject) => {
                // to find whether any 2 meetings clash or not.
                // if Yes then assign a different colour code to the later.
                let findQuery = {
                    $and: [
                        { userId: data.userId },
                        {
                            $or: [
                                {
                                    $and: [
                                        { start: { $gte: new Date(data.start) } },
                                        { start: { $lte: new Date(data.end) } }
                                    ]
                                },
                                {
                                    $and: [
                                        { end: { $gte: new Date(data.start) } },
                                        { end: { $lte: new Date(data.end) } }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                MeetingModel.find(findQuery)
                    .select('-_id -__v')
                    .lean()
                    .exec((err, result) => {
                        if (err) {
                            console.log(err)
                            logger.error(err.message, 'Socket Library: getAllMeetings', 10)
                            let apiResponse = response.generate(true, 'Internal Error in finding duplicate Meetings', 500, null)
                            reject(apiResponse)
                        } else if (check.isEmpty(result)) {
                            logger.info('No duplicate Meetings Found', 'Socket Library: getAllMeetings')
                            resolve()
                        } else {
                            // Duplicate meeting: Red, Default: Blue
                            console.log("Inside backend createMeeting: duplicate meeting found")
                            resolve({
                                primary: '#ad2121',
                                secondary: '#FAE3E3'
                            })
                        }
                    })
            })
        }
        let createMeeting = (duplicateColorCode) => {
            return new Promise((resolve, reject) => {
                let newMeeting = new MeetingModel({
                    meetingId: data.meetingId,
                    title: data.title,
                    start: data.start,
                    end: data.end,
                    venue: data.venue,
                    color: (duplicateColorCode) ? duplicateColorCode : { primary: '#1e90ff', secondary: '#D1E8FF' },
                    adminId: data.adminId,
                    adminFullName: data.adminFullName,
                    adminUserName: data.adminUserName,
                    userId: data.userId,
                    userFullName: data.userFullName,
                    userEmail: data.userEmail,
                    currentYear: new Date(data.start).getFullYear()
                })
                newMeeting.save((err, newMeeting) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'Socket Library : createMeeting', 10)
                        let apiResponse = response.generate(true, 'Failed to create new meeting', 400, null)
                        reject(apiResponse)
                    } else {
                        console.log("Created new meeting successfully")
                        resolve(newMeeting)
                    }
                })
            })
        }
        getDuplicateMeetings()
            .then(createMeeting)
            .then((resolve) => {
                let resolvedObj = resolve.toObject()
                delete resolvedObj.__v
                delete resolvedObj._id
                delete resolvedObj.currentYear
                let apiResponse = response.generate(false, 'A new meeting has been scheduled.', 200, resolvedObj)

                /**
                 * @apiGroup Listen
                 * @apiVersion 1.0.0                  
                 * @api {listen} update-meeting Updating meeting in realtime for user and admin
                 * @apiDescription <b>("update-meeting")</b> Listened by both admin and user to get real time notifications about meeting scheduled/re-scheduled.
                 * @apiExample Example data
                    *{
                        error:false,
                        message : 'New Meeting created',
                        status : 200,
                        data :
                            {
                                "meetingId" : string,
                                "title" : string,
                                "startTime" : date,
                                "endTime" : date,
                                "venue" : string,
                                "adminId" : string,
                                "adminFullName" : string,
                                "adminUserName" : string,
                                "userId" : string,
                                "userFullName" : string,
                                "userEmail" : string
                            }
                    }
                */
                io.sockets.in(data.userId).emit('update-meeting', apiResponse)
                eventEmitter.emit('meetingCreatedEmail', resolvedObj)
                eventEmitter.emit('schedule-meeting', resolvedObj)
            })
            .catch((err) => {
                console.log(err)
            })
    })


    eventEmitter.on('editMeetingDb', (data) => {

        let getDuplicateMeetings = () => {
            return new Promise((resolve, reject) => {
                let findQuery = {
                    $and: [
                        { userId: data.userId },
                        {
                            $or: [
                                {
                                    $and: [
                                        { start: { $gte: new Date(data.start) } },
                                        { start: { $lte: new Date(data.end) } }
                                    ]
                                },
                                {
                                    $and: [
                                        { end: { $gte: new Date(data.start) } },
                                        { end: { $lte: new Date(data.end) } }
                                    ]
                                }
                            ]
                        },
                        { meetingId: { $ne: data.meetingId } }
                    ]
                }
                MeetingModel.find(findQuery)
                    .select('-_id -__v')
                    .lean()
                    .exec((err, result) => {
                        if (err) {
                            console.log(err)
                            logger.error(err.message, 'Socket Library: getAllMeetings', 10)
                            let apiResponse = response.generate(true, 'Internal error in finding duplicate meetings', 500, null)
                            reject(apiResponse)
                        } else if (check.isEmpty(result)) {
                            logger.info('No duplicate Meetings Found', 'Socket Library: getAllMeetings')
                            resolve()
                        } else {
                            // Duplicate meeting: Red, Default: Blue
                            resolve({
                                primary: '#ad2121',
                                secondary: '#FAE3E3'
                            })
                        }
                    })
            })
        }

        let editAndSaveMeeting = (duplicateColorCode) => {
            return new Promise((resolve, reject) => {
                let findQuery = {
                    meetingId: data.meetingId
                }

                let updateQuery = {
                    title: data.title,
                    venue: data.venue,
                    start: data.start,
                    end: data.end,
                    color: (duplicateColorCode) ? duplicateColorCode : { primary: '#1e90ff', secondary: '#D1E8FF' },
                    currentYear: new Date(data.start).getFullYear()
                }
                console.log("Inside backend:socketLib:editmeeting - updateQuery: " + JSON.stringify(updateQuery))
                console.log("Meeting ID: " + data.meetingId)
                MeetingModel.findOneAndUpdate({ meetingId: data.meetingId }, {
                    title: data.title,
                    venue: data.venue,
                    start: data.start,
                    end: data.end,
                    color: (duplicateColorCode) ? duplicateColorCode : { primary: '#1e90ff', secondary: '#D1E8FF' },
                    currentYear: new Date(data.start).getFullYear()
                }, { new: true }, (err, editedMeeting) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'Socket Library : editAndSaveMeeting', 10)
                        let apiResponse = response.generate(true, 'Internal error: Failed to edit meeting', 400, null)
                        reject(apiResponse)
                    } else {
                        console.log("Inside backend:socketLib:editmeeting - : " + editedMeeting)
                        resolve(editedMeeting)
                    }
                })
            })
        }
        getDuplicateMeetings()
            .then(editAndSaveMeeting)
            .then((resolve) => {
                let resolvedObj = resolve.toObject()
                delete resolvedObj.__v
                delete resolvedObj._id
                let apiResponse = response.generate(false, 'Meeting saved', 200, resolvedObj)
                io.sockets.in(data.userId).emit('update-meeting', apiResponse)
                eventEmitter.emit('meetingEditedEmail', resolvedObj)
                eventEmitter.emit('schedule-meeting', resolvedObj)
            })
            .catch((err) => {
                console.log(err)
            })
    })


    eventEmitter.on('deleteMeetingFromDb', (data) => {
        let validateUserInput = () => {
            return new Promise((resolve, reject) => {
                if (check.isEmpty(data.meetingId)) {
                    let apiResponse = response.generate(true, 'meetingId parameter is missing', 400, null)
                    reject(apiResponse)
                }
                else {
                    resolve()
                }
            })
        }

        let deleteMeeting = () => {
            return new Promise((resolve, reject) => {
                MeetingModel.findOneAndRemove({ meetingId: data.meetingId }, (err, deletedMeeting) => {
                    if (err) {
                        console.log(err)
                        logger.error(err.message, 'Socket Library : deleteMeeting', 10)
                        let apiResponse = response.generate(true, 'Internal error: Failed to delete meeting', 400, null)
                        reject(apiResponse)
                    } else {
                        resolve(deletedMeeting)
                    }
                })
            })
        }
        validateUserInput()
            .then(deleteMeeting)
            .then((resolve) => {
                let resolvedObj = resolve.toObject()
                delete resolvedObj.__v
                delete resolvedObj._id
                let apiResponse = response.generate(false, 'Meeting deleted', 200, resolvedObj)
                /**
                 * @apiVersion 1.0.0
                 * @apiGroup Listen 
                 * @api {listen} delete-meeting Delete meeting in realtime.
                 * @apiDescription <b>("delete-meeting")</b> Listened by both admin and user to get real time notifications of meeting cancellations.
                */
                io.sockets.in(apiResponse.data.userId).emit('delete-meeting', apiResponse)
                eventEmitter.emit('meetingCancelledEmail', data)

                // canceling the scheduled task from the scheduledJobs array
                let scheduledMeeting = schedule.scheduledJobs[data.meetingId]
                if (scheduledMeeting) {
                    scheduledMeeting.cancel()
                }
            })
            .catch((err) => {
                console.log(err)
            })
    })

    // schedule for sending e-mail & alarm 15 minutes before a meeting starts
    eventEmitter.on('schedule-meeting', (data) => {
        let meeting = schedule.scheduledJobs[data.meetingId]
        if (meeting) {
            meeting.cancel()
        }
        let reminder = new Date(data.start).setMinutes(new Date(data.start).getMinutes() - 15)
        let a = schedule.scheduleJob(data.meetingId, reminder, function () {
            mailerLib.sendEmail('"Meeting Planner" <admin@meetingPlanner.in>',
                data.userEmail, 'Upcoming Meeting Notification', `Hi ${data.userFullName},<br><br>
            You have an upcoming meeting 15 minutes from now.
            <br>Please find the meeting details below: <br> 
            <b>Title: </b>${data.title}<br><b>Venue: </b>${data.venue}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}
            <br><br>Regards<br>Meeting Planner Team`)
            /**
             * @apiGroup Listen
             * @apiVersion 1.0.0
             * @api {listen} userId Meeting Alarm           
             * @apiDescription <b>("userId")</b> Listened by the online user for getting realtime notification about a meeting to be started in 15 minutes.
             * @apiExample Example data output
                    *{
                        "meetingId" : string,
                        "adminId" : string,
                        "adminFullName" : string,
                        "adminUserName" : string,
                        "userId" : string,
                        "userFullName" : string,
                        "userEmail" : string,
                        "start" : date,
                        "end" : date,
                        "venue" : string,
                        "title" : string
                    }
                */
            myIo.emit(data.userId, data)
        })

    })


    eventEmitter.on('meetingCreatedEmail', (data) => {
        mailerLib.sendEmail('"Meeting Planner" <admin@meetingPlanner.in>',
            data.userEmail, 'New meeting for you', `Hi <b>${data.userFullName}</b>,<br><br>
            A new meeting has been created by admin <b>${data.adminFullName}</b> for you.
            <br>Please find the meeting details below: <br> 
            <b>Title: </b>${data.title}<br><b>Venue: </b>${data.venue}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}
            <br><br>Regards<br>Meeting Planner Team`)
    })

    eventEmitter.on('meetingEditedEmail', (data) => {
        mailerLib.sendEmail('"Meeting Planner" <admin@meetingPlanner.in>',
            data.userEmail, 'Meeting Edited Notification', `Hi <b>${data.userFullName}</b>,<br><br>
            A meeting has been edited by admin <b>${data.adminFullName}</b>. 
            <br>Please find the meeting details below: <br> 
            <b>Title: </b>${data.title}<br><b>Venue: </b>${data.venue}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}
            <br><br>Regards<br>Meeting Planner Team`)
    })

    eventEmitter.on('meetingCancelledEmail', (data) => {
        mailerLib.sendEmail('"Meeting Planner" <admin@meetingPlanner.in>',
            data.userEmail, 'Meeting Cancelled Notification', `Hi <b>${data.userFullName}</b>,<br><br>
            A meeting has been cancelled by admin <b>${data.adminFullName}</b>. 
            <br>Please find the meeting details: <br> 
            <b>Title: </b>${data.title}<br><b>Venue: </b>${data.venue}<br><b>Start: </b>${dateformat(data.start, "dddd, mmmm dS, yyyy, h:MM TT")}<br><b>End: </b>${dateformat(data.end, "dddd, mmmm dS, yyyy, h:MM TT")}
            <br><br>Regards<br>Meeting Planner Team`)
    })

} //setServer end

module.exports = {
    setServer: setServer
}