const isError = obj => Object.prototype.toString.call(obj) === "[object Error]";

module.exports = {
  isError
};
