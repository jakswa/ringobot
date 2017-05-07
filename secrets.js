var crypto = require('crypto'),
  path = require('path'),
  fs = require('fs'),
  algorithm = 'aes-256-ctr',
  password = process.env["RINGOBOT_SECRETS_KEY"];

module.exports = {
  decryptFile: decryptFile,
  toJSON: toJSON,
  toEncrypted: toEncrypted
};

function decryptFile(filename) {
  return JSON.parse(decrypt(fs.readFileSync(filePath(filename), "utf8")));
}

function toJSON(filename) {
  fs.writeFileSync(
    filePath(filename + ".json"),
    JSON.stringify(decryptFile(filename))
  )
}

function toEncrypted(filename) {
  var contents = fs.readFileSync(filePath(filename + ".json"), 'utf8');
  fs.writeFileSync(filename, encrypt(contents));
}

function filePath(filename) {
  return path.join("secrets", filename);
}

function encrypt(text){
  assertPassword();
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(text,'utf8','base64')
  crypted += cipher.final('base64');
  return crypted;
}
 
function decrypt(text){
  assertPassword();
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text,'base64','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function assertPassword() {
  if (!password) throw new Error("No RINGOBOT_SECRETS_KEY set :O");
}
