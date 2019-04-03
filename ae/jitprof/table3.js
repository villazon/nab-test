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
MongoClient.connect(url, { useNewUrlParser: true }).then(function(client) {
  //assert.equal(null, err);
  console.log("Connected successfully to server");



  var jitprofData = {};
  var prjData = {};

  function getJITProfData(){
    const db = client.db("NODEPROFDB");
    const collections = db.collection("jitprof");
    return collections.find({}).toArray().then(
      values=>{
        for(var v of values){
          //remove non-typed array and show only typed ones
          if(v.TypedArray){
            if(!v.TypedArray.TypedArray){
              delete v.TypedArray; //
            }else if(v.TypedArray.NonTypedArray){
              delete v.TypedArray.NonTypedArray; 
            }
          }
          //if(Object.keys(v).length >= 4 + 7)
          //  console.log(v);
          jitprofData[v._id] = v;
        }
        // console.log("jitprof data fetched");
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
        // console.log("project data fetched");
        //console.log(prjData);
        return prjData;
      }
    );
  }

  var p1 = getProjects();
  var p2 = getJITProfData();

  let jitprof = {
      any: 0,
      none: 0,
      AccessUndefArrayElem: 0,
      BinaryOpOnUndef: 0,
      NonContiguousArray: 0,
      PolymorphicFunCall: 0,
      SwitchArrayType: 0,
      TrackHiddenClass: 0,
      TypedArray: 0,
  };

  var uniqueProjects = {};

  var anyM = {}
  var noneM = {}

  Promise.all([p1,p2]).then(
    ()=>{
      for(var _id of Object.keys(jitprofData)) {
        var jitInfo = jitprofData[_id];
        if(jitInfo) {
          var prjInfos = prjData[jitInfo.reponame];
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
              // timeout
            }
          }

          _assert(valid <= 1);

          if(!uniqueProjects[jitInfo.reponame]) {
            uniqueProjects[jitInfo.reponame] = {valid:0, invalid:0, data: undefined, workers:{}, timedout: false};
          }
          if(prjInfo.timedout == "true") {
            //worst guess
            uniqueProjects[jitInfo.reponame].timedout = true;
          }
          if(!uniqueProjects[jitInfo.reponame].workers[jitInfo.worker]){
            uniqueProjects[jitInfo.reponame].workers[jitInfo.worker] = 0;
          }
          var oldNum = uniqueProjects[jitInfo.reponame].workers[jitInfo.worker]++;
          if(valid == 0) {
            uniqueProjects[jitInfo.reponame].invalid++;
            continue;
          }else {
            _assert(numExit0 == 1);
            if(uniqueProjects[jitInfo.reponame].valid == 0){
              uniqueProjects[jitInfo.reponame].data = {};
              jitprof.none++;
            }
            uniqueProjects[jitInfo.reponame].valid++;
            var merge = uniqueProjects[jitInfo.reponame].data;

            //jitprof part
            var any = false;
            for(var key in jitprof) {
              if(jitInfo[key]){
                any = true;
                if(!merge[key]) {
                  //if key is not counted yet
                  merge[key] = jitInfo[key];
                  jitprof[key]++;
                }else {
                  //in case needed, add real merge here
                }
              }
            }
            //if merge has any output
            if(!merge.any && any){
              jitprof.any++;
              jitprof.none--;
              merge.any = true;
              anyM[jitInfo.reponame] = true;
              // console.log("any project ",jitInfo.reponame,jitInfo.hash);
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
        // console.log(JSON.stringify(jitprof, null, 2));
      }
    );
});
