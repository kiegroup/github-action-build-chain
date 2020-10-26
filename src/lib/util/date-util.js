function formatDate(date) {
  return `${date.getFullYear()}${date.getMonth()}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
}

module.exports = { formatDate };
