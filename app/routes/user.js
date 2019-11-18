const express = require('express');
const router = express.Router();
const userController = require("./../../app/controllers/userController");
const appConfig = require("./../../config/appConfig")
const auth = require('./../middlewares/auth')

module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/users`;

    app.post(`${baseUrl}/signup`, userController.signUp);
    /**
     * @apiVersion  1.0.0
     * @apiGroup users
     * @api {post} /api/v1/users/signup New User SignUp.
     *     
     * @apiParam {string} firstName firstName of the user. (body params) (required)
     * @apiParam {string} lastName lastName of the user. (body params)
     * @apiParam {string} mobileNumber mobileNumber of the user. (body params) (required)
     * @apiParam {string} email email of the user. (body params) (required)
     * @apiParam {string} password password of the user. (body params) (required)
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "User Created",
            "status": 200,
            "data": {               
                "userId":string,
                "firstName": string,
                "lastName": string,                
                "email":string,
                "mobileNumber": string,
                "password": string,
                "createdOn":date
            }
        }
        @apiErrorExample {json} Error-Response:
	 *
	 * {
	    "error": true,
	    "message": "Failed to create user",
	    "status": 500,
	    "data": null
	   }
    */

    app.post(`${baseUrl}/login`, userController.signin);
    /**
     * @apiGroup users
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/signin api for user signin.
     *
     * @apiParam {string} email E-mail ID of the user. (body params) (required)
     * @apiParam {string} password Password of the user. (body params) (required)
     *
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "signin Successful",
            "status": 200,
            "data": {
                "authToken":string,
                "userDetails":{
                "userId":string,
                "firstName": string,
                "lastName": string,                
                "email":string,
                "mobileNumber": string,
                "createdOn":date
                }
            }
        }
        @apiErrorExample {json} Error-Response:
	 *
	 * {
	    "error": true,
	    "message": "Failed to signin",
	    "status": 500,
	    "data": null
	   }
    */


    app.post(`${baseUrl}/verifyUser`, userController.verifyUser);
    /**
  * @apiGroup User
  * @apiVersion  1.0.0
  * @api {post} /api/v1/users/verifyUser User Verification.
  *
  * @apiParam {string} verifyToken verifyToken of the user. (body params) (required)
  * 
  * @apiSuccessExample {object} Success-Response:
      {
         "error": false,
         "message": "Your account is successfully verified",
         "status": 200,
         "data": {
             "n": 1,
             "nModified": 1,
             "ok": 1
             }
         }
     }
     @apiErrorExample {json} Error-Response:
  *
  * {
     "error": true,
     "message": "Failed to verify the user",
     "status": 500,
     "data": null
    }
 */


    app.post(`${baseUrl}/forgotPwd`, userController.forgotPassword);
    /**
     * @apiGroup User
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/forgot User Forgot Password.
     *
     * @apiParam {string} email email of the user. (body params) (required)
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "Reset Token Successful",
            "status": 200,
            "data": {
                "userId":string,
                "email":string,
                "firstName": string,
                "lastName": string,
                "password": string,
                "verified" : boolean,
                "createdOn":date,
                "resetPasswordExpires":date,
                "resetPasswordToken" : string,
                "countryCode" : string,
                "mobileNumber" : number
            }
        }
        @apiErrorExample {json} Error-Response:
     *
     * {
        "error": true,
        "message": "Reset Token Failed",
        "status": 500,
        "data": null
       }
    */


    app.post(`${baseUrl}/resetPwd`, userController.resetPwd);
    /**
     * @apiGroup User
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/reset User Reset Password.
     *
     * @apiParam {string} password password of the user. (body params) (required)
     * @apiParam {string} resetPasswordToken resetPasswordToken of the user. (body params) (required)
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "Password successfully updated",
            "status": 200,
            "data": {
                "n": 1,
                "nModified": 1,
                "ok": 1
            }
        }
        @apiErrorExample {json} Error-Response:
     *
     * {
        "error": true,
        "message": "Password update Failed",
        "status": 500,
        "data": null
       }
    */

    app.post(`${baseUrl}/logout/:userId`, auth.isAuthorized, userController.logout);
    /**
    * @apiGroup users
    * @apiVersion  1.0.0
    * @api {post} /api/v1/users/logout/:userId  Logout currently logged-in user.
    *
    * @apiParam {String} authToken The token for authentication.(Send authToken as query parameter, body parameter or as a header)
    * @apiParam {string} userId userId of the user. (body Params) (required)
    * 
    * @apiSuccessExample {object} Success-Response:
        {
           "error": false,
           "message": "Logged Out Successfully",
           "status": 200,
           "data": {
               "n": 0,
               "ok": 1
           }
       }
   */


    app.get(`${baseUrl}/userDetails/:userId`, auth.isAuthorized, userController.getUserDetails)
    /**
  * @apiGroup User
  * @apiVersion  1.0.0
  * @api {get} /api/v1/users/userDetails/:userId Get User Details.
  *
  * @apiParam {string} authToken The token for authentication.(Send authToken as query parameter, body parameter or as a header)
  * @apiParam {string} userId userId of the user
  * 
  * @apiSuccessExample {object} Success-Response:
     {
        "error": false,
        "message": "User Found",
        "status": 200,
        "data": {
            "lastName": string,
            "admin": boolean,
            "createdOn": date,
            "verified": boolean,
            "userId": string,
            "firstName": string,
            "userName": string,
            "email": string,
            "countryCode": string,
            "mobileNumber": number
        }
    }
    @apiErrorExample {json} Error-Response:
  *
  * {
    "error": true,
    "message": "No User Found",
    "status": 500,
    "data": null
   }
  */

}