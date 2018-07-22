// do not require
unction testNAB() {
    var arr = [1,2];
    arr[6] = 1; // creates non-contiguous array;
    arr[10] = 3;
    console.log("arg non-contigous ARRAY " + arr[6]);
}

testNAB();
