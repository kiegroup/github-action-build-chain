# Github Action Build Chain

Github action build chain is a tool for github actions to build multiple projects from different repositories in a single action.
This tool is trying to solve the problem when a project depends on another project (most probably from the same organization) and one change can/should be performed in different repositories. How can we assure one specific pull request will work with the latest changes from/in the dependant/dependency projects and it won't break something? This is what we call **cross-repo pull requests** and **build-chain** is the way we have to solve it.

Let's consider you have a project hierarchy like:

![Project hierarchy](/docs/project-hierarchy.png)

and you want to upstream/downstream build whatever project from this hierarchy, **Github Action Build Chain** provides you the mechanism to easily do it.
You can check [Usage example](#usage-example).

Just defining the **build chain** flow in every project you want to trigger, the tool will get build information from `dependency-file` input and will execute every command from every project in a single github action.

## Allowed configuration files versions

- 2.1

## Build Chain Flows

### Pull request flow

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

### Single flow

- It checks out the current project and reads the workflow information from the YAML file triggering the job.

  - It merges the TARGET_GROUP:PROJECT:TARGET_BRANCH into the SOURCE_GROUP:PROJECT:SOURCE_BRANCH from the pull request triggering the job.
    > **_Warning:_** It will fail in case it can't be done automatically, properly informing to please resolve conflicts.

- Once the project from the event is checked out, it will run as many commands are defined in `before`, `after` or root level properties from `build` section.

- It will archive artifacts in case `archive-artifacts-path` input is defined.

### Branch flow

- It checks out the whole tree from the `starting-project` project input and reads the workflow information from the YAML file triggering the job.

- Once the projects from the branch are checked out, it will run as many commands are defined in `before`, `after` or root level properties from `build` section.

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

- **flow-type** (optional. 'pull-request' by default): The flow you want to execute. Possible values

  - pull-request: executes the pull reques flow
  - fdb: executes the full downstream flow
  - branch: executes the tool for a specific branch
  - single: executes the tool for a single project

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
  > annotations-prefix: "Graddle Version ${{ matrix.gradle-version }}"
  > annotations-prefix: "OS ${{ matrix.os }}"
  > ```

- **additional-flags** (optional. '' by default): The chance to define additional flags for the execution, as it is done on the CLI side. Just semicolon (;) separated, like '--skipParallelCheckout;--skipExecution;-cct (mvn .\*)||\$1 -s settings.xml'.

  > ```
  > additional-flags: "--fullDownstream"
  > additional-flags: "--fullDownstream;--skipParallelCheckout"
  > additional-flags: "--skipParallelCheckout; --fullDownstream"
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

The archive artifacts algorithm is basically copied from [actions/upload-artifact project](https://github.com/actions/upload-artifact) and (manually) transpile to javascript. The usage is basically the same (the inputs are different named adding `archive-artifacts` prefix and the [Conditional Artifact Upload](https://github.com/actions/upload-artifact#conditional-artifact-upload) is not enabled), so why do we include this `archive artifacts` mechanism in this tool if it's already implemented by another tool? well, because this treats the archive artifacts mechanism for the whole build chain, so in case you define an `archive-artifacts-path` in a different project from the chain, all of them will be uploaded. If you are wondering if you are able to use `actions/upload-artifact` instead of the one we propose, the answer is 'yes', just take into consideration the artifacts will be archived based on the definition from the project triggering the job.

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

The [@actions/artifact](https://github.com/actions/toolkit/tree/main/packages/artifact) package is used internally to handle most of the logic around uploading an artifact. There is extra documentation around upload limitations and behavior in the toolkit repo that is worth checking out.

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
- `all` all artifacts from its dependencies will be uploaded, dependending on what the dependencies define.
- `list of projects` define which of the projects in the chain will be treated to upload artifacts, dependending on what the dependencies define.

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

# Limitations

### Zipped Artifact Downloads

During a workflow run, files are uploaded and downloaded indivdually using the `upload-artifact` and `download-artifact` actions. However, when a workflow run finishes and an artifact is downloaded from either the UI or through the [download api](https://developer.github.com/v3/actions/artifacts/#download-an-artifact), a zip is dynamically created with all the file contents that were uploaded. There is currently no way to download artifacts after a workflow run finishes in a format other than a zip or to download artifact contents individually. One of the consequences of this limitation is that if a zip is uploaded during a workflow run and then downloaded from the UI, there will be a double zip created.

### Permission Loss

:exclamation: File permissions are not maintained during artifact upload :exclamation: For example, if you make a file executable using `chmod` and then upload that file, post-download the file is no longer guaranteed to be set as an executable.

### Case Insensitive Uploads

:exclamation: File uploads are case insensitive :exclamation: If you upload `A.txt` and `a.txt` with the same root path, only a single file will be saved and available during download.

## Execution environment

The environment execution definition is part of the worklfow (the `.yml` file) and it depends on the commands you require to execute. If you require to execute maven commands you will have to add the `actions/setup-java@v1` with its java version, or in case you need python commands `actions/setup-python` is the one. You can find differente examples in https://github.com/YOURGROUP/YOURPROJECT/actions/new.

It could be the case where you require a very specific environment to execute your stuff as it is the case for [python3-cekit](https://github.com/kiegroup/github-action-build-chain/tree/python3-cekit). Feel free to propose the environment you need as a pull request to this project:

- Create a branch based on `python3-cekit` one
- Modify [the Dockerfile from there](https://github.com/kiegroup/github-action-build-chain/blob/python3-cekit/Dockerfile)

Current environments:

- **python3-cekit**: python3 + python cekit library + docker + nodejs + yarn latest stable release [Dockerfile](https://github.com/kiegroup/github-action-build-chain/blob/python3-cekit/Dockerfile)

## Usage example

Considering the projects hierarchy:

![Project hierarchy](/docs/project-hierarchy.png)

You can check how to define build definition files from [Build Chain Configuration Reader documentation](https://github.com/kiegroup/build-chain-configuration-reader)

// TO BE DOCUMENTED

## Docker build

You can build the `github-action-build-chain` image locally with just executing docker command:

```
docker build .
```

In case you want to build it for a different openjdk version you just specify a `--build-arg OPENJDK_VERSION` argument:

```
docker build --build-arg OPENJDK_VERSION=11 .
```

## Execution

It is possible to execute build-chain flow anywhere you want (just remember your machine would need to meet requirements to execute commands). In order to execute it locally (wherever) you just run `env GITHUB_TOKEN=%TOKEN% ./bin/build-chain-cli.js -df %DEFINITION_FILE% -url %GITHUB_EVENT_URL%` where:

- %TOKEN%: is your personal token, like `1e2ca1ac1252121d83fbe69ab3c4dd92bcb1ae32`.
- %GITHUB_EVENT_URL%: the url to your event to test, like `https://github.com/kiegroup/kogito-images/pull/220`.
- %DEFINITION_FILE%: The workflow definition file path, it can be a path in the filesystem or a URL to the file.

So the final command would look like `env GITHUB_TOKEN=3e6ce1ac1772121d83fbe69ab3c4dd92dad1ae40 ./bin/build-chain-cli.js -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build pr -url https://github.com/kiegroup/lienzo-core/pull/3`.

### Local execution

It's possible to use this tool locally, just follow this steps

```
(sudo) npm install -g @kie/build-chain-action
(env GITHUB_TOKEN=3e6ce1ac1772121d83fbe69ab3c4dd92dad1ae40) build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build pr -url https://github.com/kiegroup/lienzo-core/pull/3
```

either `sudo` and `env GITHUB_TOKEN=...` are optional depending on your local setup.

> Keep in mind: Whenever the tool is executed from a github check run, the `Printing local execution command` section is printed with the exact command you could copy/paste in order to reproduce it locally.

**Arguments**

- **\*-df**: the definition file, either a path to the filesystem o a URL to it. `-df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml`
- **actions**: The action to execute. Possible values `build`, `tools`
  - **build**: See [Build Action](#execution-build-action)
  - **tools**: See [Tools Action](#execution-tools-action)
- **-folder** (default: `build_chain_%TIMESTAMP%`): The folder path to store projects.

#### Execution Build Action

To choose between `pr`, `fd` or `single`

##### Execution Build Action - Pull Request

**Arguments**:

- **\*-url**: the event URL. Pull Request URL for instance `-url https://github.com/kiegroup/droolsjbpm-build-bootstrap/pull/1489`
- **-cct**: You can define a custom command treatment expression. See [Custom Command Replacement](#custom-command-replacement)
- **-spc**: a list of projects to skip checkout. Something like `-spc 'kiegroup/appformer=./' 'kiegroup/drools=/folderX' `
- **skipParallelCheckout**: Checkout the project sequencially.
- **-sp**: The project to start the build from. Something like `-sp=kiegroup/appformer`.
- **--skipExecution**: A flag to skip execution and artifacts archiving, no matter what's defined in "definition file" or in `--command` argument. E.g. `--skipExecution`
- **--skipCheckout**: A flag to skip project checkout. No `git clone/checkout` command will be executed, checout information will be printed anyway. E.g. `--skipCheckout`

Examples:

```
build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build pr -url https://github.com/kiegroup/kie-wb-distributions/pull/1068
```

##### Execution Build Action - Full Downstream Build

**Arguments**:

- **\*-url**: the event URL. Pull Request URL for instance `-url https://github.com/kiegroup/droolsjbpm-build-bootstrap/pull/1489`
- **-cct**: You can define a custom command treatment expression. See [Custom Command Replacement](#custom-command-replacement)
- **-spc**: a list of projects to skip checkout. Something like `-spc 'kiegroup/appformer=./' 'kiegroup/drools=/folderX' `
- **skipParallelCheckout**: Checkout the project sequencially.
- **-sp**: The project to start the build from. Something like `-sp=kiegroup/appformer`.
- **--skipExecution**: A flag to skip execution and artifacts archiving, no matter what's defined in "definition file" or in `--command` argument. E.g. `--skipExecution`
- **--skipCheckout**: A flag to skip project checkout. No `git clone/checkout` command will be executed, checout information will be printed anyway. E.g. `--skipCheckout`

Examples:

```
build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build fdb -url https://github.com/kiegroup/kie-wb-distributions/pull/1068
```

##### Execution Build Action - Single Build

**Arguments**:

- **\*-url**: the event URL. Pull Request URL for instance `-url https://github.com/kiegroup/droolsjbpm-build-bootstrap/pull/1489`
- **-cct**: You can define a custom command treatment expression. See [Custom Command Replacement](#custom-command-replacement)
- **-spc**: a list of projects to skip checkout. Something like `-spc 'kiegroup/appformer=./' 'kiegroup/drools=/folderX' `
- **skipParallelCheckout**: Checkout the project sequencially.
- **-sp**: The project to start the build from. Something like `-sp=kiegroup/appformer`.
- **--skipExecution**: A flag to skip execution and artifacts archiving, no matter what's defined in "definition file" or in `--command` argument. E.g. `--skipExecution`
- **--skipCheckout**: A flag to skip project checkout. No `git clone/checkout` command will be executed, checout information will be printed anyway. E.g. `--skipCheckout`

Examples:

```
build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build single -url https://github.com/kiegroup/kie-wb-distributions/pull/1068
```

##### Execution Build Action - Branch flow arguments

**Arguments**:

- **\*-p, -project**: The project name to execute flow from. It has to match with one defined in "definition-file". E.g. `-p=kiegroup/drools`
- **\*-b, -branch**: The branch to get projects. E.g. `-b=main`
- **-g** (group from project argument): The group to take projects. In case you want to build projects from a different group than the one defined in "definition file". E.g. `-g=Ginxo`
- **-c, -command**: A command to execute for all the projects, no matter what's defined in "definition file". E.g. `-c="mvn clean"`
- **-cct**: You can define a custom command treatment expression. See [Custom Command Replacement](#custom-command-replacement)
- **-spc**: a list of projects to skip checkout. Something like `-spc 'kiegroup/appformer=./' 'kiegroup/drools=/folderX' `
- **skipParallelCheckout**: Checkout the project sequencially.
- **-sp**: The project to start the build from. Something like `-sp=kiegroup/appformer`.
- **--skipExecution**: A flag to skip execution and artifacts archiving, no matter what's defined in "definition file" or in `--command` argument. E.g. `--skipExecution`
- **--skipCheckout**: A flag to skip project checkout. No `git clone/checkout` command will be executed, checout information will be printed anyway. E.g. `--skipCheckout`
- **--fullDownstream**: Checks out and execute the whole tree instead of the upstream build. It mocks a full downstream execution but for a branch execution. (fasle by default). E.g. `--fullDownstream`

Examples:

```
build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build branch -url https://github.com/kiegroup/kie-wb-distributions/pull/1068

build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build branch -p=kiegroup/lienzo-tests -b=main

build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml build branch -p=kiegroup/optaplanner -b=7.x -folder=myfolder
```

#### Execution Tools Action

Additionally the tool provides several useful tools

##### Execution Tools Action - Project List

Examples:

```
build-chain-action -df https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/main/.ci/pull-request-config.yaml tools project-list
```

#### Custom Command Replacement

It is possible to define custom expression to replace commands. The expression structure is `RegEx||ReplacementEx` where:

- `RegEx`: you can define regular expression with or without literals. See [Javascript RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- `||` just split `RegEx` from `ReplacementEx`
- `ReplacementEx`: See [Javascript String replacement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)

So basically at left side of `||` you define the regular expression where you want to apply string replacement from right side. For example, considering command `mvn clean install` in case we apply `(^mvn .*)||$1 -s ~/.m2/settings.xml` the final command will be `mvn clean install -s ~/.m2/settings.xml`

## Development

### build-chain-configuration-reader dependency

The definition files are read thanks to [build-chain-configuration-reader](https://github.com/kiegroup/build-chain-configuration-reader) library so in case you want to modify something from there it's easier if you just [npm link](https://docs.npmjs.com/cli/link) it:

- clone repo and browse to the folder
- `npm install` it
- (`sudo`) `npm link`
- and then from this project folder execute `npm link @kie/build-chain-configuration-reader`

## Github limitations

### inputs usage in runs.image from action.yml

> Just in case you are interested in adapting this code or in case you want to create your own tool.

It's not possible to use expressions like `image: "docker://kie-group:github-action-build-chain:{{ inputs.build-chain-build-system }}"`. This way it would be easy to dynamically select image to run with a simple `with` input from flow yml file and we could skip errors like [matrix in uses](#matrix-in-uses).
Just because of this we have to maintain different Dockerfile definitions in different branches and to tag every branch for every version we release like `python3-cekit-v1`.

### Contributors

<table>
<tr>
    <td align="center">
        <a href=https://github.com/ginxo>
            <img src=https://avatars2.githubusercontent.com/u/25130444?v=4 width="100;" style="border-radius:50%;align-items:center;justify-content:center;overflow:hidden;" alt=Ginxo/>
            <br />
            <sub style="font-size:14px"><b>Ginxo</b></sub>
        </a>
    </td>
</tr>
</table>
