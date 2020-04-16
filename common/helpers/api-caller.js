const axios = require('axios');
const constData = require('./constant-data');
module.exports = {
  getTotalSupply: () => axios.get(`${constData.BlockChainUrl}totalsupply`),

  getWalletAddress: () => axios.post(`${constData.BlockChainUrl}walletaccount`,{
    mainAccount: constData.EthereumAdminWalletAddress,
    privateKey: constData.EthereumAdminWalletPrivateKeyWithoutPrefix
  }),

  getWalletBalance: address => axios.post(`${constData.BlockChainUrl}tokenbalance`, {
      owner: address
    }),
  topUpWalletBalance :(callerAddress, privateKey, receiver, amount) =>
    axios.post(`${constData.BlockChainUrl}minttoken`, {
      callerAddress, privateKey, receiver, amount
    }),

    transferTokens :(callerAddress, privateKey, to, amount) =>
      axios.post(`${constData.BlockChainUrl}transfertoken`, {
        callerAddress, privateKey, to, amount
      }),
    getCountry: (lat, lon) =>{
      return axios.get(`https://locationiq.com/v1/reverse_sandbox.php?format=json&lat=${lat}&lon=${lon}&accept-language=en`)
    }
};
