/**
 * Created by Jay on 2016/5/20.
 */

var Setting = global.SETTING;
var Session = require("weroll/model/Session");
var Utils = require("weroll/utils/Utils");
var CODES = require("weroll/ErrorCodes");

async function renderLoginPage(req, res, output, user) {
    output({ });
}

async function processLogin(req, res, output) {
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
            res.goPage("/index");
        }
    });
}

async function renderRegisterPage(req, res, output, user) {
    output({ });
}

async function processRegister(req, res, output) {
    var doc = new User();

    try {
        var username = req.body.username;
        doc.set("username", username);

        var pwd = req.body.pwd;
        if (!pwd || pwd.length < 6) throw (Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid password. the length of password should be >= 6."));
        else doc.set("pwd", pwd);

        var email = req.body.email;
        if (phone && !Utils.checkEmailFormat(email)) throw (Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid email"));
        else doc.set("email", email);

        var phone = req.body.phone;
        if (phone && !Utils.cnCellPhoneCheck(phone)) throw (Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid phone"));
        else doc.set("phone", phone);

        doc = await doc.save();
    } catch (err) {
        return output({ err:err });
    }
    try {
        var sess = await Session.getSharedInstance().save(doc.toObject());
        //set cookies
        var option = { path: Setting.session.cookiePath, expires: new Date(Date.now() + Setting.session.cookieExpireTime) };
        res.cookie("userid", sess.userid, option);
        res.cookie("token", sess.token, option);
        res.cookie("tokentimestamp", sess.tokentimestamp, option);
    } catch (exp) {
        console.error(exp);
    }

    //redirect
    res.goPage("/index");
}

exports.getRouterMap = function() {
    return [
        { url: "/login", view: "login", handle: renderLoginPage, postHandle: processLogin, needLogin:false },
        { url: "/register", view: "register", handle: renderRegisterPage, postHandle: processRegister, needLogin:false }
    ];
}


