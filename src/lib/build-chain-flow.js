const { checkoutDependencies, getDir, readWorkflowInformation } = require('./build-chain-flow-helper');
const { logger } = require("./common");
const { execute } = require('./command');

let projectList = undefined;

async function start(context) {
    projectList = [];
    // TODO: merge with master before reading info
    const workflowInformation = readWorkflowInformation(context.config.github.workflow);
    await treatParents(context, context.config.github.project, workflowInformation);
    await execute('.', workflowInformation['buildCommand']);

}

async function treatParents(context, project, workflowInformation, shouldExecute = false) {
    console.log('treatParents', project);
    if (!projectList[project]) {
        projectList.push(project);
        if (workflowInformation.parentDependencies) {
            await checkoutDependencies(context, workflowInformation.parentDependencies);
            for (const parentProject of workflowInformation.parentDependencies.filter(a => a !== null && a !== '')) {
                const parentWorkflowInformation = readWorkflowInformation(context.config.github.workflow, getDir(parentProject));
                if (parentWorkflowInformation) {
                    await treatParents(context, parentProject, parentWorkflowInformation, true);
                } else {
                    logger.warn(`workflow information ${context.config.github.workflow} not present for ${parentProject}. So, won't execute`);
                }
            }
        }
        if (shouldExecute) {
            console.log('executing in parent', project, workflowInformation['buildCommandUpstream'] || workflowInformation['buildCommand']);
            await execute(getDir(project), workflowInformation['buildCommandUpstream'] || workflowInformation['buildCommand']);
        }
    }
}

module.exports = {
    start
};
