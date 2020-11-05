function getNodeTriggeringJob(context, nodeChain) {
  return nodeChain.find(
    e =>
      e.project === context.config.github.repository ||
      e.project === context.config.github.project
  );
}

module.exports = { getNodeTriggeringJob };
