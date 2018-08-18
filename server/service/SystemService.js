/**
 * Created by Jay on 4/1/15.
 */

exports.config = {
    name: "system",
    enabled: true,
    security: {
        //@now 获得服务器当前时间 @format 时间格式,1 - 时间戳,2 - 字符串
        "now":{ needLogin:false, checkParams:{ format:"int" } },
        //@info 查询当前注册用户数
        "info":{ needLogin:false }
    }
};

const CODES = require("weroll/ErrorCodes");

exports.now = params => {
    const { format } = params;
    if (format == 1 || format == 2) {
        let time = new Date();
        if (format == 1) {
            time = time.getTime();
        } else {
            time = time.toString();
        }
        return { time };
    } else {
        throw Error.create(CODES.REQUEST_PARAMS_INVALID, "invalid time format");
    }
}

exports.info = async () => {
    const num = await User.count({});
    return { num };
}


