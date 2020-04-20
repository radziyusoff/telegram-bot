var bodyParser = require('body-parser');
var mysql = require('mysql');

// connection configurations
// var db = mysql.createPool({
//     host: 'localhost',
//     user: 'napmtas',
//     password: 'napmtas123',
//     database: 'napmtas'
// });
var db = mysql.createPool({
    host: 'localhost',
    port: "33066",
    user: 'daniadsm',
    password: 'Pswd2018',
    database: 'daniadsm'
});

var Model={

    getRadiusLatest:function(login_id){
        return new Promise( ( resolve, reject ) => {
            db.query( "SELECT * FROM daniadsm.radius_session_latest_v2_p where login_id=?", login_id, ( err, rows ) => {
                if ( err ){
                    console.log(err)
                    return reject( err );
                }
                resolve( rows );
            } );
        } );
    },

    getAll:function(callback){
        // return db.query("select PERIOD,time(start) start,time(end) end from period_t",callback);
        return db.query("select PERIOD,START_TIME,END_TIME from period_t",callback);
    },

    get:function(period,callback){
        console.log("period:",period);
        // return db.query("select PERIOD,DATE_FORMAT(start,'%H:%i') start,DATE_FORMAT(end,'%H:%i') end from period_t where CATEGORY=? order by start asc",[period.CATEGORY],callback);
        return db.query("select PERIOD,START_TIME,END_TIME from period_t where CATEGORY=? order by START_TIME asc",[period.CATEGORY],callback);
    },

    getCurrent:function(period,callback){
        console.log("period getCurrent()")
        if(period.CATEGORY){
            return db.query("select PERIOD,DATE_FORMAT(start,'%H:%i') start,DATE_FORMAT(end,'%H:%i') end "+
            "from period_t where CATEGORY=? AND "+
            "now() between STR_TO_DATE(CONCAT(DATE_FORMAT(now(),'%c/%e/%Y'),' ',DATE_FORMAT(start,'%H:%i')),'%c/%e/%Y %H:%i') and STR_TO_DATE(CONCAT(DATE_FORMAT(now(),'%c/%e/%Y'),' ',DATE_FORMAT(end,'%H:%i')),'%c/%e/%Y %H:%i') "+
            "OR now() <= STR_TO_DATE(CONCAT(DATE_FORMAT(now(),'%c/%e/%Y'),' ',DATE_FORMAT(start,'%H:%i')),'%c/%e/%Y %H:%i') "+
            "order by start asc",[period.CATEGORY],callback);
        }
        return db.query("select PERIOD,DATE_FORMAT(start,'%H:%i') start,DATE_FORMAT(end,'%H:%i') end from period_t where PERIOD=?",[period.PERIOD],callback);
    },

    add:function(period,callback){
        if(Array.isArray(period)){
            var values="";
            for (let item of period) {
                values += "('"+item.PERIOD+"','"+item.START_TIME+"','"+item.END_TIME+"','"+item.CATEGORY+"'),"
            }
            values = values.slice(0, -1);
            return db.query("INSERT ignore INTO period_t (PERIOD,START_TIME,END_TIME,CATEGORY) VALUES "+values, callback);     
        }
        return db.query("insert into period_t (PERIOD,START_TIME,END_TIME) values (?)",[period.PERIOD,period.START,period.END],callback);
    },

    delete:function(period,callback){
            return db.query("delete from period_t where PERIOD=?",[period.PERIOD],callback);
    },
    
    update:function(period,callback){
        return db.query("update period_t set PERIOD=? where PERIOD=?",period.LEVEL,[period.PERIOD],callback);
    }
 
};
module.exports=Model;