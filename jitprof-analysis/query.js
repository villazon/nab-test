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

  const db = client.db("NODEPROFDB");

  const collections = db.collection("jitprof");
  const db_ds = client.db("dsProject");
  const projects = db_ds.collection("results");


  var jitprofData = {};
  var prjData = {};

  function getJITProfData(){
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

  var p1 = getProjects();
  var p2 = getJITProfData();


  var report = {
    totalNumOfReports: 0,
    timeOutReports: 0,
    numOfReportsExit0: 0,
    totalNumOfProjects: 0,
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

  Promise.all([p1,p2]).then(
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
            report.totalNumOfProjects++;
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
      for(var key in uniqueProjects){
        var prj = uniqueProjects[key];
        if(prj.timedout) {
          report.timeoutProjects++;
        }
      }
    }).finally(
      ()=>{client.close();
        console.log(JSON.stringify(report, null, 2));
      }
    );
});
