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
        console.log(jitprofData);
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
        console.log(prjData);
        return prjData;
      }
    );
  }

  var p1 = getProjects();
  var p2 = getJITProfData();


  var report = {
    all: 0,
    useful: 0,
    unique: 0,
    numPrj: {0:0},
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
          report.all++;
          if(!prjInfos){
            console.log("warning missing project info for "+JSON.stringify(jitInfo));
            report.numPrj[0]++;
            continue;
          }
          if(!report.numPrj[prjInfos.length]){
            report.numPrj[prjInfos.length] = 0;
          }
          report.numPrj[prjInfos.length]++;
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
          }

          _assert(valid <= 1);

          if(valid == 0) {
            continue;
          }else {
            _assert(numExit0 == 1);
            report.useful++;
            if(!uniqueProjects[jitInfo.reponame]) {
              uniqueProjects[jitInfo.reponame] = jitInfo;
              report.unique++;
            }

            //jitprof part
            var any = false;
            for(var key in report.jitprof) {
              if(jitInfo[key]){
                any = true;
                report.jitprof[key]++;
              }
            }
            if(any){
              report.jitprof.any++;
            }else {
              report.jitprof.none++;
            }
          }
        }
      }
    }).finally(
      ()=>{client.close();
        console.log(JSON.stringify(report, null, 2));
      }
    );
});
