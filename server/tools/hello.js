/**
 * Created by Jay on 2016/10/24.
 */

require("./__tools");

var proc;

exports.init = function(invoker) {
    proc = invoker;
}

exports.do = function(name) {
    proc.nextTick(function () {
        proc.done(`Hello, ${name}`);
    });
}