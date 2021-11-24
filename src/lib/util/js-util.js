const hrtimeToMs = (start, end = process.hrtime(start)) => {
  return end[0] * 1000 + end[1] / 1000000;
};

module.exports = {
  hrtimeToMs
};
