function testNAB() {
    var arr = [1,2];
    arr[6] = 1; // creates non-contiguous array;
    
    console.log("arg non-contigous ARRAY " + arr[6]);
}

testNAB();
