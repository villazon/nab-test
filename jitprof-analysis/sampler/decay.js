/*
 * Copyright 2015 University of California, Berkeley.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Liang Gong

/**
 * decaying sampler for function level
 */

((function(sandbox) {
    var fs = require('fs');
    var path = require('path');
    var cwd = process.cwd();
    var dataLocation = 'src/js/analyses/jitprof/sampler/data/sample_decay.json';
    dataLocation = path.resolve(cwd + '/' + dataLocation);
    var content = fs.readFileSync(dataLocation);
    
    var sampleArray = JSON.parse(content);
    var sampleCountArray = []; // maps iid --> current count
    var sampleCountIdxArray = []; // maps iid --> current index in the sample count array

    function Sampler() {
        this.runInstrumentedFunctionBody = function(iid) {
            var sampleCnt;
            var sampleCntIdx;
            var callAnalysis = true;
            if (iid in sampleCountArray) {
                sampleCntIdx = sampleCountIdxArray[iid];
                sampleCnt = sampleCountArray[iid];
            } else {
                sampleCntIdx = 0;
                sampleCnt = sampleArray[sampleCntIdx];
                sampleCountIdxArray[iid] = sampleCntIdx; // update index
                // count in sampleCountArray will be updated finally
            }
            if ((--sampleCnt) <= 0) {
                callAnalysis = true;
                sampleCnt = sampleArray[(sampleCntIdx++) % sampleArray.length];
                sampleCountIdxArray[iid] = sampleCntIdx; // update index
            } else {
                callAnalysis = false;
            }
            sampleCountArray[iid] = sampleCnt; // update count
            return callAnalysis;
        };
    }

    sandbox.analysis = new Sampler();
})(J$));