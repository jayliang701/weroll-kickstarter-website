var Setting = global.SETTING;
var Utils = require("weroll/utils/Utils");

function renderIndexPage(req, res, output, user) {
    output({ msg:"hello!" });
}

exports.getRouterMap = function() {
    return [
        { url: "/", view: "index", handle: renderIndexPage, needLogin:false },
        { url: "/index", view: "index", handle: renderIndexPage, needLogin:false }
    ];
}
