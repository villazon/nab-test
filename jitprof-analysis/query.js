const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
 
// Connection URL
const url = 'mongodb://localhost:27017';
 
// Use connect method to connect to the server
MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
 
  const db = client.db("NODEPROFDB");

  const collections = db.collection("jitprof");
  const db_ds = client.db("dsProject");
  const projects = db_ds.collection("results");

  collections.find({}).snapshot().forEach(function(doc){
    projects.find({hash: doc.hash}).forEach(function(prj) {
      console.log(doc.reponame+" == "+prj.repo);
    }
  )}).then(
    ()=> {client.close()}
  );

});
