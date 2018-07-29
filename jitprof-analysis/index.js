/*******************************************************************************
 * Copyright 2018 Dynamic Analysis Group, Università della Svizzera Italiana (USI)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/

//Author: Haiyang Sun
//DO NOT INSTRUMENT

const crypto = require('crypto');
const fs = require('fs');

var report = {reponame: "NABREPONAME", hash: "NABHASH"};
J$._jitprof = report;
J$._excludes = "npm,mocha,taper,grunt,<function>,node_modules";

//don't want the analysis output change the test result

function getModuleName(filePath) {
  var npmIdx = filePath.lastIndexOf("node_modules/");
  if(npmIdx < 0)
    return "__app__";
  var modulePath = filePath.substring(npmIdx+("node_modules/").length);
  var end = modulePath.indexOf("/");
  var moduleName = modulePath.substring(0, end);
  return moduleName;
}

report.addEntry = function(analysis, entryName, relatedFile, num) {
  if(!num)
    num = 1;
  if(!report[analysis]){
    report[analysis] = {};
  }
  if(!report[analysis][entryName]){
    report[analysis][entryName] = {num: 0};
  }
  report[analysis][entryName].num+=num;

  var moduleName = getModuleName(relatedFile);
  if(!report[analysis][entryName][moduleName]){
    report[analysis][entryName][moduleName] = 0;
  }
  report[analysis][entryName][moduleName]+=num;
}
  

require("./utils/Utils")
require("./utils/RuntimeDB")
require("./AccessUndefArrayElem")
require("./BinaryOpOnUndef")
require("./NonContiguousArray")
require("./PolymorphicFunCall")
require("./SwitchArrayType")
require("./TrackHiddenClass")
require("./TypedArray")



function dumpResult(){
  var f = "/tmp/jitprof_"+Math.floor((new Date).getTime());
  fs.writeFileSync(f, JSON.stringify(J$._jitprof));
}

process.on('SIGINT', function(){
  process.exit();
});

process.on('exit', dumpResult);

