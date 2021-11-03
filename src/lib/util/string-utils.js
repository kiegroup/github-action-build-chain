function truncateString(str, limit, start = 0) {
  return ![undefined, null].includes(str) && str.length > limit
    ? `${str.substring(start, start + limit)}...`
    : str;
}

module.exports = {
  truncateString
};
