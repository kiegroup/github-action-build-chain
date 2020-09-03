function getCheckoutInfo(context) {
  if (!context.checkoutInfo) {
    context.checkoutInfo = {};
  }
  return context.checkoutInfo;
}

function getCheckoutInfoProject(context, project) {
  if (!context.checkoutInfo) {
    context.checkoutInfo = {};
  }
  return context.checkoutInfo[project];
}

function saveCheckoutInfo(context, project, checkoutInfo) {
  if (!context.checkoutInfo) {
    context.checkoutInfo = {};
  }
  return (context.checkoutInfo[project] = checkoutInfo);
}

module.exports = {
  getCheckoutInfo,
  getCheckoutInfoProject,
  saveCheckoutInfo
};
