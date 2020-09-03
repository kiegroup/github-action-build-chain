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
  workflowInformation
) {
  if (!projectList[project]) {
    projectList.push(project);
    if (
      workflowInformation.parentDependencies &&
      Object.keys(workflowInformation.parentDependencies).length > 0
    ) {
      core.startGroup(
        `Checking out dependencies [${Object.keys(
          workflowInformation.parentDependencies
        ).join(", ")}] for project ${project}`
      );
      const checkoutInfos = await checkoutDependencies(
        context,
        workflowInformation.parentDependencies,
        currentTargetBranch
      );
      core.endGroup();
      for (const [parentProject, parentDependency] of Object.entries(
        workflowInformation.parentDependencies
      ).filter(
        ([parentDependencyKey]) =>
          parentDependencyKey !== null && parentDependencyKey !== ""
      )) {
        const dir = getDir(context.config.rootFolder, parentProject);
        const parentWorkflowInformation = readWorkflowInformation(
          parentProject,
          parentDependency.jobId
            ? parentDependency.jobId
            : workflowInformation.jobId,
          `.github/workflows/${
            parentDependency.flowFile
              ? parentDependency.flowFile
              : workflowInformation.flowFile
          }`,
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
              parentWorkflowInformation
            )
          );
        } else {
          logger.warn(
            `workflow information ${
              parentDependency.flowFile
                ? parentDependency.flowFile
                : context.config.github.flowFile
            } not present for ${parentProject}.`
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
  jobId,
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
    jobId,
    getYamlFileContent(filePath),
    defaultGroup,
    matrixVariables
  );
}

function parseWorkflowInformation(
  project,
  jobId,
  workflowData,
  defaultGroup,
  matrixVariables
) {
  assert(workflowData.jobs[jobId], `The job id '${jobId}' does not exist`);
  const buildChainStep = workflowData.jobs[jobId].steps.find(
    step => step.uses && step.uses.includes("github-action-build-chain")
  );
  assert(
    buildChainStep.with["workflow-file-name"],
    `The workflow file name does not exist for '${project}' and it's mandatory`
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
    archiveArtifacts: getArchiveArtifacts(buildChainStep, project),
    jobId,
    flowFile: buildChainStep.with["workflow-file-name"]
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
  return {
    name: step.with["archive-artifacts-name"]
      ? step.with["archive-artifacts-name"]
      : step.with["archive-artifacts-path"]
      ? defaultName
      : undefined,
    path: step.with["archive-artifacts-path"],
    ifNoFilesFound: step.with["archive-artifacts-if-no-files-found"]
      ? step.with["archive-artifacts-if-no-files-found"]
      : step.with["archive-artifacts-path"]
      ? "warn"
      : undefined,
    dependencies: treatArchiveArtifactsDependencies(
      step.with["archive-artifacts-dependencies"]
    )
  };
}

function treatArchiveArtifactsDependencies(archiveArtifactsDependencies) {
  if (archiveArtifactsDependencies) {
    if (
      archiveArtifactsDependencies === "all" ||
      archiveArtifactsDependencies === "none"
    ) {
      return archiveArtifactsDependencies;
    } else {
      return archiveArtifactsDependencies
        .split("\n")
        .filter(line => line)
        .map(item => item.trim());
    }
  } else {
    return "none";
  }
}

function dependenciesToObject(dependencies, defaultGroup) {
  const dependenciesObject = {};
  dependencies
    ? dependencies
        .split("\n")
        .filter(line => line)
        .forEach(dependency => {
          const projectName = getProjectName(dependency.trim());
          dependenciesObject[projectName] = {
            group: getGroupFromDependency(dependency, defaultGroup),
            mapping: getMappingFromDependency(dependency),
            flowFile: getFlowFileFromDependency(dependency),
            jobId: getJobIdFromDependency(dependency)
          };
        })
    : {};
  return dependenciesObject;
}

function getProjectName(dependency) {
  const match = dependency.match(/(.*\/)?([\w\-.]*).*/);
  return match[2];
}

function getGroupFromDependency(dependency, defaultGroup) {
  const match = dependency.match(/([\w\-.]*)\//);
  return match ? match[1] : defaultGroup;
}

function getMappingFromDependency(dependency) {
  const match = dependency.match(/@([\w\-.]*):([\w\-.]*)/);
  return match
    ? {
        source: match[1],
        target: match[2]
      }
    : undefined;
}

function getFlowFileFromDependency(dependency) {
  const match = dependency.match(/\|([\w\-.]*):?/);
  return match && match[1] ? match[1] : undefined;
}

function getJobIdFromDependency(dependency) {
  const match = dependency.match(/\|.*:([\w\-.]*)/);
  return match && match[1] ? match[1] : undefined;
}

module.exports = {
  readWorkflowInformation,
  checkoutParentsAndGetWorkflowInformation,
  dependenciesToObject
};
