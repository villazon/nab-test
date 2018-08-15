// do not require

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
	end = new Date().getTime();
    }
}


function testNAB() {
    var arr = [1,2];
    arr[6] = 1; // creates non-contiguous array;
    arr[10] = 3;
    console.log("arg non-contigous ARRAY " + arr[6]);
}

wait(10000);

