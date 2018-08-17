/**
 * Created by Jay on 2016/5/20.
 */

const renderRoot = (req, res, output, user) => {
    var page = req.url.replace("/subpage/", "");
    output({ }, null, "subpage/" + page);
}

exports.getRouterMap = function() {
    return [
        { url: "/subpage/*", view: "*", handle: renderRoot, needLogin:false }
    ];
}


