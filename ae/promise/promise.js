const tag = "[i]";

const _tag = "[USI]";

function _assert(cond, msg){
  if(!cond) {
    console.trace("assertion failure "+msg);
    throw -1;
  }
}

let removeTrival= false;

function Node (id, tick, name, type, loc) {
  this.id = id; // a unique id
  this.name = name; // name of the node to be shown as a text element near the node
  this.type = type; // corresponds a type, can be used to show different shapes
  this.loc = loc; // source code location
  this.tick = tick; // the event loop tick this nodes belongs to
  this.removed = false;
  this.outEdges = {}; // a map of edges starting from this node
  this.inEdges = {}; // a map of edges ending in this node
  this.hidden = false;
  this.dom = {
    node: undefined,
    warning: undefined,
    text: undefined
  }

  this._foreachEdge = function(edgeMap, cb) {
    for(var key in edgeMap) {
      var edgeArr = edgeMap[key];
      for(var edge of edgeArr) {
        if(this.tick.graph.nodes[key].removed)
          continue;
        if(cb(edge, key))
          return;
      }
    }
  }
  // this.hide = function(){
  //   this.hidden = true;
  //   for(var key in this.dom) {
  //     if(this.dom[key]) {
  //       this.dom[key].attr("visibility", "hidden");
  //     }
  //   }
  //   this.foreachInEdge(function(edge, end){
  //     edge.hide();
  //   })
  //   this.foreachOutEdge(function(edge, end){
  //     edge.hide();
  //   })
  // }
  this.addOutEdge = function (edge) {
    var to = edge.to;
    if(!this.outEdges[to.id]){
      this.outEdges[to.id] = [];
    }
    this.outEdges[to.id].push(edge);
  }
  this.addInEdge = function (edge) {
    var from = edge.from;
    if(!this.inEdges[from.id]){
      this.inEdges[from.id] = [];
    }
    this.inEdges[from.id].push(edge);
  }
  this.foreachInEdge = function(cb) {
    return this._foreachEdge(this.inEdges, cb);
  }
  this.foreachOutEdge = function(cb) {
    return this._foreachEdge(this.outEdges, cb);
  }
}


function Edge(id, from, to, clazz, label) {
  this.id = id;
  this.from = from; // the node where the edge starts
  this.to = to; // the node where the edge ends
  this.from.addOutEdge(this);
  this.to.addInEdge(this);
  this.clazz = clazz; // style class it has
  this.label = label;
  this.hidden = false;
  _assert(this.from);
  _assert(this.to);

  this.dom = {
    path: undefined,
    text: undefined,
  }

  this.hide = function(){
    this.hidden = true;
    for(var key in this.dom) {
      if(this.dom[key]){
        this.dom[key].attr("visibility", "hidden");
      }
    }
  }
}

function Tick(graph, id, name, label) {
  this.graph = graph;
  this.id = id; // a unique ID for the tick
  this.name = name; // name of the tick
  this.label = label; // label to be shown after click
  this.nodes = {}; // nodes belonging to this tick
  this.lastNode = undefined;
  this.addNode = function(id, name, type, loc) {
    //warning because of duplicate nodes
    if(this.nodes[id]) {
      return;
    }
    var node = new Node(id, this, name, type, loc);
    this.nodes[id] = node;
    this.graph.nodes[id] = node;
    plotFuncs.onAddNode(this, node);
    this.lastNode = node;
    return node;
  }
}

function Graph () {
  this.ticks = [];
  this.nodes = {};
  this.edges = {};
  this.addTick = function (id, name, label) {
    var newTick = new Tick(this, id, name, label);
    this.ticks.push(newTick);

    // plotFuncs.onAddTick(newTick, id, name, label);

    return newTick;
  }
  this.addEdge = function (id, fromId, toId, clazz, label) {
    var edge = new Edge(id, this.nodes[fromId], this.nodes[toId], clazz, label);
    plotFuncs.onAddEdge(edge);
    return this.edges[id] = edge;
  }
}

var plotFuncs = {
  onAddNode: function(tick, node){

  },
  onAddEdge: function(edge){

  }
}


var moduleReport = {
  numAppPromise: 0,
  numNPMPromise: 0,
  numAnyPromise: 0,
  numModulePromise: {
    ____: 0
  },
}

function parseLog(log) {
  let graph = new Graph();
  // log = log.split(_tag).join(tag);
  var lines = log.split("\n");
  var type, splitted;
  var edgeCnt = 0;

  var lastTick = graph.addTick(0, "main");
  if(false)
    console.log("L 0");

  lines.forEach(line => {
    if(!line.startsWith('[USI'))
      return;
    var h = line.split(']')[0];
    line = line.substring(h.length+2);

    // console.log(line);
      // if(line.indexOf(",") > tag.length+5) {
        // console.log(line);
        // line = tag + " " + line.substring(line.indexOf(",")-1);
      // }

    type = line[0]

    splitted = line.substring(2).split(',')
    switch(type){
      case 'N':
        var [id, type, name, loc] = splitted;
        // decide the level
        if(false && type == "P" && loc.indexOf("/app/analyzer/FakeJavaHome/jre/languages/js/npm") >=0){
          // internal promise of npm
          break;
        }
        // if(true && type == "P" && loc.indexOf("node_modules/npm") >=0){
        //   // npm related
        //   break;
        // }
        // if(true && type == "P" && loc.indexOf("node_modules/jest") >=0){
        //   // npm related
        //   break;
        // }
        if(false && type == "P" && loc.indexOf("node_modules") >=0)
          break;


        var node = lastTick.addNode(id, name, type, loc);
        if(node) {
          node.raw = line;
        } else {
          node = graph.nodes[id];
          if(node.type == type && node.name == name && parseInt(loc) > 0){
            //the promise bug
          }else if(node.type == type && node.name == name && node.loc == loc) {
            //duplicate
          }else
            throw("node id duplicates "+line+" => "+graph.nodes[id].raw);
          //console.trace("node id duplicates "+line+" => "+graph.nodes[id].raw);
        }
        break;
      default:
        break;
        // console.error("warning unknown log entry type "+type);
    }

  });
  lines.forEach(line => {
    if(!line.startsWith('[USI'))
      return;
    var h = line.split(']')[0];
    line = line.substring(h.length+2);
      // if(line.indexOf(",") > tag.length+5) {
        // console.log(line);
        // line = tag + " " + line.substring(line.indexOf(",")-1);
      // }

    type = line[0]

    splitted = line.substring(2).split(',')
    switch(type){
      case 'E':
        var [type, from, to, label] = splitted;
        if(graph.nodes[from] && graph.nodes[to]) {
          _assert(graph.nodes[from], "node "+from+" doesnot exsit! "+line);
          _assert(graph.nodes[to], "node "+to+" doesnot exsit! "+line);
          if(label == "creates" && graph.nodes[to].type == "P") {
            if(graph.nodes[from].name != "Promise" && graph.nodes[from].name != "Promise.catch" && !graph.nodes[from].name.startsWith("Promise.then")){
              throw("wrong creates "+graph.nodes[from].name+" "+graph.nodes[from].type+" "+line);
            }
          }
          var edge = graph.addEdge(edgeCnt++, from, to, type, label);
          edge.raw = line;
        }
        break;
    }

  });

  var printedNodes = {};
  var printedEdges = {};

  var report = {
    numBreakdown: [0, 0, 0],
    numPromiseConstructor: 0,
    numThen: 0,
    numCatch: 0,
    numAll: 0,
    numRace: 0,
    numAsync: 0,
    numOthers: 0, //promise.resolve/reject, async
    numLinks: 0,
    numChains: 0,
    numAwaits: 0,
    deadPromise: 0,
    missingRejection: 0,
    moduleDistribution: {},
    missingRejections: {},
    chainSizes: [],
  }

  // remove some promise nodes
  for(var key in graph.nodes) {
    var node = graph.nodes[key];
    if(node.type == "P") {
      //remove solo promise nodes
      if(Object.keys(node.outEdges).length == 0 && Object.keys(node.inEdges).length == 0){
        // delete graph.nodes[node.id];
        node.removed = true;
        continue;
      }

      let moduleName;
      if(node.loc) {
        var loc = node.loc;

        var hasPromiseNeighbor = false;
        function test(edge, end){
          if(graph.nodes[end].type == 'P') {
            hasPromiseNeighbor = true;
          }
          return hasPromiseNeighbor;
        }
        node.foreachInEdge(test);

        node.foreachOutEdge(test);

        // shall we remove promise chain of size 1
        if(removeTrival && !hasPromiseNeighbor) {
          // delete graph.nodes[node.id];
          node.removed = true;
          continue;
        }


        if(loc.indexOf("/app/analyzer/FakeJavaHome/jre/languages/js/npm")>=0 || loc.indexOf("node_modules/npm")>=0){
          moduleName = "npm";
          report.numBreakdown[2]++;
          // delete graph.nodes[node.id];
          node.removed = true;
        }else if(loc.indexOf("node_modules/")>=0){
          var fileName = loc.substring(loc.lastIndexOf("node_modules/")+"node_modules/".length);
          moduleName = fileName.substring(0, fileName.indexOf("/"));
          if(moduleName.startsWith("npm")) {
            moduleName = "npm";
            report.numBreakdown[2]++;
            // delete graph.nodes[node.id];
            node.removed = true;
          // } else if(moduleName == "bluebird"){
            // do nothing
            // delete graph.nodes[node.id];
          } else {
            if(moduleName.startsWith("lodash"))
              moduleName = "lodash";
            else  if(moduleName.startsWith("jest")){
              moduleName = "jest";
            }
            report.numBreakdown[1]++;
          }
        }else {
          // console.log("debug app "+loc);
          moduleName = "_app_"//+loc;
          report.numBreakdown[0]++;
        }
        if(node.removed)
          continue;
        if(!report.moduleDistribution[moduleName])
          report.moduleDistribution[moduleName] = 0;
        report.moduleDistribution[moduleName]++;
        // console.log("modulename: "+moduleName);
      }

      // print only promise
      if(false && !printedNodes[key]){
        console.log(node.raw);
        printedNodes[key] = node;
        var checkEdge = function(edge, end) {
          if(!printedEdges[edge.id]){
            if(!printedNodes[end] && graph.nodes[end].type != "P"){
              printedNodes[end] = graph.nodes[end];
              console.log(graph.nodes[end].raw);
            }
            printedEdges[edge.id] = edge;
            console.log(edge.raw);
          }
        };
        node.foreachInEdge(checkEdge);
        node.foreachOutEdge(checkEdge);
      }
    }
  }

  //find creates
  for(var key in graph.nodes) {
    var node = graph.nodes[key];
    if(node.type == "P" && !node.removed) {
      var other = true;graph
      var numAll = 0;
      var numRaces = 0;
      var hasLink = false;
      node.foreachInEdge(function(edge, end){
        if(edge.label == "creates") {
          // console.log(graph.nodes[end].name); //promise or then
          if(graph.nodes[end].name == "Promise"){
            report.numPromiseConstructor++;
            report.numChains++;
            other = false;
          }else if(graph.nodes[end].name == "Promise.catch"){
            report.numCatch++;
            other = false;
          }else if(graph.nodes[end].name.startsWith("Promise.then")){
            report.numThen++;
            other = false;
          }
          return !other;
        }else if(edge.label == "all"){
          if(numAll == 0)
            report.numAll++;
          else
            report.numChains--;
          numAll++;
          other = false;
        }else if(edge.label == "race"){
          if(numRaces == 0)
            report.numRace++;
          else
            report.numChains--;
          numRaces++;
          other = false;
        }else if(edge.label == "link") {
          hasLink = true;
          // async, but we miss an event, so we treat as others
        }
      });
      if(other) {
        if(hasLink){
          report.numAsync++;
        }else {
          report.numOthers++;
        }
        report.numChains++;
      }
    }
  }

  //find links
  for(var key in graph.nodes) {
    var node = graph.nodes[key];
    if(node.type == "P" && !node.removed) {
      node.foreachInEdge(function(edge, end){
        if(edge.label == "link") {
          report.numChains--;
          return true;
        }
      });
    }
  }

  //find awaits
  for(var key in graph.nodes) {
    var node = graph.nodes[key];
    if(node.type == "A" && node.name == "await") {
      report.numAwaits++;
    }
  }

  //find links
  for(var key in graph.nodes) {
    var node = graph.nodes[key];
    if(node.type == "P" && !node.removed) {
      var isTail = true;
      node.foreachOutEdge(function(edge, end){
        if(edge.label == "catch" || edge.label == "then" || edge.label == "link" || edge.label == "all" || edge.label == "race")
          isTail = false;
        return !isTail;
      });
      if(isTail) {
        let hasAwait = false;

        function getSizeOfChain(n){
          var res = 1;
          n.foreachInEdge(function(edge, end) {
            if(graph.nodes[end].type=='P') {
              res += getSizeOfChain(graph.nodes[end]);
            }
          });
          return res;
        }

        var sizeChain = getSizeOfChain(node);

        report.chainSizes.push(sizeChain);

        node.foreachInEdge(function(edge, end){
          if(edge.label == "awaits") {
            hasAwait = true;
          }
          return hasAwait;
        });
        if(!hasAwait) {
          var hasCatch = false;
          var then;

          node.foreachInEdge(function(edge, end){
            if(edge.label == "creates") {
              // console.log(graph.nodes[end].name); //promise or then
              if(graph.nodes[end].name == "Promise"){
                // dead promise
                report.deadPromise++;
              }else if(graph.nodes[end].name == "Promise.catch"){
                hasCatch = true;
              }else if(graph.nodes[end].name.startsWith("Promise.then_")){
                // _assert(graph.nodes[end].name.startsWith("Promise.then_"), graph.nodes[end].name)
                then = graph.nodes[end].name.substring(13);
              }
            }
          });
          if(!hasAwait && !hasCatch && then && then[1] == '0') {
            report.missingRejection++;
            report.missingRejections[node.id] = [];
            report.missingRejections[node.id].push(node.raw);
            node.foreachOutEdge(function(edge){
              report.missingRejections[node.id].push(edge.raw);
            });
            node.foreachInEdge(function(edge){
              report.missingRejections[node.id].push(edge.raw);
            });
          }
        }
      }
    }
  }


  // check actions
  for(var key in graph.nodes) {
    var node = graph.nodes[key];
    if(node.type == "P" && !node.removed) {

    }
  }
  //
  // console.log(JSON.stringify(report));
  return report;
}

const fs = require("fs");

function splitLog(path){
  var log = fs.readFileSync(path).toString();
  var lines = log.split("\n");
  if(lines.length <= 1)
    return [""];
  if(log.indexOf("[USI") < 0)
    return [""];
  if(log.indexOf("[USI]") >= 0) {
    var res = [];
    res = log.split("L,0,(");
    res.shift(1);
    return res;
  }else {
    _assert(log.indexOf("[USI-")>=0, path);
    var pid2lines = {};
    var firstPid;
    lines.forEach(line => {
      var from = line.indexOf('-');
      var to = line.indexOf(']');
      var pid = line.substring(from+1, to);
      if(!firstPid)
        firstPid = pid;
      if(!pid2lines[pid]){
        pid2lines[pid] = "";
      }
      pid2lines[pid] += line+"\n";
    });
    delete pid2lines[firstPid];
    console.log("num processes "+Object.keys(pid2lines).length);
    return Object.values(pid2lines);
  }
}

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Use connect method to connect to the server
MongoClient.connect(url, { useNewUrlParser: true }).then(function(client) {
  //assert.equal(null, err);
  // console.log("Connected successfully to server");

  var prjData = {};
  var exit0 = {};
  function getProjects(dbname){
    const db_ds = client.db(dbname);
    const projects = db_ds.collection("results");
    return projects.find({}).toArray().then(
      values=>{
        for(var v of values){
          if(!prjData[v.repo]){
            prjData[v.repo]=[];
          }
          prjData[v.repo].push(v);
          if(v.exitcode == 0)
            exit0[v.repo] = v;
        }
        console.log("project data fetched");
        //console.log(prjData);
        return prjData;
      }
    );
  }

  var p1 = getProjects("cc-dsProject1");
  var p2 = getProjects("cc-dsProject2");
  var p3 = getProjects("cc-dsProject3");

  Promise.all([p1,p2,p3]).then(
    () => {
      console.log("numExit0 "+Object.keys(exit0).length+" / "+Object.keys(prjData).length)
      for(var key in prjData) {
        // if(!exit0[key])
          // console.log("Non0Prj: "+key);
        if(exit0[key])
          console.log("Exit0Prj: "+key);
      }
    }
  ).catch( e => {throw e;} )
  .finally( () => {
    client.close();
    console.log(Object.keys(prjData).length);
    // return;

    var dir = "./NAB_RESULTS"

    // var dir = "./NAB_RESULTS_PROMISECHAIN_10K"
    var users = fs.readdirSync(dir);
    for(var u of users) {
      var prjs = fs.readdirSync(dir+'/'+u);
      for(var p of prjs) {
        var logs = fs.readdirSync(dir+'/'+u+'/'+p)

        if(!prjData[u+"/"+p]){
          console.log("missing entry "+u+"/"+p+" in database");
          continue;
        }
        var exitcode0 = false;
        for(var entry of prjData[u+"/"+p]) {
          if(entry.exitcode == 0)
            exitcode0 = true;
        }
        if(!exitcode0)
          continue;

        // console.log(prjData[u+"/"+p]);

        var prjReport = { numBreakdown:[0,0,0],moduleDistribution:{},max:0, path:u+"/"+p };
        for(var l of logs) {
          // console.log(dir+'/'+u+'/'+p+'/'+l);

          // var result = fs.readFileSync(dir+'/'+u+'/'+p+'/'+l+".txt");
          var i = 0;
          var results = splitLog(dir+'/'+u+'/'+p+'/'+l);
          for(var result of results) {
            i++;
            console.log("Running ["+(i)+"/"+(results.length)+"]");
            try{
              var report = parseLog(result);
              if(removeTrival && (report.chainSizes.length == 0 || Math.max(...report.chainSizes) <= 1)){
                continue;
              }
              report.path = dir+'/'+u+'/'+p+'/'+l;
              for(var j = 0; j < 3; j++)
                prjReport.numBreakdown[j] += report.numBreakdown[j];

              for(var key in report) {
                if(key == "numBreakdown" || key == "moduleDistribution")
                  continue;
                if(key == 'chainSizes' && report[key].length > 0) {
                  if(report[key].length > 0 && Math.max(...report[key]) > prjReport.max) {
                    prjReport.max = Math.max(...report[key])
                  }
                }else if(parseInt(report[key])>0) {
                  if(!prjReport[key]) {
                    prjReport[key] = 0;
                  }
                  prjReport[key] += parseInt(report[key]);
                }
              }

              for(var key in report.moduleDistribution){
                if(!prjReport.moduleDistribution[key]){
                  prjReport.moduleDistribution[key] = 0;
                }
                prjReport.moduleDistribution[key] += report.moduleDistribution[key];
              }
              // console.log(JSON.stringify(report));
              console.log(dir+'/'+u+'/'+p+'/'+l+"["+(i)+"/"+(results.length)+"]"+" Success!");

            } catch(e){
              console.log(dir+'/'+u+'/'+p+'/'+l+"["+(i)+"/"+(results.length)+"]"+" Fail! "+e);
              // console.trace(e);
            }
          }
            // fs.writeFileSync(dir+'/'+u+'/'+p+'/'+l+".txt", JSON.stringify(report));

        }
        if(prjReport.numBreakdown[0] > 0) {
          moduleReport.numAppPromise++;
        }
        if(prjReport.numBreakdown[1] > 0) {
          moduleReport.numModulePromise.____++;
          for(var key in prjReport.moduleDistribution){
            if(!moduleReport.numModulePromise[key]){
              moduleReport.numModulePromise[key] = 0;
            }
            moduleReport.numModulePromise[key]++;
          }
        }
        if(prjReport.numBreakdown[0] > 0 || prjReport.numBreakdown[1] > 0) {
          moduleReport.numAnyPromise++;
          console.log("any project", prjReport.path, prjData[u+'/'+p][0].hash);
        }
        if(prjReport.numBreakdown[2] > 0) {
          moduleReport.numNPMPromise++;
        }
        console.log(JSON.stringify(prjReport));
      }
    }

    console.log(JSON.stringify(moduleReport));
    var sortable = [];
    for(var key in moduleReport.numModulePromise) {
      sortable.push([key, moduleReport.numModulePromise[key]]);
    }

    sortable.sort(function(a, b) {
        return b[1]- a[1];
    });

    console.log(sortable.length);
    console.log(JSON.stringify(sortable));
    for(var i = 0; i < sortable.length; i++) {
      console.log("ModuleRanking:", sortable[i][0], sortable[i][1])
    }
  });
});
