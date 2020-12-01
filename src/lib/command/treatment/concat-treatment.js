function treat(command, concatCommand) {
  return concatCommand ? `${command} ${concatCommand}` : command;
}

module.exports = {
  treat
};
