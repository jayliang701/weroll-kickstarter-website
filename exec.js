/**
 * Created by Jay on 14-8-16.
 */
var FS = require("fs");
var PATH = require("path");

var proc = {};
proc.done = function(msg) {
    if (Setting.model.db && Setting.model.db.name) {
        Model.closeDB(Setting.model.db.name, function(err) {
            if (msg) {
                console.log(msg);
            } else {
                console.log('script is completed.');
            }
            setTimeout(process.exit, 500);

        });
    } else {
        setTimeout(process.exit, 500);
    }
}

var App = require("weroll/App");
var app = new App();
var Setting = global.SETTING;
var Model = require("weroll/model/Model");

app.addTask(function(cb) {
    Model.init(Setting.model, function(err) {
        cb(err);
    });
});
app.run(function(err) {
    if (err) {
        console.error(err);
        process.exit();
        return;
    }
    console.log("run script on *" + global.VARS.env + "* env.");
    var args = [];
    for (var i = 2; i < process.argv.length; i++) {
        if (process.argv[i].charAt(0) != "-") {
            args = process.argv.splice(i);
            break;
        }
    }
    var JS = require(PATH.join(global.APP_ROOT, "server/tools/" + args[0] + ".js"));
    JS.init(proc);

    args = args.splice(1);
    JS.do.apply(JS, args);
});