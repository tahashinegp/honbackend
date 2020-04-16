module.exports = {
  mongo: {
    "host": "",
    "port": 0,
    "url": process.env.DB_URL,
    //"mongodb+srv://honey:honey123@cluster0-kwqu8.mongodb.net/honey?retryWrites=true&w=majority",
    "database": process.env.DATABASE,//"honey",
    "password": process.env.PASSWORD,// "honey123",
    "name": "mongo",
    "user": process.env.USER,//"honey",
    "connector": "mongodb",
    "useNewUrlParser": "true",
    "keepAlive": "false"
  }
};
