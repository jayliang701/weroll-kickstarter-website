X/**
 * Created by Jay on 2016/9/14.
 */
var Utils = require("magicfish_web/utils/Utils");
var request = require("magicfish_web/node_modules/min-request");

var callAPI = function(target, method, params) {
    var URL = (target.indexOf("http") == 0) ? target : global.SETTING.ecosystem.servers[target].api;
    var postData = {};
    if (params) {
        postData = params;
    }

    var sess = arguments.length > 3 ? arguments[3] : null;
    if (!sess || typeof sess == "function") sess = null;
    var callBack = arguments[3];
    if (typeof callBack != "function") callBack = arguments[4];

    var startTime = Date.now();
    request(URL,
        {
            headers: {
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: { method:method, data:postData, auth:sess }
        },
        function(err, res, body) {
            var costTime = Date.now() - startTime;
            //console.log('cost time: ' + costTime + 'ms');
            if (err) {
                if (callBack) callBack(err);
            } else {
                if (typeof body == "string") {
                    try {
                        body = JSON.parse(body);
                    } catch (exp) {
                        err = exp;
                        body = null;
                    }
                }

                if (!err && body.code > 1) {
                    //error response
                    err = Error.create(body.code, body.msg);
                    body = null;
                } else {
                    body = body ? body.data : null;
                }

                if (callBack) callBack(err, body);
            }
        });
}

function findUsers(page, filter) {
    var opt = typeof arguments[2] != "function" ? arguments[2] : {};
    opt = opt || {};

    var callBack = typeof arguments[2] == "function" ? arguments[2] : arguments[3];
    if (typeof callBack != "function") callBack = null;

    $callAPI("core", "user.search", { filter:filter, fields:opt.fields || "_id", pagination:{ index:page, num:opt.pageSize || 1000 }, sort:{ createTime:1 } }, function(err, result) {
        if (err) {
            callBack(err);
        } else {
            callBack(null, (result ? result.list : []) || []);
        }
    });
}

global.__defineGetter__('$callAPI', function() {
    return callAPI;
});

global.__defineGetter__('$findUsers', function() {
    return findUsers;
});