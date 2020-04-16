module.exports = {
  //SystemAccountNo: '5bab2cac683aa80924ae76c3',
  OneDoller: 10,
  DefaultPictureName: 'avatar-circle.png',
  ContainersName: ['hg-media-staging', 'hg-media-staging'],
  BucketName: 'hg-media-staging',
  UserType: ['keeper', 'honey'],
  BaseUrl: '18.224.237.251:5000',
  BaseUrlProtocol: 'http:',
 // ServerUrl: 'http://18.224.237.251:5000/',
  BlockChainUrl: process.env.BLOCK_CHAIN_URL,//'http://52.15.199.145:3003/api/',
  EthereumAdminWalletAddress: process.env.ETHEREUM_ADMIN_WALLET_ADDRESS,//'0x4b35C164dA3649cE495305C80fcf1d3Ac13a4154',
  EthereumAdminWalletPrivateKey: process.env.ETHEREUM_ADMIN_WALLET_PRIVATE_KEY,
    //'0x6A91453DAFCFE1CE242497590BE69CDFFD3FE7E5F833914E330268C4ED7DFADA',
  EthereumAdminWalletPrivateKeyWithoutPrefix: process.env.ETHEREUM_ADMIN_WALLET_PRIVATE_KEY_WITHOUT_PREFIX,//'6A91453DAFCFE1CE242497590BE69CDFFD3FE7E5F833914E330268C4ED7DFADA',
  Validations: { mail: 'userMail' },
  PictureUploaded: 'Uploaded successfully',
  IncorrectRequest: 'Please place a valid object',
  EmptyString: '',
  WalletNotFound: 'Wallet Address not found',
  WalletNotCreated: 'Blockchain-System is not running',
  NoDataFound: 'No data found',
  GatewayParamsMismatch: 'Payment gateway parameters mismatch',
  BlockchainParamsMismatch: 'Blockchain parameters mismatch',
  ComoleteProfile: 'Please complete your profile first',
  RequestSent: 'Request has been sent',
  PasswordMismatch: 'Password mismatch!',
  TypeMismatch: 'Request type mismatch!',
  PrivatePhotoAccess: 'Private photo permission',
  PrivatePhotoAccessRequest: 'Private photo access request has been submitted',
  CreatedSuccessfully: 'Record created successfully!',
  UpdatedSuccessfully: 'Record updated successfully',
  ValidityCheckerTrue: 'content is valid',
  ValidityCheckerFalse: "content isn't valid",
  SentEmail: 'Email has been sent',
  RecordAlreadyExist: 'Record already exist!',
  VerificationCodeSended: 'Verification code has been sended',
  RecordDeleted: 'Record(s) deleted successfully',
  RecordNotDeleted: 'Record(s) is/are not deleted',
  FormateMismatch: "Doesn't match file format",
  NoRecordFound: 'No Record found',
  NoUpdateFound: 'No update found',
  insufficientFund: 'Insufficient fund',
  DuplicateBenefitArrangement:
    'You have already assigned benefit arrangement for this person',
  InvalidRequest: 'Invalid Request',
  InvalidRequestBenefitArrangement:
    'You are not allowed to assign benefit arrangement to the user',
  InvalidRequestGiftToken: 'You are not allowed to gift tokens to the user',
  InvalidRequestDateRequest: 'You are not allowed to send Date Request',
  RecordNotSaved: 'Record not saved',
  RecordNotUpdated: 'Record not updated',
  hexCodeMismatch: 'Hex Code Mismatched',
  subscriptionPlan: {
    DIAMOND: 1000,
    GOLD: 500,
    SILVER: 200
  },
  LowerCaseFieldsForUsers: [
    'userType',
    // 'userName',
    'userMail',
    'desiredRelationship'
  ],
  MonthList: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ],
  ImageFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif'],
  VideoFormats: ['mp4', 'avi', 'wmv', 'mov'],
  CustomModel: [
    'userType',
    'userName',
    'userMail',
    'birthDate',
    'name',
    'relationshipStatus',
    'desiredRelationship',
    'additionalEmail',//
    'nationality',
    'relationshipLifestyle',
    'smokingStatus',
    'alcoholicStatus',
    'childrenStatus',
    'languages',
    'academicQualification',//
    'benefitArrangement',
    'aboutMe',
    'bodySpecs',
    'bodyFitness',
    'gender',
    'netWorth',
    'interestedIn',
    'passcode',
    'weight',
    'height',
    'city',
    'country'
  ],
  CustomModelWithoutUserName: [
    'userType',
    'birthDate',
    'name',
    'relationshipStatus',
    'desiredRelationship',
    'additionalEmail',//
    'nationality',
    'relationshipLifestyle',
    'smokingStatus',
    'alcoholicStatus',
    'childrenStatus',
    'languages',
    'academicQualification',//
    'benefitArrangement',
    'aboutMe',
    'bodySpecs',
    'bodyFitness',
    'gender',
    'netWorth',
    'interestedIn',
    'passcode',
    'weight',
    'height',
    'city',
    'country'
  ],
  CustomPrefernce: [
    'messageNotification',
    'dateNotification',
    'arrangementNotification',
    'walletNotification',
    'photoNotification'
  ],
  Status: {
    accept: 'Accepted',
    decline: 'Declined',
    pending: 'Pending',
    doBetter: 'DoBetter',
    confirm: 'Confirmed',
    happen: 'Happened',
    notHappen: 'NotHappened'
  },
  Purposes: {
    DateRequest: 'DateRequest',
    PhotoRequest: 'PhotoRequest',
    MessageStacking: 'MessageStacking',
    BenefitArrangement: 'BenefitArrangement',
    GiftToken: 'GiftToken',
    Withdraw: 'Withdraw',
    Deposit: 'Deposit'
  },

//mapper userType-interestedIn

typeInterestedmapper: {
  honey: 'female',
  keeper: 'male'
},



  //isRepliedType: true

  PhotoRequest: {
    notificationType: 'PhotoRequest',
    collectionName: 'users',
    propertyName: 'privatePhotoAccessibleUsers'
  },

  //isRepliedType: false
  PhotoResponse: {
    notificationType: 'PhotoResponse',
    collectionName: 'users',
    propertyName: 'userUploads'
  },
  //isRepliedType: true
  DateRequest: {
    notificationType: 'DateRequest',
    collectionName: 'users',
    propertyName: 'requestForDates',
    sortBy: 'createdAt'
  },

  //isRepliedType: true

  DateRequestNegotiation: {
    notificationType: 'DateRequestNegotiation',
    collectionName: 'users',
    propertyName: 'requestForDates',
    sortBy: 'createdAt'
  },

  //isRepliedType: true
  DateRequestAccept: {
    notificationType: 'DateRequestAccept',
    collectionName: 'users',
    propertyName: 'requestForDates',
    sortBy: 'createdAt'
  },

  //isRepliedType: false
  DateRequestConfirm: {
    notificationType: 'DateRequestConfirm',
    collectionName: 'users',
    propertyName: 'requestForDates',
    sortBy: 'createdAt'
  },

  //isRepliedType: false
  DateRequestHappened: {
    notificationType: 'DateRequestHappened',
    collectionName: 'users',
    propertyName: 'requestForDates',
    sortBy: 'createdAt'
  },

  //isRepliedType: false
  DateRequestNotHappened: {
    notificationType: 'DateRequestNotHappened',
    collectionName: 'users',
    propertyName: 'requestForDates',
    sortBy: 'createdAt'
  },

  //isRepliedType: false
  DateRequestDecline: {
    notificationType: 'DateRequestDecline',
    collectionName: 'users',
    propertyName: 'requestForDates',
    sortBy: 'createdAt'
  },

  GiftTokens: {
    notificationType: 'GiftTokens',
    collectionName: 'users',
    propertyName: 'giftTokens',
    sortBy: 'createdAt'
  },
  BenefitArrangements: {
    notificationType: 'BenefitArrangements',
    collectionName: 'users',
    propertyName: 'benefitArrangements',
    sortBy: 'createdAt'
  },

  BenefitArrangementResponse: {
    notificationType: 'BenefitArrangementResponse',
    collectionName: 'users',
    propertyName: 'benefitArrangements',
    sortBy: 'createdAt'
  },


  RequestDecline: { notificationType: 'RequestDecline' },
  UserFieldsAuthData: {
    id: true,
    userType: true,
    userName: true,
    userMail: true,
    birthDate: true,
    name: true,
    isMailVerified: true,
    isProfileVerified: true,
    gender: true,
    netWorth: true,
    interestedIn: true,
    relationshipStatus: true,
    desiredRelationship: true,
    aboutMe: true,
    benefitArrangement: true,
    bodySpecs: true,
    bodyFitness: true,
    height: true,
    weight: true,
    avatar: true,
    city: true,
    country: true
  },
  UserFieldsForDiscover: {
    userName: true,
    name: true,
    location: true,
    interestedIn: true,
    aboutMe: true,
    benefitArrangement: true,
    bodySpecs: true,
    bodyFitness: true,
    height: true,
    weight: true,
    avatar: true,
    desiredRelationship: true,
    relationshipStatus: true,
    relationshipLifestyle:true,
    birthDate: true,
    gender: true,
    city: true,
    country: true,
    netWorth: true,
    userType: true,
    userMail: true
  },
  SortBy: ['mostRecentlyOnline' /*, 'benefitMatchingScore', 'closestToMe', 'mostActive'*/]
};

