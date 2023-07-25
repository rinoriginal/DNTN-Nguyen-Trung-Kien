const { MongoClient } = require("mongodb");

const { DATABASE, DB_HOST, DB_PORT, DB_USER, DB_PASS } = process.env;

const initDB = async (dbPath, dbName) => {
  try {
    let client = await MongoClient.connect(dbPath);
    return client.db(dbName);
  } catch (error) {
    throw error;
  }
};

const initDBCallBack = (dbPath, dbName, callback) => {
  let opts = { useNewUrlParser: true, useUnifiedTopology: true };
  MongoClient.connect(dbPath, opts, (err, client) => {
    if (err) callback(err);
    else {
      let db = client.db(dbName);
      callback(null, db, client);
    }
  });
};

const initDBDetail = async (
  host = DB_HOST,
  port = DB_PORT,
  user = DB_USER,
  pass = DB_PASS,
  database = DATABASE
) => {
  try {
    let path = pathDB(host, port, database, user, pass);
    let client = await MongoClient.connect(path);
    return client.db(dbName);
  } catch (error) {
    throw error;
  }
};

function pathDB(host, port, database, user, pass) {
  let path = `mongodb://${host}:${port}/${database}`;
  if (user !== "#" && pass !== "#")
    path = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(
      pass
    )}@${host}:${port}/${database}`;
  return path;
}

module.exports = {
  initDB,
  pathDB,
  initDBCallBack,
};
