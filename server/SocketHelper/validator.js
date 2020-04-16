const messageKeywords = [];
const messageRegex = /(([+][(]?[0-9]{1,3}[)]?)|([(]?[0-9]{4}[)]?))\s*[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?([-\s\.]?[0-9]{3})([-\s\.]?[0-9]{3,4})/g;
module.exports = {
  parseMessage: (message = '') => parseMessage(message)
};
function parseMessage(message) {
  let parsedObj = {
    isValid: false,
    message: message
  };
  try {
    if (!message) return parsedObj;
    let parsedMessage = message.replace(messageRegex, function(
      match,
      g1,
      g2,
      g3,
      g4,
      g5,
      offset,
      inputMessage
    ) {
      return match.replace(match, generateText(match.length));
    });
    if (messageKeywords.length === 0)
      return { isValid: true, message: parsedMessage };
    let validity = true;
    for (let item of messageKeywords) {
      parsedMessage = parsedMessage.replace(item, generateText(item.length));
    }
    return { isValid: validity, message: parsedMessage };
  } catch (error) {
    return { isValid: false, message: null };
  }
}

const generateText = (length = 0, replaceChar = '*') => {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += replaceChar;
  }
  return text;
};
