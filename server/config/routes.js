const config = require('config');
const debug = require('debug')('urungi:server');
const mongoose = require('mongoose');
const Log = mongoose.model('Log');
const Company = mongoose.model('Company');
const User = mongoose.model('User');
const Role = mongoose.model('Role');

module.exports = function (app, passport) {
    app.get('/login', function (req, res, next) {
        res.cookie('XSRF-TOKEN', req.csrfToken());
        res.render('login', { base: config.get('base') });
    });

    app.get('/auth/google', passport.authenticate('google'));

    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/login' }),
        function (req, res) {
            res.redirect('/');
        }
    );

    app.post('/api/user/manager', function (req, res, next) {
        if (!req.body.username) {
            res.status(400).send('Param username is not defined');
        } else if (!req.body.hash) {
            res.status(400).send('Param hash is not defined');
        } else if (!req.body.roles) {
            res.status(400).send('Param roles is not defined');
        } else {
            // find a user in Mongo with provided username
            User.findOne({ userName: req.body.username }, function (err, user) {
                // In case of any error return
                if (err) {
                    res.status(500).send('Error creating the user: ' + err);
                }
                // already exists
                if (user) {
                    const roles = req.body.roles.split(',');
                    user.roles = [];
                    user.roles = roles;
                    user.save(function (err) {
                        if (err) {
                            return next(err);
                        }
                        res.status(200).send('User updated succesful');
                    });
                } else {
                    var newUser = new User();
                    // set the user's local credentials
                    newUser.userName = req.body.username;
                    newUser.hash = req.body.hash;
                    newUser.companyID = 'COMPID';
                    const roles = req.body.roles.split(',');
                    newUser.roles = [];
                    newUser.roles = roles;
                    newUser.status = 'active';

                    // save the user
                    newUser.save(function (err) {
                        if (err) {
                            return next(err);
                        }
                        res.status(201).send('User creation succesful');
                    });
                }
            });
        }
    });

    app.post('/api/login', function (req, res, next) {
        User.countDocuments({}, function (err, c) {
            if (err) throw err;

            if (c === 0) {
                debug('no records in the users model, this is the initial setup!');
                var theCompany = {};
                theCompany.companyID = 'COMPID';
                theCompany.createdBy = 'urungi setup';
                theCompany.nd_trash_deleted = false;
                Company.create(theCompany, function (result) {
                });

                var adminUser = new User();
                adminUser.userName = 'administrator';
                adminUser.password = 'urungi';
                adminUser.companyID = 'COMPID';
                adminUser.roles = [];
                adminUser.roles.push('ADMIN');
                adminUser.status = 'active';
                adminUser.nd_trash_deleted = false;

                adminUser.save().then(() => {
                    authenticate(passport, User, req, res, next);
                });
            } else {
                authenticate(passport, User, req, res, next);
            }
        });
    });
};

function authenticate (passport, User, req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) { return next(err); }

        if (!user) {
            if (global.logFailLogin) {
                Log.saveToLog(req, { text: 'User fail login: ' + info.message, code: 102 });
            }
            res.status(401).send(info.message);
        } else {
            var loginData = {
                last_login_date: new Date(),
                last_login_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress
            };

            // insert the company's Data into the user to avoid a 2nd server query'

            Company.findOne({ companyID: user.companyID }, {}, function (err, company) {
                if (err) throw err;

                if (!company) {
                    Log.saveToLog(req, { text: 'User fail login: ' + user.userName + ' (' + user.email + ') user company not found!', code: 102 });
                    res.status(401).send("User's company not found!");
                } else {
                    user.companyData = company;

                    User.updateOne({
                        _id: user._id
                    }, {
                        $set: loginData
                    }, function (err) {
                        if (err) throw err;
                        req.logIn(user, function (err) {
                            if (err) { return next(err); }
                            res.json({ user: user.toObject() });

                            if (global.logSuccessLogin) {
                                Log.saveToLog(req, { text: 'User login: ' + user.userName + ' (' + user.email + ')', code: 102 });
                            }
                        });
                    });
                }
            });
        }
    })(req, res, next);
}
