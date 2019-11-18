const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
// core NodeJs module
const http = require('http');
const appConfig = require('./config/appConfig');
const logger = require('./app/libs/loggerLib');
const routeLoggerMiddleware = require('./app/middlewares/routeLogger.js');
const globalErrorMiddleware = require('./app/middlewares/appErrorHandler');

const morgan = require('morgan');
const helmet = require('helmet');


//------------------ Middlewares -------------------
app.use(morgan('dev'));
app.use(helmet())

// bodyParser - to use/get body parameters in our routes
app.use(bodyParser.json());
// type of body params
// pref format: x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(routeLoggerMiddleware.logIp);
app.use(globalErrorMiddleware.globalErrorHandler);

/**
* serve images, CSS & JavaScript files in a directory named 'client' i.e.
* to join client side code/static files like HTML/CSS/JS with backend, otherwise will get CORS error
* EX: http://localhost:3000/images/kitten.jpg
* http://localhost:3000/js/app.js
 */
app.use(express.static(path.join(__dirname, 'client')));

const modelsPath = './app/models';
const controllersPath = './app/controllers';
const libsPath = './app/libs';
const middlewaresPath = './app/middlewares';
const routesPath = './app/routes';

app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  next();
});
//------------------ Middlewares End -------------------

//reading models directory synchronously
fs.readdirSync(modelsPath).forEach(function (file) {
  if (~file.indexOf('.js')) {
    console.log(`including the ${modelsPath}/${file} model`)
    require(modelsPath + '/' + file)
  }
});
// end bootstraping models directory

//reading route directory synchronously
fs.readdirSync(routesPath).forEach(function (file) {
  if (~file.indexOf('.js')) {
    console.log(`Including the ${routesPath}/${file} route`)
    let route = require(routesPath + '/' + file);
    route.setRouter(app);
  }
});
// end bootstraping route directry


//If none of the routes sent by client-side is found then call global error middleware: 404 handler
app.use(globalErrorMiddleware.globalNotFoundHandler);
/* Order of declaring error-level middleware is important: 
if you put globalErrorHandlerMiddleware before the actual routes are called
 then all the routes will be re-directed to this & get an error */
// end global 404 handler


/**
 * Create HTTP server.
 * Recommended way of creating a new HTTP server using core NodeJs HTTP module.
 */

const server = http.createServer(app);
// start listening to http server
console.log(appConfig);
server.listen(appConfig.port);
server.on('error', onError);
server.on('listening', onListening);

// end server listening code


//---------------- socket io connection handler -----------------
const socketLib = require("./app/libs/socketLib");
const socketServer = socketLib.setServer(server);
// --------------- end socketio connection handler --------------



/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    logger.error(error.code + ' not equal listen', 'serverOnErrorHandler', 10)
    throw error;
  }
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(error.code + ':elavated privileges required', 'serverOnErrorHandler', 10);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(error.code + ':port is already in use.', 'serverOnErrorHandler', 10);
      process.exit(1);
      break;
    default:
      logger.error(error.code + ':some unknown error occured', 'serverOnErrorHandler', 10);
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {

  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  ('Listening on ' + bind);
  logger.info('server listening on port' + addr.port, 'serverOnListeningHandler', 10);
  let db = mongoose.connect(appConfig.db.uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology : true });
}

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


// --------------- mongoose connection handler -----------------
/**
 * database connection settings
 * Listen if there is any error while connecting to mongoose client
 */
mongoose.connection.on('error', function (err) {
  console.log('database connection error');
  console.log(err)
  logger.error(err,
    'mongoose connection on error handler', 10)
  //process.exit(1)
}); // end mongoose connection error

// * Listen when connection is open to mongoose client
mongoose.connection.on('open', function (err) {
  if (err) {
    console.log("database error");
    console.log(err);
    logger.error(err, 'mongoose connection open handler', 10)
  } else {
    console.log("database connection open success");
    logger.info("database connection open",
      'database connection open handler', 10)
  }
  //process.exit(1)
}); //--------------- end mongoose connection handler -------------


module.exports = app;