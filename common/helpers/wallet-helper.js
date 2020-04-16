const apiCaller = require('./api-caller');
const constantData = require('./constant-data');

module.exports = {
    getAmount :(isWithdraw, walletAmount, amount) => 
        isWithdraw ? walletAmount - amount : walletAmount + amount,
    getWalletAddress: () => apiCaller.getWalletAddress(),
    getTotalSupply: () => apiCaller.getTotalSupply(),
    getWalletBalance: address => apiCaller.getWalletBalance(address),
    topUpWalletBalance: (address, amount) =>
    apiCaller.topUpWalletBalance(
      constantData.EthereumAdminWalletAddress,
      constantData.EthereumAdminWalletPrivateKey,
      address,
      amount
    ),
    withdraWalletBalance :(address, privateKey, receiverAddress, amount) => 
    apiCaller.transferTokens(
      address,
      privateKey,
      receiverAddress,
      amount
    ),
    transferTokens :(address, privateKey, receiverAddress, amount) => apiCaller.transferTokens(
        address,
        privateKey,
        receiverAddress,
        amount
      ),
    narrationCreator: (amount, isWithdraw, userName) => 
        `${amount} token is ${
        isWithdraw ? 'withdrawn from' : 'diposited to'
      } your wallet ${isWithdraw ? 'to' : 'from'} ${userName}`
}