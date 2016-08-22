var express      = require('express');
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var passport     = require('passport');
var session      = require('express-session');
var db           = require('./models/db.js');
var flash        = require('connect-flash');
var mongoose     = require('mongoose');
var hbs          = require('hbs');
var stylus       = require('express-stylus');

//Pages
var homepage     = require('./routes/homepage');
var signUp       = require('./routes/signup');
var login        = require('./routes/login');
var users        = require('./routes/users');

var app = express();

var publicDirectory = path.join(__dirname, 'public');

//Express
app.use(favicon(path.join(publicDirectory, 'favicon.ico')));
app.use(express.static(publicDirectory));
app.use(logger('dev'));

//Handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

//BodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

//CookieParser
app.use(cookieParser());

//Passport
app.use(session({
  secret: 'passport_secret',
  resave: true,
  saveUninitialized: true
  }
));
app.use(passport.initialize());
app.use(passport.session());

//Flash
app.use(flash());

//MongoDB
mongoose.connect('mongodb://localhost/app');

//Stylus
app.use(stylus({
  src: path.join(publicDirectory, "stylesheets")
}));

//Routes
app.use('/', homepage);
app.use('/signup', signUp);
app.use('/login', login);
app.use('/users', users);

//404 error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

//Development error handler
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

//Production error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
