function treatCommand(command) {
  let libraryToLoad = "./no-treatment";
  if (command.match(/.*mvn .*/)) {
    libraryToLoad = "./maven-treatment";
  }
  return require(libraryToLoad).treat(command);
}

module.exports = {
  treatCommand
};
