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
  // console.log("Connected successfully to server");



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
          var usedModules = {general: {}};
          //if(Object.keys(v).length >= 7) {
          //  console.log(v);
          //}
          for(var a1 in v){
            var key = a1
            var b = v[a1];
            for(var a2 in b) {
            if(b[a2] && b[a2].num) {
              //var key = a1+":"+a2;
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
                  if(!usedModules[key]){
                    usedModules[key] = {};
                  }
                  usedModules[key][moduleName] = true;
                  usedModules["general"][moduleName] = true;
                  if(!extraInfo[key][moduleName]) {
                    extraInfo[key][moduleName] = {prj: 0, occ: 0};
                  }
                  if(!extraInfo["general"][moduleName]) {
                    extraInfo["general"][moduleName] = {prj: 0, occ: 0};
                  }
                  extraInfo[key][moduleName].occ += b[a2][file];
                  extraInfo["general"][moduleName].occ += b[a2][file];
                }
              }
            }
            }
          }
          for(var k in usedModules){
            var ms = Object.keys(usedModules[k]);
            for(var m of ms){
              extraInfo[k][m].prj++;
            }
          }
          jitprofData[v._id] = v;
        }

        var entries = {AccessUndefArrayElem: "AccessUndefArrayElem", BinaryOpOnUndef: "BinaryOpOnUndef", InconsistentObjectLayout: "InconsistentObjectLayout", NonContiguousArray: "NonContiguousArray", PolymorphicOperation: "PolymorphicFunCall", SwitchArrayType: "SwitchArrayType", TypedArray: "TypedArray", general: "general"}
        console.log("\\begin{tabular}{l|c|c|c|c}\n" + 
                        "\\multicolumn{1}{c|}{\\textbf{JIT-unfriendly Pattern}} & \\multicolumn{1}{c|}{\\textbf{\\# Modules}} & \\multicolumn{3}{c}{\\textbf{Top 3 NPM Modules}} \\\\ \\bottomrule");
        var listtimes = {};
        for(var e in entries){
          var key = entries[e];
          var sortable = [];
          for(var m in extraInfo[key]) {
            sortable.push([m, extraInfo[key][m].prj, extraInfo[key][m].occ]);
          }

          sortable.sort(function(a,b){
            return b[1] - a[1];
          });
          // console.log("[USI]", key, sortable.length, JSON.stringify(sortable.slice(0,5)));
          var sliced = sortable.slice(0,5);
          if(e == "general")
            continue;
          for(var a of sliced){
            if(!listtimes[a[0]]){
              listtimes[a[0]] = 0;
            }
            listtimes[a[0]]++;
          }
        }
        // console.log(listtimes);
        for(var e in entries){
          var key = entries[e];
          var sortable = [];
          for(var m in extraInfo[key]) {
            sortable.push([m, extraInfo[key][m].prj, extraInfo[key][m].occ]);
          }

          sortable.sort(function(a,b){
            return b[1] - a[1];
          });
          var sliced = sortable.slice(0,3);
          //to latex
          var ldata = ""
          for(var elem of sliced){
            ldata += " & ";
            //if(false && listtimes[elem[0]] > 1)
            if(false && e == "general")
              ldata += "\\textbf{"
            let datatoshow = elem[1] //+" / "+elem[2]
            if(e == "general") {
              datatoshow = "\\textbf{"+datatoshow+"}";
              elem[0] = "\\textbf{"+elem[0]+"}"
            }
            ldata += "\\begin{tabular}[c]{@{}c@{}}{\\sl "+elem[0]+"}\\\\("+datatoshow+")\\end{tabular}";
            //if(false && listtimes[elem[0]] > 1)
            if(false && e == "general")
              ldata += "}";
          }
          let sumstr = sortable.length;
          if(e == "general") {
            console.log("\\hline");
            e = "\\textbf{At least one}";
            sumstr = "\\textbf{"+sumstr+"}"
          }else {
            ldata += " \\\\\\hdashline[0.5pt/1pt]"
            sumstr = "\\numprint{"+sumstr+"}"
          }
          
          console.log("\\code{"+e+"}", "&", sumstr, ldata);
        }
        //console.log(extraInfo);
        //console.log(jitprofData);
        console.log("\\end{tabular} \\label{table:top5}");
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
        // console.log("project data fetched");
        // console.log(prjData);
        return prjData;
      }
    );
  }

  var p1 = getProjects();
  var p3 = getJITProfData();


  var report = {
    jitprof: {
      any: 0,
      none: 0,
      AccessUndefArrayElem: 0,
      BinaryOpOnUndef: 0,
      InconsistentObjectLayout: 0,
      NonContiguousArray: 0,
      PolymorphicFunCall: 0,
      SwitchArrayType: 0,
      TypedArray: 0,
    },
  };

  var uniqueProjects = {};

  var anyM = {}
  var noneM = {}

  Promise.all([p1,p3]).then(
    ()=>{
      for(var _id of Object.keys(jitprofData)) {
        var jitInfo = jitprofData[_id];
        if(jitInfo) {
          var prjInfos = prjData[jitInfo.reponame];
          if(!prjInfos){
            // console.log("warning missing project info for "+JSON.stringify(jitInfo));
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
          if(oldNum >= 1) {
            //shall we check all processes here?
          }else {
          }
          if(valid == 0) {
            uniqueProjects[jitInfo.reponame].invalid++;
            continue;
          }else {
            _assert(numExit0 == 1);
            if(uniqueProjects[jitInfo.reponame].valid == 0){
              uniqueProjects[jitInfo.reponame].data = {};
              //console.log("USI "+jitInfo.reponame);
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
              // console.log("any project", jitInfo.reponame, jitInfo.hash);
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
        for(var key in uniqueProjects){
          var prj = uniqueProjects[key];
          if(prj.timedout) {
            report.timeoutProjects++;
          }
        }
        //console.log(JSON.stringify(report, null, 2));
        //for(var key in noneM){
          //console.log("USI " + key);
        //}
      }
    );
});
