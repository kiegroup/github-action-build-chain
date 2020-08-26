const fs = require("fs");
const path = require("path");
const { logger } = require("./common");
const { getYamlFileContent } = require("./fs-helper");
var assert = require("assert");
const core = require("@actions/core");
const { checkoutDependencies, getDir } = require("./build-chain-flow-helper");

async function checkoutParentsAndGetWorkflowInformation(
  context,
  projectList,
  project,
  currentTargetBranch,
  parentDependencies
) {
  if (!projectList[project]) {
    projectList.push(project);
    if (parentDependencies && Object.keys(parentDependencies).length > 0) {
      core.startGroup(
        `Checking out dependencies [${Object.keys(parentDependencies).join(
          ", "
        )}] for project ${project}`
      );
      const checkoutInfos = await checkoutDependencies(
        context,
        parentDependencies,
        currentTargetBranch
      );
      core.endGroup();
      for (const parentProject of Object.keys(parentDependencies).filter(
        parentDependency => parentDependency !== null && parentDependency !== ""
      )) {
        const dir = getDir(context.config.rootFolder, parentProject);
        const parentWorkflowInformation = readWorkflowInformation(
          parentProject,
          context.config.github.jobName,
          context.config.github.workflow,
          context.config.github.group,
          context.config.matrixVariables,
          dir
        );

        if (parentWorkflowInformation) {
          return [parentWorkflowInformation].concat(
            await checkoutParentsAndGetWorkflowInformation(
              context,
              projectList,
              parentProject,
              checkoutInfos[parentProject].targetBranch,
              parentWorkflowInformation.parentDependencies
            )
          );
        } else {
          logger.warn(
            `workflow information ${context.config.github.workflow} not present for ${parentProject}.`
          );
          return [];
        }
      }
    }
  }
  return [];
}

function readWorkflowInformation(
  project,
  triggeringJobName,
  workflowFilePath,
  defaultGroup,
  matrixVariables,
  dir = "."
) {
  const filePath = path.join(dir, workflowFilePath);
  if (!fs.existsSync(filePath)) {
    logger.warn(`file ${filePath} does not exist`);
    return undefined;
  }
  return parseWorkflowInformation(
    project,
    triggeringJobName,
    getYamlFileContent(filePath),
    defaultGroup,
    matrixVariables
  );
}

function parseWorkflowInformation(
  project,
  jobName,
  workflowData,
  defaultGroup,
  matrixVariables
) {
  assert(workflowData.jobs[jobName], `The job id '${jobName}' does not exist`);
  const buildChainStep = workflowData.jobs[jobName].steps.find(
    step => step.uses && step.uses.includes("github-action-build-chain")
  );
  buildChainStep.with = Object.entries(buildChainStep.with)
    .filter(([key]) => key !== "matrix-variables")
    .reduce((acc, [key, value]) => {
      acc[key] = treatMatrixVariables(value, matrixVariables);
      return acc;
    }, {});
  return {
    id: buildChainStep.id,
    project,
    name: buildChainStep.name,
    buildCommands: splitCommands(buildChainStep.with["build-command"]),
    buildCommandsUpstream: splitCommands(
      buildChainStep.with["build-command-upstream"]
    ),
    buildCommandsDownstream: splitCommands(
      buildChainStep.with["build-command-downstream"]
    ),
    childDependencies: dependenciesToObject(
      buildChainStep.with["child-dependencies"],
      defaultGroup
    ),
    parentDependencies: dependenciesToObject(
      buildChainStep.with["parent-dependencies"],
      defaultGroup
    ),
    archiveArtifacts: getArchiveArtifacts(buildChainStep, project)
  };
}

function splitCommands(commands) {
  return commands
    ? commands
        .split("\n")
        .filter(line => line)
        .map(item => item.trim())
    : undefined;
}

function treatMatrixVariables(withExpression, matrixVariables) {
  let result = withExpression;
  const exp = /((\${{ )([a-zA-Z0-9\\.\\-]*)( }}))/g;
  let match = undefined;
  while ((match = exp.exec(withExpression))) {
    if (!matrixVariables || !matrixVariables[match[3]]) {
      throw new Error(
        `The variable '${match[3]}' is not defined in "with" 'matrix-variables' so it can't be replaced. Please define it in the flow triggering the job.`
      );
    }
    result = result.replace(`${match[1]}`, matrixVariables[match[3]]);
  }
  return result;
}

function getArchiveArtifacts(step, defaultName = "artifact") {
  return step.with["archive-artifacts-name"] ||
    step.with["archive-artifacts-path"] ||
    step.with["archive-artifacts-if-no-files-found"]
    ? {
        name: step.with["archive-artifacts-name"]
          ? step.with["archive-artifacts-name"]
          : defaultName,
        path: step.with["archive-artifacts-path"],
        ifNoFilesFound: step.with["archive-artifacts-if-no-files-found"]
          ? step.with["archive-artifacts-if-no-files-found"]
          : "warn"
      }
    : undefined;
}

function dependenciesToObject(dependencies, defaultGroup) {
  const dependenciesObject = {};
  dependencies
    ? dependencies
        .split("\n")
        .filter(line => line)
        .forEach(item => {
          const dependency = item.trim().includes("@")
            ? item.trim().split("@")
            : [item, undefined];
          const groupProject = dependency[0].includes("/")
            ? dependency[0].trim().split("/")
            : [defaultGroup, dependency[0]];

          dependency[1]
            ? (dependenciesObject[groupProject[1].trim()] = {
                group: groupProject[0],
                mapping: {
                  source: dependency[1].split(":")[0],
                  target: dependency[1].split(":")[1]
                }
              })
            : (dependenciesObject[groupProject[1].trim()] = {
                group: groupProject[0]
              });
        })
    : {};
  return dependenciesObject;
}

module.exports = {
  readWorkflowInformation,
  checkoutParentsAndGetWorkflowInformation,
  dependenciesToObject
};
