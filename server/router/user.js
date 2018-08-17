/**
 * Created by Jay on 2016/5/20.
 */

const Setting = global.SETTING;
const Session = require("weroll/model/Session");
const Utils = require("weroll/utils/Utils");
const CODES = require("weroll/ErrorCodes");

const renderLoginPage = async () => {
    return { };
}

const processLogin = async (req, res) => {
    let passport = { pwd:req.body.pwd };
    let account = req.body.account;
    if (Utils.checkEmailFormat(account)) {
        passport.email = account;
    } else if (Utils.cnCellPhoneCheck(account)) {
        passport.phone = account;
    } else {
        passport.username = account;
    }
    try {
        let user = await User.login(passport);

        user = user.toObject();
        user.extra = [ user.username, user.nickname, user.email || "", user.phone || "" ];
        let auth = await Session.getSharedInstance().save(user);

        //set cookies
        let option = { path: Setting.session.cookiePath, expires: new Date(Date.now() + Setting.session.cookieExpireTime) };
        res.cookie("authorization", auth, option);
    } catch (exp) {
        return { err:"username or password is wrong." };
    }

    //redirect
    res.goPage("/index");
}

const renderRegisterPage = async () => {
    return { };
}

const processRegister = async (req, res) => {
    let doc = new User();

    try {
        let username = req.body.username;
        doc.set("username", username);

        let nickname = req.body.nickname;
        if (!String(nickname).hasValue()) throw (Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid nickname"));
        else doc.set("nickname", nickname);

        let pwd = req.body.pwd;
        if (!pwd || pwd.length < 6) throw (Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid password. the length of password should be >= 6."));
        else doc.set("pwd", pwd);

        let email = req.body.email;
        if (phone && !Utils.checkEmailFormat(email)) throw (Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid email"));
        else doc.set("email", email);

        let phone = req.body.phone;
        if (phone && !Utils.cnCellPhoneCheck(phone)) throw (Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid phone"));
        else doc.set("phone", phone);

        doc = await doc.save();
    } catch (err) {
        return { err:err };
    }
    try {
        let temp = doc.toObject();
        temp.extra = [ username, nickname, email || "", phone || "" ];
        let auth = await Session.getSharedInstance().save(temp);
        //set cookies
        let option = { path: Setting.session.cookiePath, expires: new Date(Date.now() + Setting.session.cookieExpireTime) };
        res.cookie("authorization", auth, option);
    } catch (exp) {
        console.error(exp);
    }

    //redirect
    res.goPage("/index");
}

const processLogout = async (req, res, output, user) => {
    //clear cookie
    let option = { path: Setting.session.cookiePath };
    res.clearCookie("authorization", option);

    //clear session
    Session.getSharedInstance().remove(user);

    //redirect
    res.goPage("/login");
}

exports.getRouterMap = function() {
    return [
        { url: "/login", view: "login", handle: renderLoginPage, postHandle: processLogin, needLogin:false },
        { url: "/logout", view: "logout", handle: processLogout, needLogin:true },
        { url: "/register", view: "register", handle: renderRegisterPage, postHandle: processRegister, needLogin:false }
    ];
}


