/**
 * Created by Jay on 2016/3/7.
 */
var mongoose = require('weroll/model/MongoDB').getDBByName().__driver;
var Schema = mongoose.Schema;
var CODES = require("weroll/ErrorCodes");
var Utils = require('weroll/utils/Utils');
var Model = require('weroll/model/Model');

var COLLECTION_NAME = "User";

var YEAR = 365 * 24 * 60 * 60 * 1000;

module.exports = function() {
    var schema = new Schema({
        _id: String,
        username: { type:String, index:true, required:true },
        pwd: { type:String, required:true },
        phone: { type:String, index:true, optional:true },
        email: { type:String, index:true },
        nickname: { type:String, index:true, required:true },
        gender: { type:Number, default:1, required:true },
        birthday: { type:Number, optional:true },
        age: { type:Number, optional:true },
        type: { type:Number, default:100 },
        lastLoginTime: { type:Number, default:0 },
        status: { type:Number, default:1 }
    }, { collection:COLLECTION_NAME, strict: false });

    //用户数据创建前的唯一性验证
    schema.pre("save", function(next) {
        var data = this;
        data.set("createTime", Date.now());

        if (!data.get("age") && !data.get("birthday")) {
            data.set("birthday", new Date("1992-07-20 00:00:00").getTime());
        }

        if (!data.get("birthday") && data.get("age")) {
            data.set("birthday", Math.round(Date.now() - data.get("age") * YEAR));
        } else if (data.get("birthday") && !data.get("age")) {
            data.set("age", Math.floor((Date.now() - data.get("birthday")) / YEAR));
        }

        var opts = [ ];
        var phone = data.get("phone");
        if (String(phone).hasValue()) {
            opts.push({ phone:phone });
        }
        if (data.email && data.email.hasValue()) {
            opts.push({ email:data.email });
        }
        var username = data.get("username");
        if (String(username).hasValue()) {
            opts.push({ username:username });
        }
        //1. 创建一个查询语句
        var query = schema.$ModelClass.findOne({ $or:opts });
        //2. 设定查询过滤的字段, 多个字段用空格分开
        query.select("phone email username");
        //3. 执行查询
        query.exec(function (err, obj) {
            if (err) {
                next(Error.create(CODES.DB_ERROR, err.toString()));
            } else {
                if (obj) {
                    //如果不存在, 则说明数据库没有存在相同属性的数据, 允许创建
                    next(Error.create(CODES.DATA_EXISTED, "User exists."));
                } else {
                    var q = [];
                    //generate uuid
                    q.push(function(cb) {
                        var CN = COLLECTION_NAME;
                        var params = data.get("params");
                        if (params && params.npc == 1) {
                            CN = "SystemNPC" + COLLECTION_NAME;
                            data.set("type", 999);
                        }
                        Model.generateIncrementalID(CN, function(id, err) {
                            if (err) {
                                cb(Error.create(CODES.REDIS_ERROR, err.toString()));
                                return;
                            }
                            data._id = (params && params.npc == 1 ? "sysnpc@" : "") + id;
                            cb();
                        });
                    });
                    //Create dependent data
                    q.push(function(cb) {
                        Friend.register(data._id, cb);
                    });
                    q.push(function(cb) {
                        Wealth.register(data._id, cb);
                    });
                    /*
                    q.push(function(cb) {
                        Timeline.register(data._id, cb);
                    });
                    q.push(function(cb) {
                        Footprint.register(data._id, cb);
                    });
                    */
                    runAsQueue(q, function(err) {
                        if (err) {
                            next(err.code ? err : Error.create(CODES.DB_ERROR, err.toString()));
                        } else {
                            next();
                        }
                    });
                }
            }
        });
        /*
         * 上述的查询代码可写成：
         * xxx.findOne({ 查询条件 }, "field1 field2 field3 ...", function(err, obj) { ... })
         * */
    });

    schema.static("getSimpleInfo", function(uid, callBack, opts) {
        var ins = this;
        if (!opts || !opts.noCache) {
            ins.getSimpleInfoCache(uid, function(err, cache) {
                if (cache) {
                    //console.log("get user simple info from cache...");
                    callBack(null, cache);
                } else {
                    opts = opts || {};
                    opts.noCache = true;
                    ins.getSimpleInfo(uid, callBack, opts);
                }
            });
            return;
        }

        ins.getByID(uid, "_id nickname gender head level title", function(err, user) {
            if (err) {
                callBack(err);
            } else {
                if (user) {
                    //console.log("get user simple info from db...");
                    var info = ins.cacheSimpleInfo(uid, user);
                    callBack(null, info);
                } else {
                    callBack(Error.create(CODES.DATA_NOT_EXISTED, "no such User"));
                }
            }
        });
    });

    schema.static("getSimpleInfoCache", function(id, callBack) {
        Model.cacheRead([ "@common->user_simple_info", id ], function(cache) {
            if (cache) {
                //console.log("get user simple info from redis...");
                callBack(null, cache);
            } else {
                Model.cacheRead([ "user_simple_info_static", id ], function(cache, err) {
                    //console.log("get user simple info from static file system...");
                    callBack(err, cache);
                });
            }
        });
    });

    schema.static("cacheSimpleInfo", function(uid, doc) {
        if (!doc) {
            //console.log("user simple info cache removed...");
            Model.cacheRemove([ "user_simple_info", uid ], null, 2);
            //remove cache from static file cache system
            Model.cacheRemove([ "user_simple_info_static", uid ], null, 3);
            return;
        }

        if (doc instanceof mongoose.Model) doc = doc.toObject();

        var info = {
            id: uid,
            nickname: SystemNPC.isNPC(uid) ? "J" : doc.nickname,
            gender: doc.gender,
            head: doc.head || "",
            level: doc.level,
            title: doc.title
        };
        Model.cacheSave([ "user_simple_info", uid ], info);
        Model.cacheSave([ "user_simple_info_static", uid ], info);
        return info;
    });

    schema.static("login", function(passport, cb) {
        var opts;
        if (passport._id && passport._id.hasValue()) {
            opts = { _id : passport._id };

        //} else if (passport.username && passport.username.hasValue()) {
        //    opts = { username : passport.username };
        //} else if (passport.email && passport.email.hasValue()) {
        //    opts = { email : passport.email };
        } else if (passport.phone && passport.phone.hasValue()) {
            opts = { phone : passport.phone };
        }
        if (!opts || (!passport.pwd && !passport.hashPWD)) {
            cb(Error.create(CODES.DATA_NOT_EXISTED, "no such User"));
            return;
        }
        if (passport.pwd) {
            opts.pwd = Utils.md5(passport.pwd);
        } else {
            opts.pwd = passport.hashPWD;
        }
        var ins = this;
        ins.findOne(opts).exec(function(err, obj) {
            if (obj){
                //用户存在
                ins.cacheSimpleInfo(obj._id, obj);
                cb(null, obj);
            } else {
                //用户不存在, 登录失败
                cb(err ? Error.create(CODES.DB_ERROR, err.toString()) : Error.create(CODES.DATA_NOT_EXISTED, "no such User"));
            }
        });
    });

    return { name:COLLECTION_NAME, ref:schema };
}