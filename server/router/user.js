/**
 * Created by Jay on 2016/5/20.
 */

var Setting = global.SETTING;
var Session = require("weroll/model/Session");

function renderLoginPage(req, res, output, user) {
    output({ });
}

function processLogin(req, res, output, user) {
    var userData = { _id:"1001", username:"jay", pwd:"123456", type:2 };

    var username = req.body.username;
    var pwd = req.body.pwd;
    if (username == userData.username && pwd == userData.pwd) {
        //save session
        Session.getSharedInstance().save(userData, function(err, sess) {
            if (err) return output(null, err);
            if (sess) {
                //set cookies
                var option = { path: Setting.session.cookiePath, expires: new Date(Date.now() + Setting.session.cookieExpireTime) };
                res.cookie("userid", sess.userid, option);
                res.cookie("token", sess.token, option);
                res.cookie("tokentimestamp", sess.tokentimestamp, option);
            }
            //redirect
            res.goPage("/profile");
        });
    } else {
        output({ err:"username or password is wrong." });
    }
}

function renderProfilePage(req, res, output, user) {
    output({ });
}

exports.getRouterMap = function() {
    return [
        { url: "/login", view: "login", handle: renderLoginPage, postHandle: processLogin, needLogin:false },
        { url: "/profile", view: "profile", handle: renderProfilePage, needLogin:true, allow:[ [ "type", [1,2] ] ] }
    ];
}


