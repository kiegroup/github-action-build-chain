# Github Action Build Chain

Github action build chain is a tool for github actions to build multiple projects from different repositories in a single action.
This tool is trying to solve the problem when a project depends on another project (most probably from the same organization) and one change can/should be performed in different repositories. How can we assure one specific pull request will work with the latest changes from/in the dependant/dependency projects and it won't break something? This is what we call **cross-repo pull requests** and **build-chain** is the way we have to solve it.

Let's consider you have a project hierarchy like:

![Project hierarchy](/docs/project-hierarchy.png)

and you want to upstream/downstream build whatever project from this hierarchy, **Github Action Build Chain** provides you the mechanism to easily do it.
You can check [Usage example](#usage-example).

Just defining the **build chain** flow in every project you want to trigger, the tool will get build information from `dependency-file` input and will execute every command from every project in a single github action.

Table of content
----------------

* **[Github Action Build Chain](#github-action-build-chain)**
* **[Build Chain Flows](#build-chain-flows)**
* **[How to add it to your project(s)](#how-to-add-it-to-your-projects)**
* **[Input Fields](#input-fields)**
* **[Pre/Post sections](#prepost-sections)**
* **[Archiving Artifacts](#archiving-artifacts)**
* **[How to clone project in more than one folder](#how-to-clone-project-in-more-than-one-folder)**
* **[Execution environment](#execution-environment)**
* **[Usage example](#usage-example)**
* **[Local Execution](#local-execution)**
* **[About Commands to Execute](#about-commands-to-execute)**
* **[Limitations](#limitations)**
* **[Development](#development)**
* **[System Requirements](#system-requirements)**


## Allowed configuration files versions

- 2.1
- 2.2

## Build Chain Flows

### Cross Pull request flow

- It checks out the current project and reads the workflow information from the YAML file triggering the job.

  - It merges the TARGET_GROUP:PROJECT:TARGET_BRANCH into the SOURCE_GROUP:PROJECT:SOURCE_BRANCH from the pull request triggering the job.
    > **_Warning:_** It will fail in case it can't be done automatically, properly informing to please resolve conflicts.

- It recursively checks out the rest of the dependant projects defined in `definition-file`.

  - For each parent dependency:
    - It will look for forked project belonging same github group as the one triggering the job.
    - It will try to checkout SOURCE_GROUP:PROJECT:SOURCE_BRANCH. In case the it exists and it has a pull request over the TARGET_GROUP:PROJECT:TARGET_BRANCH it will check it out and will merge it with target branch.
    - If previous checkout fails, it will try the same with TARGET_GROUP:PROJECT:SOURCE_BRANCH this time.
    - If previous checkout fails, it will checkout TARGET_GROUP:PROJECT:TARGET_BRANCH.
      > **_Warning:_** It will fail in case it can't be done automatically, properly informing to please resolve conflicts.

- Once all the projects are checked out, it will run as many commands are defined in `before`, `after` or root level properties from `build` section for every parent dependency starting from the highest level of the hierarchy to the lowest one.

- It will archive artifacts in case `archive-artifacts-path` input is defined.

### Full Downstream flow

- It checks out the current project and reads the workflow information from the YAML file triggering the job.

  - It merges the TARGET_GROUP:PROJECT:TARGET_BRANCH into the SOURCE_GROUP:PROJECT:SOURCE_BRANCH from the pull request triggering the job.
    > **_Warning:_** It will fail in case it can't be done automatically, properly informing to please resolve conflicts.

- It gets the full downstream project chain (the parents projects plus its children and their dependencies. At the end the whole chain) based on configuration file.
- It recursively checks out the rest of the dependant projects defined in `definition-file`.

  - For each parent dependency:
    - It will look for forked project belonging same github group as the one triggering the job.
    - It will try to checkout SOURCE_GROUP:PROJECT:SOURCE_BRANCH. In case the it exists and it has a pull request over the TARGET_GROUP:PROJECT:TARGET_BRANCH it will check it out and will merge it with target branch.
    - If previous checkout fails, it will try the same with TARGET_GROUP:PROJECT:SOURCE_BRANCH this time.
    - If previous checkout fails, it will checkout TARGET_GROUP:PROJECT:TARGET_BRANCH.
      > **_Warning:_** It will fail in case it can't be done automatically, properly informing to please resolve conflicts.

- Once all the projects are checked out, it will run as many commands are defined in `before`, `after` or root level properties from `build` section for every parent dependency starting from the highest level of the hierarchy to the lowest one.

- It will archive artifacts in case `archive-artifacts-path` input is defined.

### Single Pull Request flow

- It checks out the current project and reads the workflow information from the YAML file triggering the job.

  - It merges the TARGET_GROUP:PROJECT:TARGET_BRANCH into the SOURCE_GROUP:PROJECT:SOURCE_BRANCH from the pull request triggering the job.
    > **_Warning:_** It will fail in case it can't be done automatically, properly informing to please resolve conflicts.

- Once the project from the event is checked out, it will run as many commands are defined in `before`, `after` or root level properties from `build` section.

- It will archive artifacts in case `archive-artifacts-path` input is defined.

### Branch flow

- It checks out the whole tree from the `starting-project` project input and reads the workflow information from the YAML file triggering the job.

- Once the projects from the branch are checked out, it will run as many commands are defined in `before`, `after` or root level properties from `build` section.

- The flow will archive (in case the archiving is not skipped) a spreadsheet with the execution summary.

## How to add it to your project(s)

It is just to add the step (replacing dependencies and commands):

```
- name: Build Chain ${{ matrix.java-version }}
  id: build-chain
  uses: ginxo/github-action-build-chain@BXMSPROD-1025
  with:
    definition-file: https://raw.githubusercontent.com/${GROUP}/droolsjbpm-build-bootstrap/${BRANCH}/.ci/pull-request-config.yaml
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

to your existing yaml flow definition or to create a new one. Do the same for the rest of the projects you need.

> **_Note:_** The `@actions/checkout` step is not needed since is the tool the one which is going to handle what to checkout for every project in the chain.

## Input Fields

See [action.yml](action.yml)

- **definition-file** (mandatory): `path to the file in filesystem | URL to the file`. [See more details](https://github.com/kiegroup/build-chain-configuration-reader#url-format)

  > Example:
  >
  > ```
  > definition-file: './folder/whatever_definition_file.yaml'
  > definition-file: 'http://yourdomain.com/definition-file.yaml'
  > definition-file: 'https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml'
  > definition-file: 'https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/${BRANCH}/.ci/pull-request-config.yaml'
  > definition-file: 'https://raw.githubusercontent.com/${GROUP}/droolsjbpm-build-bootstrap/${BRANCH}/.ci/pull-request-config.yaml'
  > definition-file: 'https://raw.githubusercontent.com/${GROUP}/${PROJECT_NAME}/${BRANCH}/.ci/pull-request-config.yaml'
  > ```

> **_Note:_** In case you use URL way, remember you should point the file content itself, so in case you want to use https://github.com/kiegroup/droolsjbpm-build-bootstrap/blob/a1efb55f17fd0fd9001b073c999e3fd2a80600a6/.ci/pull-request-config.yaml, `definition-file` value should be https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/a1efb55f17fd0fd9001b073c999e3fd2a80600a6/.ci/pull-request-config.yaml (Raw one for this case) or (using dynamic placeholders) https://raw.githubusercontent.com/${GROUP}/${PROJECT_NAME}/${BRANCH}/.ci/pull-request-config.yaml.

- **flow-type** (optional. 'cross_pr' by default): The flow you want to execute. Possible values

  - cross_pr: executes the cross pull request flow
  - full_downstream: executes the full downstream flow
  - branch: executes the branch flow
  - single_pr: executes the single pull request flow

- **starting-project** (optional. the project triggering the job by default): The project you want start building from. It's not the same as the project triggering the job (which will remain the same), but the project to take tree from. For instance

  > ```
  > starting-project: 'groupX/projectX' // it will get project dependencies tree from 'groupX/projectX'
  > starting-project: 'kiegroup/drools' // it will get project dependencies tree from 'kiegroup/drools'
  > ```

  > **_Note:_** You have to be sure the project tree to start building from, contains the project triggering the job.

- **logger-level** (optional. 'info' by default): The log level. Possible values

  - info
  - trace
  - debug

  > ```
  > logger-level: 'info'
  > logger-level: 'debug'
  > ```

- **annotations-prefix** (optional. '' by default): The prefix to be shown on the Github Actions' Annotations title.

  > ```
  > annotations-prefix: "${{ matrix.java-version }}/${{ matrix.maven-version }}"
  > annotations-prefix: "My Job Prefix"
  > annotations-prefix: "Gradle Version ${{ matrix.gradle-version }}"
  > annotations-prefix: "OS ${{ matrix.os }}"
  > ```

- **additional-flags** (optional. '' by default): The chance to define additional flags for the execution, as it is done on the CLI side. Just semicolon (;) separated, like '--skipParallelCheckout;--skipExecution;-cct (mvn .\*)||\$1 -s settings.xml'.

  > ```
  > additional-flags: "--fullProjectDependencyTree"
  > additional-flags: "--fullProjectDependencyTree;--skipParallelCheckout"
  > additional-flags: "--skipParallelCheckout; --fullProjectDependencyTree"
  > additional-flags: "--skipParallelCheckout; -cct (mvn .*)||$1 -s settings.xml"
  > ```

  > **_Note:_** It has a limitation, the flag values can't contain semicolons (;), otherwise it will be treated as a new flag.

## Pre/Post sections

It is possible to define pre and post sections in the definition-file. The idea is to have the chance to execute something before (`pre`) or after (`post`) project checkout and build command execution.

### PRE

```
pre: string | multiline string
```

It will be executed even before checking out projects.

#### Examples

```
pre: export VARIABLE_NAME=value
```

```
pre: |
  export VARIABLE_NAME=value
  echo $VARIABLE_NAME
```

### POST

```
post:
  success: string | multiline string
  failure: string | multiline string
  always: string | multiline string
```

It will be executed after executing all commands for every project and after archiving artifacts. The options are:

- `success`: it will be executed in case there's no error during build execution.
- `failure`: it will be executed in case there's any error during build execution.
- `always`: it will be always executed.

#### Examples

```
post:
  success: echo 'final message in case of no errors'
  failure: echo 'final message in case of any error'
  always: echo 'final message always printed'
```

```
post:
  success: |
    echo 'final message in case of no errors 1'
    echo 'final message in case of no errors 2'
  failure: |
    echo 'final message in case of any error'
    echo 'final message in case of any error 2'
  always: |
    echo 'final message always printed'
    echo 'final message always printed 2'
```

## Archiving Artifacts

The archive artifacts algorithm is basically copied from [actions/upload-artifact project](https://github.com/actions/upload-artifact) and (manually) transpiled to javascript. The usage is basically the same (the inputs are different named adding `archive-artifacts` prefix and the [Conditional Artifact Upload](https://github.com/actions/upload-artifact#conditional-artifact-upload) is not enabled), so why do we include this `archive artifacts` mechanism in this tool if it's already implemented by another tool? well, because this treats the archive artifacts mechanism for the whole build chain, so in case you define an `archive-artifacts-path` in a different project from the chain, all of them will be uploaded. If you are wondering if you are able to use `actions/upload-artifact` instead of the one we propose, the answer is 'yes', just take into consideration the artifacts will be archived based on the definition from the project triggering the job.

The `archive-artifacts-path` input brings you the chance to specify if the path will be uploaded in case of build success (default), in case of failure or always for every single path. For example specifying something like `path/to/artifact/world.txt@failure` will archive `path/to/artifact/world.txt` in case of execution failure. You can check [Upload for different execution results](https://github.com/actions/upload-artifact#upload-for-different-execution-results).

### Upload an Individual File

```yaml
archive-artifacts:
  path: **/dashbuilder-runtime.war
```

### Upload an Entire Directory

```yaml
archive-artifacts:
  path: path/to/artifact-folder/
```

### Upload using a Wildcard Pattern

```yaml
archive-artifacts:
  path: path/**/[abc]rtifac?/*
```

### Upload using Multiple Paths and Exclusions

```yaml
archive-artifacts:
  path: |
    path/output/bin/
    path/output/test-results
    !path/**/*.tmp
```

### Upload for different execution results

This is something additional to [@actions/glob](https://github.com/actions/toolkit/tree/main/packages/glob)

```yaml
archive-artifacts:
  path: |
    path/output/bin/
    path2/output2/bin2/@success
    path/output/test-results@failure
    !path/**/*.tmp@always
```

- will upload `path/output/bin/` just in case of `success`
- will upload `path2/output2/bin2/` just in case of `success`
- will upload `path/output/test-results` just in case of `failure`
- will upload `!path/**/*.tmp` in every case

### Path Wildcards

For supported wildcards along with behavior and documentation, see [@actions/glob](https://github.com/actions/toolkit/tree/main/packages/glob) which is used internally to search for files.

If a wildcard pattern is used, the path hierarchy will be preserved after the first wildcard pattern.

```
    path/to/*/directory/foo?.txt =>
        ∟ path/to/some/directory/foo1.txt
        ∟ path/to/some/directory/foo2.txt
        ∟ path/to/other/directory/foo1.txt

    would be flattened and uploaded as =>
        ∟ some/directory/foo1.txt
        ∟ some/directory/foo2.txt
        ∟ other/directory/foo1.txt
```

If multiple paths are provided as input, the least common ancestor of all the search paths will be used as the root directory of the artifact. Exclude paths do not effect the directory structure.

Relative and absolute file paths are both allowed. Relative paths are rooted against the current working directory. Paths that begin with a wildcard character should be quoted to avoid being interpreted as YAML aliases.

The [@actions/artifact](https://github.com/actions/toolkit/tree/main/packages/artifact) package is used internally to handle most of the logic around uploading an artifact. There is extra documentation around upload limitations and behavior in the toolkit repository that is worth checking out.

### Customization if no files are found

If a path (or paths), result in no files being found for the artifact, the action will succeed but print out a warning. In certain scenarios it may be desirable to fail the action or suppress the warning. The `if-no-files-found` option allows you to customize the behavior of the action if no files are found.

```yaml
archive-artifacts:
  path: path/to/artifact/
  if-no-files-found: error # 'warn' or 'ignore' are also available, defaults to `warn`
```

### Conditional Artifact Upload

not supported (yet)

### Uploading without artifact name

You can upload an artifact with or without specifying a name

```yaml
archive-artifacts:
  name: my-artifacts
  path: **/dashbuilder-runtime.war
```

If not provided, `artifact` will be used as the default name which will manifest itself in the UI after upload.

### Uploading to the same artifact

Each artifact behaves as a file share. Uploading to the same artifact multiple times in the same workflow can overwrite and append already uploaded files

```yaml
# Project A
archive-artifacts:
  path: world.txt
```

```yaml
# Project B
archive-artifacts:
  path: extra-file.txt
```

```yaml
# Project C
archive-artifacts:
  path: world.txt
```

With the following example, the available artifact (named `artifact` which is the default if no name is provided) would contain both `world.txt` and `extra-file.txt`.

### Environment Variables and Tilde Expansion

You can use `~` in the path input as a substitute for `$HOME`. Basic tilde expansion is supported.

```yaml
archive-artifacts:
  path: "~/new/**/*"
```

### archive-artifacts dependencies usage

The idea of the property `dependencies` is to allow to define from the project triggering the job which artifacts you want to archive from the whole chain. Possible values:

- `none` no artifact from its dependencies will be uploaded, no matter what the dependencies projects define.
- `all` all artifacts from its dependencies will be uploaded, depending on what the dependencies define.
- `list of projects` define which of the projects in the chain will be treated to upload artifacts, depending on what the dependencies define.

```yaml
archive-artifacts:
  path: "~/new/**/*"
  dependencies: "none"
```

```yaml
archive-artifacts:
  path: "~/new/**/*"
  dependencies: "all"
```

```yaml
archive-artifacts:
  path: "~/new/**/*"
  dependencies: |
    projectX
    projectY
```

## Where does the upload go?

In the top right corner of a workflow run, once the run is over, if you used this action, there will be a `Artifacts` dropdown which you can download items from. Here's a screenshot of what it looks like<br/>
<img src="docs/archive-artifacts-github.png" width="375" height="140">

There is a trashcan icon that can be used to delete the artifact. This icon will only appear for users who have write permissions to the repository.

## How to clone project in more than one folder

It is possible to clone project in more than one folder specifying `clone` field. For example:

```
  - project: kiegroup/appformer
    clone:
      - appformer-integration-test
      - folderx/appformer-unit-test
```

will clone the `kiegroup/appformer` in the `ROOT_FOLDER/PROJECT_FOLDER` and additionally will clone the project folder to `ROOT_FOLDER/PROJECT_FOLDER/appformer-integration-test` and `ROOT_FOLDER/PROJECT_FOLDER/folderx/appformer-unit-test`

Another example would be:

```
  - project: group/projectx
    clone: another-folder
```

will clone the `group/projectx` in the `ROOT_FOLDER/PROJECT_FOLDER` and additionally will clone the project folder to `ROOT_FOLDER/PROJECT_FOLDER/another-folder`


## Execution environment

The environment execution definition is part of the workflow (the `.yml` file) and it depends on the commands you require to execute. If you require to execute maven commands you will have to add the `actions/setup-java@v1` with its java version, or in case you need python commands `actions/setup-python` is the one. You can find different examples in https://github.com/YOURGROUP/YOURPROJECT/actions/new.

It could be the case where you require a very specific environment to execute your stuff as it is the case for [python3-cekit](https://github.com/kiegroup/github-action-build-chain/tree/python3-cekit). Feel free to propose the environment you need as a pull request to this project:

- Create a branch based on `python3-cekit` one
- Modify [the Dockerfile from there](https://github.com/kiegroup/github-action-build-chain/blob/python3-cekit/Dockerfile)

Current environments:

- **python3-cekit**: python3 + python cekit library + docker + nodejs + yarn latest stable release [Dockerfile](https://github.com/kiegroup/github-action-build-chain/blob/python3-cekit/Dockerfile)

## Usage example

Considering the projects hierarchy:

![Project hierarchy](/docs/project-hierarchy.png)

You can check how to define build definition files from [Build Chain Configuration Reader documentation](https://github.com/kiegroup/build-chain-configuration-reader)

### Mapping

Let's suppose

```
- project: E
  dependencies:
    - project: D
  mapping:
    dependencies:
      default:
        - source: 7.x
          target: main
      C:
        - source: main
          target: 7.x
        - source: 7.x
          target: 7.x
      D:
        - source: main
          target: 7.x
        - source: 7.x
          target: 7.x
    dependant:
      default:
        - source: main
          target: 7.x
    exclude:
      - A
      - B
```

#### mapping.dependencies

It is used to define branch mapping between E and its dependencies in case `E` is `startingProject`/`projectTriggeringTheJob`.

In case the `E:7.x` branch build or PR is triggered for this `7.x` target branch:

- A: no mapping at all, so `7.x` (straight mapping) (since it is excluded)
- B: no mapping at all, so `7.x` (straight mapping) (since it is excluded)
- C:`7.x` (due to `mapping.dependencies.C` source `7.x` mapping)
- D:`7.x` (due to `mapping.dependencies.D` source `7.x` mapping)
- The rest (F,G,H,...): `main` (since `mapping.dependencies.default` mapping defined for source: `7.x`)

In case the `E:main` branch build or PR is triggered for this `main` target branch:

- A: no mapping at all, so `main` (straight mapping) (since it is excluded)
- B: no mapping at all, so `main` (straight mapping) (since it is excluded)
- C:`7.x` (due to `mapping.dependencies.C` source `main` mapping)
- D:`7.x` (due to `mapping.dependencies.C` source `main` mapping)
- The rest (F,G,H,...): `main` (since there's no mapping defined for default main branch)

In case the `E:anyotherbranch` branch build or PR is triggered for this `anyotherbranch` target branch (being `anyotherbranch` whatever the branch name, except `7.x` or `main`):

- No mapping at all, just straight mapping to `anyotherbranch`.

#### mapping.dependant

It is used to define branch mapping between the rest of the projects and project A in case `E` is NOT `startingProject`/`projectTriggeringTheJob`.

In case the `A:7.x` or any other (except `main`) branch build or PR is triggered -> `E:7.x` will be taken (since there's not `mapping.dependant` for `7.x` source)
In case the `A:main` branch build or PR is triggered -> `E:7.x` (due to `mapping.dependant.default` mapping)

## Docker build

You can build the `github-action-build-chain` image locally with just executing docker command:

```
docker build .
```

In case you want to build it for a different openjdk version you just specify a `--build-arg OPENJDK_VERSION` argument:

```
docker build --build-arg OPENJDK_VERSION=11 .
```

## Local execution

It's possible to use this tool locally, just follow this steps

```
$ npm install -g @kie/build-chain-action
$ build-chain help
Usage: build-chain [options] [command]

A CLI tool to perform the build chain github actions

Options:
  -h, --help      display help for command

Commands:
  build           Execute different flows
  tools           A bunch of utility tools
  help [command]  display help for command
```

either `sudo` and `env GITHUB_TOKEN=...` are optional depending on your local setup.

> Keep in mind: Whenever the tool is executed from a github check run, the `Printing local execution command` section is printed with the exact command you could copy/paste in order to reproduce it locally.

### build command

The build command is used to execute the different flows locally

```shell
$ build-chain build help
Usage: build-chain build [options] [command]

Execute different flows

Options:
  -h, --help                 display help for command

Commands:
  cross_pr [options]         Execute cross pull request build chain workflow
  full_downstream [options]  Execute full downstream build chain workflow
  single_pr [options]        Execute single pull request build chain workflow
  branch [options]           Execute branch build chain workflow
  help [command]             display help for command
```

### build command: cross_pr

Execute pull-request flow

```shell
$ build-chain build cross_pr --help
Usage: build-chain build cross_pr [options]

Execute cross pull request build chain workflow

Options:
  -u, --url <event_url>                  pull request event url
  -p, --startProject <project>           The project to start the build from
  -f, --defintionFile <path_or_url>      The definition file, either a path to the filesystem or a URL to it
  -o, --outputFolder <path>              The folder path to store projects. Default is of the format 'build_chain_yyyymmddHHMMss' (default:
                                         "build_chain_202211229567")
  --token <token>                        The GITHUB_TOKEN. It can be set as an environment variable instead
  -d, --debug                            Set debugging mode to true (default: false)
  --skipExecution                        A flag to skip execution and artifacts archiving for all projects. Overrides skipProjectExecution (default:
                                         false)
  --skipProjectExecution <projects...>   A flag to skip execution and artifacts archiving for certain projects only
  --skipParallelCheckout                 Checkout the project sequentially (default: false)
  -t, --customCommandTreatment <exp...>  Each exp must be of the form <RegEx||ReplacementEx>. Regex defines the regular expression for what you want
                                         to replace with the ReplacementEx
  --skipProjectCheckout <projects...>    A list of projects to skip checkout.
  --skipCheckout                         skip checkout for all projects. Overrides skipProjectCheckout (default: false)
  -h, --help                             display help for command
```

Example:

```shell
$ build-chain build cross_pr -f https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml -u https://github.com/kiegroup/kie-wb-distributions/pull/1068
```

### build command: full_downstream

Execute full downstream (fdb) flow

```shell
$ build-chain build full_downstream --help
Usage: build-chain build full_downstream [options]

Execute full downstream build chain workflow

Options:
  -u, --url <event_url>                  pull request event url
  -p, --startProject <project>           The project to start the build from
  -f, --defintionFile <path_or_url>      The definition file, either a path to the filesystem or a URL to it
  -o, --outputFolder <path>              The folder path to store projects. Default is of the format 'build_chain_yyyymmddHHMMss' (default:
                                         "build_chain_2022112295741")
  --token <token>                        The GITHUB_TOKEN. It can be set as an environment variable instead
  -d, --debug                            Set debugging mode to true (default: false)
  --skipExecution                        A flag to skip execution and artifacts archiving for all projects. Overrides skipProjectExecution (default:
                                         false)
  --skipProjectExecution <projects...>   A flag to skip execution and artifacts archiving for certain projects only
  --skipParallelCheckout                 Checkout the project sequentially (default: false)
  -t, --customCommandTreatment <exp...>  Each exp must be of the form <RegEx||ReplacementEx>. Regex defines the regular expression for what you want
                                         to replace with the ReplacementEx
  --skipProjectCheckout <projects...>    A list of projects to skip checkout.
  --skipCheckout                         skip checkout for all projects. Overrides skipProjectCheckout (default: false)
  -h, --help                             display help for command
```

Example:

```shell
$ build-chain build full_downstream -f https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml -u https://github.com/kiegroup/kie-wb-distributions/pull/1068
```

### build command: single_pr

Execute single pr flow

```shell
$ build-chain build single_pr --help
Usage: build-chain build single_pr [options]

Execute single pull request build chain workflow

Options:
  -u, --url <event_url>                  pull request event url
  -p, --startProject <project>           The project to start the build from
  -f, --defintionFile <path_or_url>      The definition file, either a path to the filesystem or a URL to it
  -o, --outputFolder <path>              The folder path to store projects. Default is of the format 'build_chain_yyyymmddHHMMss' (default:
                                         "build_chain_2022112295912")
  --token <token>                        The GITHUB_TOKEN. It can be set as an environment variable instead
  -d, --debug                            Set debugging mode to true (default: false)
  --skipExecution                        A flag to skip execution and artifacts archiving for all projects. Overrides skipProjectExecution (default:
                                         false)
  --skipProjectExecution <projects...>   A flag to skip execution and artifacts archiving for certain projects only
  --skipParallelCheckout                 Checkout the project sequentially (default: false)
  -t, --customCommandTreatment <exp...>  Each exp must be of the form <RegEx||ReplacementEx>. Regex defines the regular expression for what you want
                                         to replace with the ReplacementEx
  --skipProjectCheckout <projects...>    A list of projects to skip checkout.
  --skipCheckout                         skip checkout for all projects. Overrides skipProjectCheckout (default: false)
  -h, --help                             display help for command
```

Example: 

```shell
$ build-chain build single_pr -f https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml -u https://github.com/kiegroup/kie-wb-distributions/pull/1068
```

### build command: branch

Execute branch flow

```shell
$ build-chain build branch --help
Usage: build-chain build branch [options]

Execute branch build chain workflow

Options:
  -p, --startProject <project>           The project to start the build from
  -b, --branch <branch>                  The branch to get the project from
  --fullProjectDependencyTree            Checks out and execute the whole tree instead of the upstream build (default: false)
  -c, --command <commands...>            The command(s) to execute for every project. This will override definition file configuration (just
                                         dependency tree will be taken into account)
  -g, --group <group>                    The group to execute flow. It will take it from project argument in case it's not specified
  -f, --defintionFile <path_or_url>      The definition file, either a path to the filesystem or a URL to it
  -o, --outputFolder <path>              The folder path to store projects. Default is of the format 'build_chain_yyyymmddHHMMss' (default:
                                         "build_chain_202211221013")
  --token <token>                        The GITHUB_TOKEN. It can be set as an environment variable instead
  -d, --debug                            Set debugging mode to true (default: false)
  --skipExecution                        A flag to skip execution and artifacts archiving for all projects. Overrides skipProjectExecution (default:
                                         false)
  --skipProjectExecution <projects...>   A flag to skip execution and artifacts archiving for certain projects only
  --skipParallelCheckout                 Checkout the project sequentially (default: false)
  -t, --customCommandTreatment <exp...>  Each exp must be of the form <RegEx||ReplacementEx>. Regex defines the regular expression for what you want
                                         to replace with the ReplacementEx
  --skipProjectCheckout <projects...>    A list of projects to skip checkout.
  --skipCheckout                         skip checkout for all projects. Overrides skipProjectCheckout (default: false)
  -h, --help                             display help for command
```

Example:

```shell
$ build-chain build branch -f https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml -p=kiegroup/lienzo-tests -b=main
```

#### Custom Command Replacement

It is possible to define custom expression to replace commands. The expression structure is `RegEx||ReplacementEx` where:

- `RegEx`: you can define regular expression with or without literals. See [Javascript RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- `||` just split `RegEx` from `ReplacementEx`
- `ReplacementEx`: See [Javascript String replacement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)

So basically at left side of `||` you define the regular expression where you want to apply string replacement from right side. For example, considering command `mvn clean install` in case we apply `(^mvn .*)||$1 -s ~/.m2/settings.xml` the final command will be `mvn clean install -s ~/.m2/settings.xml`

### tool command

There are some utility tools as well

```shell
$ build-chain tools help
Usage: build-chain tools [options] [command]

A bunch of utility tools

Options:
  -h, --help              display help for command

Commands:
  project-list [options]  Prints a ordered  by precendence list of projects
  help [command]          display help for command
```

## About Commands to Execute

Just consider the library used behind the scenes in order to execute commands is [@actions/exec](https://github.com/actions/toolkit/tree/main/packages/exec), this library has a limitation at https://github.com/actions/toolkit/blob/b5f31bb5a25d129441c294fc81ba7f92f3e978ba/packages/exec/src/exec.ts#L27 where it tries to decide the "tool" to be executed, so in case you need to execute bash or windows commands like conditionals you should use it like this

### Bash
`bash -c "my command"`
`bash -c  "if true; then echo 'it's TRUE'; else echo 'it's FALSE'; fi"`

### Windows
`cmd /c "my command"`

> **_Note:_** thanks to https://github.com/actions/toolkit/issues/461#issuecomment-743750804

# Limitations

### Zipped Artifact Downloads

During a workflow run, files are uploaded and downloaded individually using the `upload-artifact` and `download-artifact` actions. However, when a workflow run finishes and an artifact is downloaded from either the UI or through the [download api](https://developer.github.com/v3/actions/artifacts/#download-an-artifact), a zip is dynamically created with all the file contents that were uploaded. There is currently no way to download artifacts after a workflow run finishes in a format other than a zip or to download artifact contents individually. One of the consequences of this limitation is that if a zip is uploaded during a workflow run and then downloaded from the UI, there will be a double zip created.

### Permission Loss

:exclamation: File permissions are not maintained during artifact upload :exclamation: For example, if you make a file executable using `chmod` and then upload that file, post-download the file is no longer guaranteed to be set as an executable.

### Case Insensitive Uploads

:exclamation: File uploads are case insensitive :exclamation: If you upload `A.txt` and `a.txt` with the same root path, only a single file will be saved and available during download.

## About Commands to Execute

Just consider the library used behind the scenes in order to execute commands is [@actions/exec](https://github.com/actions/toolkit/tree/main/packages/exec), this library has a limitation at https://github.com/actions/toolkit/blob/b5f31bb5a25d129441c294fc81ba7f92f3e978ba/packages/exec/src/exec.ts#L27 where it tries to decide the "tool" to be executed, so in case you need to execute bash or windows commands like conditionals you should use it like this

### Bash
`bash -c "my command"`
`bash -c  "if true; then echo 'it's TRUE'; else echo 'it's FALSE'; fi"`

### Windows
`cmd /c "my command"`

> **_Note:_** thanks to https://github.com/actions/toolkit/issues/461#issuecomment-743750804

# Limitations

### Zipped Artifact Downloads

During a workflow run, files are uploaded and downloaded individually using the `upload-artifact` and `download-artifact` actions. However, when a workflow run finishes and an artifact is downloaded from either the UI or through the [download api](https://developer.github.com/v3/actions/artifacts/#download-an-artifact), a zip is dynamically created with all the file contents that were uploaded. There is currently no way to download artifacts after a workflow run finishes in a format other than a zip or to download artifact contents individually. One of the consequences of this limitation is that if a zip is uploaded during a workflow run and then downloaded from the UI, there will be a double zip created.

### Permission Loss

:exclamation: File permissions are not maintained during artifact upload :exclamation: For example, if you make a file executable using `chmod` and then upload that file, post-download the file is no longer guaranteed to be set as an executable.

### Case Insensitive Uploads

:exclamation: File uploads are case insensitive :exclamation: If you upload `A.txt` and `a.txt` with the same root path, only a single file will be saved and available during download.

## Github limitations

### Using secrets on a forked project Github Action

According to documentation, see [Workflows in forked repositories](https://docs.github.com/en/github-ae@latest/actions/using-workflows/events-that-trigger-workflows#workflows-in-forked-repositories)

> **_Note:_** With the exception of GITHUB_TOKEN, secrets are not passed to the runner when a workflow is triggered from a forked repository. The GITHUB_TOKEN has read-only permissions in forked repositories.

Nothing but `GITHUB_TOKEN` secret can be used from a forked project Github Action workflow. So cases like this will store nothing on `${{ env.GITHUB_TOKEN_GOOD_BAD }}`, `${{ env.CIFS_ZID_USER }}` or `${{ env.CIFS_ZID_KEY }}` but it will properly store `GITHUB_TOKEN` on `${{ env.GITHUB_TOKEN_GOOD}}`

```
      - name: "Run build-chain"
        id: build-chain
        uses: kiegroup/github-action-build-chain@main
        with:
          definition-file: whatever-the-file-url/path
        env:
          GITHUB_TOKEN_GOOD_BAD: "${{ secrets.MY_GH_TOKEN }}"
          GITHUB_TOKEN_GOOD: "${{ secrets.GITHUB_TOKEN }}"
          CIFS_ZID_USER: "${{ secrets.CIFS_ZID_USER }}"
          CIFS_ZID_KEY: "${{ secrets.CIFS_ZID_KEY }}"
```

> **_Note:_** Just remember this is not a problem from the tool itself but a limitation from Github Actions in order to avoid exposing sensitive information.

### inputs usage in runs.image from action.yml

> Just in case you are interested in adapting this code or in case you want to create your own tool.

It's not possible to use expressions like `image: "docker://kie-group:github-action-build-chain:{{ inputs.build-chain-build-system }}"`. This way it would be easy to dynamically select image to run with a simple `with` input from flow yml file and we could skip errors like [matrix in uses](#matrix-in-uses).
Just because of this we have to maintain different Dockerfile definitions in different branches and to tag every branch for every version we release like `python3-cekit-v1`.

## Development

### Execute CLI

```
npm run install
npm run build:cli
./build/index.js build ...
```

### build-chain-configuration-reader dependency

The definition files are read thanks to [build-chain-configuration-reader](https://github.com/kiegroup/build-chain-configuration-reader) library so in case you want to modify something from there it's easier if you just [npm link](https://docs.npmjs.com/cli/link) it:

- clone repository and browse to the folder
- `npm install` it
- (`sudo`) `npm link`
- and then from this project folder execute `npm link @kie/build-chain-configuration-reader`

# System Requirements

* **Git** >=2.28
* **NodeJS** >= 14

