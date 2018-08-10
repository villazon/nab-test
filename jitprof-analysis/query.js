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

// Use connect method to connect to the server
MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to server");



  var jitprofData = {};
  var prjData = {};
  var prjData2 = {};

  function getJITProfData(){
    const db = client.db("NODEPROFDB");
    const collections = db.collection("jitprof");
    return collections.find({}).toArray().then(
      values=>{
        for(var v of values){
          jitprofData[v._id] = v;
        }
        console.log("jitprof data fetched");
        //console.log(jitprofData);
        return prjData;
      }
    );
  }
  function getProjects(){
    const db_ds = client.db("dsProject");
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
    }
  };

  var uniqueProjects = {};

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
            }
          }
        }
      }
    }).finally(
      ()=>{client.close();
        var failedTimeouts = {};
        for(var key in prjData2) {
          report.totalNumOfProjectsNodeOnly++;
          if(!prjData[key]){
            report.uniquePrjNodeOnly++;
          }else {
            var info1 = prjData2[key][0];
            var info2 = prjData[key][0];
            if(info1.exitcode != 0 && info2.exitcode == 0){
              report.failNodeOnlyOnly++;
            }
          }
        }
        for(var key in prjData) {
          var prjInfo = prjData[key][0];
          var prjInfo2 = prjData2[key];
          report.totalNumOfProjects++;
          if(!prjInfo2){
            console.log("project "+key+" does not run in node only mode");
            report.uniquePrjNodeProf++;
          }else if(prjInfo2[0].exitcode != prjInfo.exitcode){
            //console.log("project "+key+" exit differently "+prjInfo2[0].exitcode+" != "+prjInfo.exitcode);
            //_assert(typeof prjInfo2[0].exitcode == 'number', JSON.stringify(prjInfo2[0]));
            if(prjInfo2[0].exitcode == 0) {
              console.log("failure only in nodeprof "+key+prjInfo.exitcode);
              report.failNodeProfOnly++;
            }
          }else {
            //console.log("project "+key+" exit the same "+prjInfo2[0].exitcode+" == "+prjInfo.exitcode);
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
      }
    );
});
