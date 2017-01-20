/**
 * Created by Jay on 2016/5/20.
 */

var Setting = global.SETTING;
var Session = require("weroll/model/Session");
var Utils = require("weroll/utils/Utils");

function renderLoginPage(req, res, output, user) {
    output({ });
}

function processLogin(req, res, output) {
    var user;

    var q = [];
    q.push(function(cb) {
        var passport = { pwd:req.body.pwd };
        var account = req.body.account;
        if (Utils.checkEmailFormat(account)) {
            passport.email = account;
        } else if (Utils.cnCellPhoneCheck(account)) {
            passport.phone = account;
        } else {
            passport.username = account;
        }

        User.login(passport, function(err, doc) {
            user = doc;
            cb(err);
        });
    });
    q.push(function(cb) {
        //save session
        Session.getSharedInstance().save(user.toObject(), function(err, sess) {
            if (err) return cb(err);
            if (sess) {
                //set cookies
                var option = { path: Setting.session.cookiePath, expires: new Date(Date.now() + Setting.session.cookieExpireTime) };
                res.cookie("userid", sess.userid, option);
                res.cookie("token", sess.token, option);
                res.cookie("tokentimestamp", sess.tokentimestamp, option);
            }
            cb();
        });
    });
    runAsQueue(q, function(err) {
        if (err) {
            output({ err:"username or password is wrong." });
        } else {
            //redirect
            res.goPage("/profile");
        }
    });
}

function renderRegisterPage(req, res, output, user) {
    output({ });
}

exports.getRouterMap = function() {
    return [
        { url: "/login", view: "login", handle: renderLoginPage, postHandle: processLogin, needLogin:false },
        { url: "/register", view: "register", handle: renderRegisterPage, needLogin:false }
    ];
}


