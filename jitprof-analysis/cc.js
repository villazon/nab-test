const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

function _assert(cond, msg){
  if(!cond){
    console.trace(msg);
    process.exit(-1);
  }
}

var extraInfo = {};

// Use connect method to connect to the server
MongoClient.connect(url, { useNewUrlParser: true }).then(function(client) {
  //assert.equal(null, err);
  console.log("Connected successfully to server");



  var jitprofData = {};
  var prjData = {};
  var prjData2 = {};

  function getModuleName(filePath) {
    var npmIdx = filePath.lastIndexOf("node_modules/");
    if(npmIdx < 0)
      return "__app__";
    var modulePath = filePath.substring(npmIdx+("node_modules/").length);
    var end = modulePath.indexOf("/");
    var moduleName = modulePath.substring(0, end);
    return moduleName;
  }


  function getJITProfData(){
    const db = client.db("cc-dsProject-jitprof-withmodule");
    const collections = db.collection("jitprof");

    return collections.find({}).toArray().then(
      values=>{
        for(var v of values){
          if(v.TypedArray){
            if(!v.TypedArray.TypedArray){
              delete v.TypedArray; //
            }else if(v.TypedArray.NonTypedArray){
              delete v.TypedArray.NonTypedArray; 
            }
          }
          for(var a1 in v){
            var b = v[a1];
            for(var a2 in b) {
            if(b[a2] && b[a2].num) {
              //var key = a1+":"+a2;
              var key = a1
              if(!extraInfo[key]){
                extraInfo[key] = {};
                if(!extraInfo.general){
                  extraInfo.general = {};
                }
              }
              for(var file in b[a2]) {
                if(file != "num") {
                  var moduleName = getModuleName(file);
                  if(moduleName == "__app__")
                    continue;
                  if(!extraInfo[key][moduleName]) {
                    extraInfo[key][moduleName] = 0;
                  }
                  if(!extraInfo["general"][moduleName]) {
                    extraInfo["general"][moduleName] = 0;
                  }
                  extraInfo[key][moduleName] += 1//b[a2][file];
                  extraInfo["general"][moduleName] += 1//b[a2][file];
                }
              }
            }
            }
          }
          jitprofData[v._id] = v;
        }
        console.log("jitprof data fetched");
        for(var key in extraInfo){
          var sortable = [];
          for(var m in extraInfo[key]) {
            sortable.push([m, extraInfo[key][m]]);
          }

          sortable.sort(function(a,b){
            return b[1] - a[1];
          });
          console.log("[USI]", key, sortable.length, JSON.stringify(sortable.slice(0,10)));
        }
        //console.log(extraInfo);
        //console.log(jitprofData);
        return prjData;
      }
    );
  }
  function getProjects(){
    const db_ds = client.db("cc-dsProject-jitprof-withmodule");
    const projects = db_ds.collection("results");
    return projects.find({}).toArray().then(
      values=>{
        for(var v of values){
          if(!prjData[v.repo]){
            prjData[v.repo]=[];
          }
          prjData[v.repo].push(v);
        }
        console.log("project data fetched");
        //console.log(prjData);
        return prjData;
      }
    );
  }
  function getProjects2(){
    var db_ds = client.db("dsProject2");
    var projects = db_ds.collection("results");
    return projects.find({}).toArray().then(
      values=>{
        for(var v of values){
          if(!prjData2[v.repo]){
            prjData2[v.repo]=[];
          }
          prjData2[v.repo].push(v);
        }
        console.log("project data 2 fetched");
        return prjData2;
      }
    );
  }

  var p1 = getProjects();
  var p2 = getProjects2();
  var p3 = getJITProfData();


  var report = {
    totalNumOfReports: 0,
    timeOutReports: 0,
    numOfReportsExit0: 0,

    totalNumOfProjects: 0,
    totalNumOfProjectsNodeOnly: 0,

    uniquePrjNodeOnly: 0,
    uniquePrjNodeProf: 0,

    failNodeOnlyOnly: 0,
    failNodeProfOnly: 0,

    //projects whose hash changed in two runs
    hashDifferent:0,
    //hash changed and fail in node only
    hashDifferentNodeOnly: 0,
    //hash changed and fail in nodeprof
    hashDifferentNodeProf:0,
    
    totalNumOfProjectsWithReport: 0,
    timeoutProjects: 0,
    numOfProjectWithExit0: 0,
    jitprof: {
      any: 0,
      none: 0,
      AccessUndefArrayElem: 0,
      BinaryOpOnUndef: 0,
      NonContiguousArray: 0,
      PolymorphicFunCall: 0,
      SwitchArrayType: 0,
      TrackHiddenClass: 0,
      TypedArray: 0,
    },
  };

  var uniqueProjects = {};

  var anyM = {}
  var noneM = {}

  Promise.all([p1,p2,p3]).then(
    ()=>{
      for(var _id of Object.keys(jitprofData)) {
        var jitInfo = jitprofData[_id];
        if(jitInfo) {
          var prjInfos = prjData[jitInfo.reponame];
          report.totalNumOfReports++;
          if(!prjInfos){
            console.log("warning missing project info for "+JSON.stringify(jitInfo));
            continue;
          }
          _assert(prjInfos.length == 1);
          var numExit0 = 0;
          var worker = 0;
          var valid = 0;
          for(var i = 0; i < prjInfos.length; i++) {
            var prjInfo = prjInfos[i];
            if(prjInfo.exitcode == "0"){
              numExit0++;
            }
            if(prjInfo.worker == jitInfo.worker){
              worker++;
            }
            if(prjInfo.exitcode == "0" && prjInfo.worker == jitInfo.worker){
              valid++;
            }
            if(prjInfo.timedout == "true") {
              report.timeOutReports++;
            }
          }

          _assert(valid <= 1);

          if(!uniqueProjects[jitInfo.reponame]) {
            uniqueProjects[jitInfo.reponame] = {valid:0, invalid:0, data: undefined, workers:{}, timedout: false};
            report.totalNumOfProjectsWithReport++;
          }
          if(prjInfo.timedout == "true") {
            //worst guess
            uniqueProjects[jitInfo.reponame].timedout = true;
          }
          if(!uniqueProjects[jitInfo.reponame].workers[jitInfo.worker]){
            uniqueProjects[jitInfo.reponame].workers[jitInfo.worker] = 0;
          }
          var oldNum = uniqueProjects[jitInfo.reponame].workers[jitInfo.worker]++;
          if(oldNum >= 1) {
            //shall we check all processes here?
          }else {
          }
          if(valid == 0) {
            uniqueProjects[jitInfo.reponame].invalid++;
            continue;
          }else {
            _assert(numExit0 == 1);
            report.numOfReportsExit0++;
            if(uniqueProjects[jitInfo.reponame].valid == 0){
              uniqueProjects[jitInfo.reponame].data = {};
              report.numOfProjectWithExit0++;
              //console.log("USI "+jitInfo.reponame);
              report.jitprof.none++;
            }
            uniqueProjects[jitInfo.reponame].valid++;
            var merge = uniqueProjects[jitInfo.reponame].data;

            //jitprof part
            var any = false;
            for(var key in report.jitprof) {
              if(jitInfo[key]){
                any = true;
                if(!merge[key]) {
                  //if key is not counted yet
                  merge[key] = jitInfo[key];
                  report.jitprof[key]++;
                }else {
                  //in case needed, add real merge here
                }
              }
            }
            //if merge has any output
            if(!merge.any && any){
              report.jitprof.any++;
              report.jitprof.none--;
              merge.any = true;
              anyM[jitInfo.reponame] = true;
              delete noneM[jitInfo.reponame];
            }else {
              if(!anyM[jitInfo.reponame]) {
                noneM[jitInfo.reponame] = true;
              }
            }
          }
        }
      }
    }).finally(
      ()=>{client.close();
        var failedTimeouts = {};
        function atleastonesuccess(arr){
          for(var a of arr){
            if(a.exitcode == 0){
              return true;
            }
          }
          return false;
        }
        for(var key in prjData2) {
          report.totalNumOfProjectsNodeOnly++;
          if(!prjData[key]){
            report.uniquePrjNodeOnly++;
          }else {
            var hash1 = prjData[key][0].hash;
            var hash2 = prjData2[key][0].hash;
            if(atleastonesuccess(prjData[key]) && !atleastonesuccess(prjData2[key])) {
              //console.log(key+" fail only with node");
              report.failNodeOnlyOnly++;
              if(hash1 != hash2){
                report.hashDifferentNodeOnly++;
              }
            }
          }
        }
        for(var key in prjData) {
          var prjInfo = prjData[key][0];
          var prjInfo2 = prjData2[key];
          report.totalNumOfProjects++;
          if(!prjInfo2){
            report.uniquePrjNodeProf++;
          }else {
            var hash1 = prjInfo.hash;
            var hash2 = prjInfo2[0].hash;
            if(hash1 != hash2){
              report.hashDifferent++
            }
            if(atleastonesuccess(prjData2[key]) && !atleastonesuccess(prjData[key])) {
              report.failNodeProfOnly++;
              //console.log(key+" fail only with jitprof");
              if(hash1 != hash2){
                report.hashDifferentNodeProf++;
              }
            }
          }


          if(!uniqueProjects[key]){
            if(prjInfo.timedout == "true"){
              if(!failedTimeouts[key]){
                failedTimeouts[key] = true;
                report.timeoutProjects++;
              }
            }else {
              //not successful for other reasons
            }
          }
        }
        for(var key in uniqueProjects){
          var prj = uniqueProjects[key];
          if(prj.timedout) {
            report.timeoutProjects++;
          }
        }
        console.log(JSON.stringify(report, null, 2));
        //for(var key in noneM){
          //console.log("USI " + key);
        //}
      }
    );
});
