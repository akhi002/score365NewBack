const { encrypt } = require('../utils/encrypt');  

function encryptResponseMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);  

  res.json = (data) => {
    const encrypted = encrypt(JSON.stringify(data));  
    return originalJson(encrypted);  
  };

  next();
}
  
module.exports = encryptResponseMiddleware;
