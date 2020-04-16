module.exports = {
  mongo: {
    "host": "",
    "port": 0,
    "url": process.env.DB_URL,
   // "mongodb+srv://honey:honey123@honeygram-k4s1t.mongodb.net/staginghoneygram?retryWrites=true&w=majority",
    "database": process.env.DATABASE,//"staginghoneygram",
    "password": process.env.PASSWORD,// "honey123",
    "name": "mongo",
    "user": process.env.USER,//"honey",
    "connector": "mongodb",
    "useNewUrlParser": "true",
    "keepAlive": "false"
  }
};
