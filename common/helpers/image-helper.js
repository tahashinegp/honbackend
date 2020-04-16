const bcrypt = require('bcryptjs');
const helperMethod = require('./helper-methods');
const constantData = require('./constant-data');
const uuidv4 = require('uuid/v4');

module.exports = {
    singleImageProcess :(host, userId, currDate, container, photoName, isPrivate) =>
        singleImageProcess(host, userId, currDate, container, photoName, isPrivate),
    getDbPath: (hostUrl, container, fileName, timeHash) =>
        getDbPath(hostUrl, container, fileName, timeHash),
    processPrivatePhoto: (isPermitted, privatePhotos) =>
        processPrivatePhoto(isPermitted, privatePhotos),
    isPermittedForPrivatePhoto: (requestBy, userId, userList) =>
        isPermittedForPrivatePhoto(requestBy, userId, userList),
    reqestedFilesArrayProcessing: files => reqestedFilesArrayProcessing(files),
    getFileType: name => getFileType(name),
    getFileName :(name, hash) => getFileName(name, hash),
    videoProcessing :(host, currDate, container, photoName, userId) => videoProcessing(host, currDate, container, photoName, userId),
    imageProcessing :(host, currDate, container, photoName, userId, isPrivate) => imageProcessing(host, currDate, container, photoName, userId, isPrivate)
}

function imageProcessing(host, currDate, container, photoName, userId, isPrivate) {
  const timeHash = timeHashFunc(currDate);
  const filePath = getFileName(photoName, timeHash);
  const dbPath = getDbPath(host, container, photoName, timeHash);
  let privateFilePath, privateDbPath;
  let privateTimeHash = `${timeHashFunc(
    parseInt(currDate) - 100
  )}${uuidv4()}`;
  privateFilePath = getFileName(photoName, privateTimeHash);
  privateDbPath = getDbPath(host, container, photoName, privateTimeHash);
  return {
    filePath,
    privateFilePath,
    uploadContent:
    {
      id: `${currDate}${userId}${uuidv4()}`,
      urlLink: dbPath,
      privateUrlLink: privateDbPath,
      isDeleted: false,
      isPrivate,
      createdAt: currDate
    }
  }
}

function videoProcessing(host, currDate, container, photoName, userId) {
  const timeHash = timeHashFunc(currDate);
  const filePath = getFileName(photoName, timeHash);
  const dbPath = getDbPath(host, container, photoName, timeHash);
  return {
    filePath,
    uploadContent:
    {
      id: `${currDate}${userId}${uuidv4()}`,
      urlLink: dbPath,
      isDeleted: false,
      createdAt: currDate
    }
  }
}

// function singleImageProcess(
//     host,
//     userId,
//     currDate,
//     container,
//     photoName,
//     isPrivate
//   ) {
//     const timeHash = timeHashFunc(currDate);
//     const filePath = getFileName(photoName, timeHash);
//     const dbPath = getDbPath(host, container, photoName, timeHash);
//     let privateFilePath, privateDbPath;
//     let privateTimeHash = `${timeHashFunc(
//       parseInt(currDate) - 100
//     )}${uuidv4()}`;
//     privateFilePath = getFileName(photoName, privateTimeHash);
//     privateDbPath = getDbPath(host, container, photoName, privateTimeHash);
//     return {
//       filePath,
//       uploadContent: singleImageObj(userId, currDate, dbPath, privateDbPath, isPrivate),
//       privateFilePath: privateFilePath
//     };

//   }

  // function singleImageObj(userId, currDate, dbPath, privateDbPath, isPrivate) {
  //   return {
  //     id: `${currDate}${userId}${uuidv4()}`,
  //     urlLink: dbPath,
  //     privateUrlLink: privateDbPath,
  //     isDeleted: false,
  //     isPrivate,
  //     createdAt: currDate
  //   }
  //   // privateDbPath ?

  //     // : {
  //     //   id: `${currDate}${userId}${uuidv4()}`,
  //     //   urlLink: dbPath,
  //     //   isDeleted: false,
  //     //   createdAt: currDate
  //     // };
  // }


  function timeHashFunc(dateTime) {
    return helperMethod.encrypt(bcrypt.hashSync(`${dateTime}`, bcrypt.genSaltSync(13)));
  }

  function getFileName(fileName, timeHash) {
    return `${timeHash}_${fileName}`;
  }

  function getDbPath(hostUrl, container, fileName, timeHash) {
    return timeHash ?
      `http://${hostUrl}/api/containers/${container}/download/${timeHash}_${fileName}`
    :
      `http://${hostUrl}/api/containers/${container}/download/${fileName}`;
  }

  function processPrivatePhoto(isPermitted, privatePhotos) {
    let retArray = [];
    privatePhotos.forEach(singlePhoto => {
      if (isPermitted)
        retArray.push(singlePhoto.urlLink);
      else
        retArray.push(singlePhoto.privateUrlLink);
    });
    return retArray;
  }

  function isPermittedForPrivatePhoto(requestBy, userId, userList) {
    let isPermitted = false;
    if (requestBy === userId) isPermitted = true;
    userList.forEach(element => {
      if (element.userId == requestBy && element.status === constantData.Status.accept) isPermitted = true;
    });
    return isPermitted;
  }

  function reqestedFilesArrayProcessing(files) {
    const isArray =
      files && files[''] && files[''][0] && files[''].length ? true : false;
    return isArray
      ? files['']
      : !files[''] && !files[0]
        ? Object.values(files)
        : [files['']];
  }

  function getFileType(name) {
    const fileSpliter = name.split('.');
    return constantData.ImageFormats.includes(fileSpliter[fileSpliter.length - 1].toLowerCase())
      ? true
      : constantData.VideoFormats.includes(fileSpliter[fileSpliter.length - 1].toLowerCase())
        ? false

     : undefined;
  }
