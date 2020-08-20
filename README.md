# Github Action Build Chain

Github action build chain is a tool for github actions to build multiple projects from different repositories in a single action. Let's consider you have a project hierarchy like:

![Project hierarchy](/docs/project-hierarchy.png)

and you want to upstream/downstream build whatever project from this hierarchy, **Github Action Build Chain** provides you the mechanism to easily do it.
You can check [Usage example](#usage-example).

Just defining the **build chain** flow in every project from the chain, the tool will get meta-info from them and will compose but a chain build means for you and will execute in a single github action.

## How to add it to your project(s)

It is just to add the step (replacing dependencies and commands):

```
- name: Build Chain
      id: build-chain
      uses: kiegroup/github-action-build-chain
      with:
        parent-dependencies: 'projectA,projectB'
        child-dependencies: 'projectC,projectD'
        build-command: 'mvn whatever goals'
        build-command-upstream: 'mvn whatever goals'
        workflow-file-name: "whatever_flow.yml"
```

to your existing yaml flow definition or to create a new one. Do the same for the rest of the projects you need. The `@actions/checkout` step is not needed since is the tool the one which is going to handle what to checkout for every project in the chain.

## With Fields

- **parent-dependencies** (optional): `[group/]projectName[@branchSource:branchTarget]` The parent projects dependencies separated by commas. They are basically the projects to depend on.
  - `group/`: (optional) The github group where the project is, otherwise it will be taken from same group.
  - `projectName`: (mandatory) The project name.
  - `@branchSource:branchTarget`: (optional) It is possible to map branches for projects. `projectx@master:7.x` would map whatever pull request is performed for `master` branch to `projectX:7.x`.

> Example:
>
> ```
> parent-dependencies: 'projectA'
> parent-dependencies: 'projectA,groupX/projectB,projectC@master:7.x,groupy/projectD@8.0.0:9.0.1'
> ```

- **child-dependencies** (optional): `[group/]projectName[@branchSource:branchTarget]` The child projects dependencies separated by commas. Those projects depend on the current project.
  - `group/`: (optional) The github group where the project is, otherwise it will be taken from the same group.
  - `projectName`: (mandatory) The project name.
  - `@branchSource:branchTarget`: (optional) It is possible to map branches for projects. `projectx@master:7.x` would map whatever pull request is performed for `master` branch to `projectX:7.x`.

> Examples:
>
> ```
> child-dependencies: 'projectA'
> child-dependencies: 'projectA,groupX/projectB,projectC@master:7.x,groupy/projectD@8.0.0:9.0.1'
> ```

- **build-command** (required): `command1[|command2|command3]` The command(s) to build.

  > Example:
  >
  > ```
  > build-command: 'mvn clean install'
  > build-command: 'mvn clean install|mvn -e -nsu -Dfull -Pwildfly clean install -Prun-code-coverage  -Dcontainer.profile=wildfly -Dcontainer=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -DjvmArgs="-Xms1g -Xmx4g"'
  > ```

- **build-command-upstream** (optional): `command1[|command2|command3]` The command(s) to build in case the project is built by a child project. If it's not defined `build-command` will be taken.

  > Example:
  >
  > ```
  > build-command: 'mvn clean install'
  > build-command: 'mvn clean install|mvn -e -nsu -Dfull -Pwildfly clean install -Prun-code-coverage  -Dcontainer.profile=wildfly -Dcontainer=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -DjvmArgs="-Xms1g -Xmx4g"'
  > ```

- **workflow-file-name** (required): `file_name.yml` You to define which workflow file name will be taken from the rest of the projects to get metainfo. _This is the most embarrassing field we have here :pensive:. It's due to github does not provide filename in case the `name` is defined for the flow. The information is stored in `GITHUB_WORKFLOW` environment variable but it's overridden in case you define a name for it (which is the most common thing). It is better explained in [workflow-file-name section](#workflow-file-name)_.

  > Example:
  >
  > ```
  > build-command: 'mvn clean install'
  > build-command: 'mvn clean install|mvn -e -nsu -Dfull -Pwildfly clean install -Prun-code-coverage  -Dcontainer.profile=wildfly -Dcontainer=wildfly -Dintegration-tests=true -Dmaven.test.failure.ignore=true -DjvmArgs="-Xms1g -Xmx4g"'
  > build-command: 'sh scripts/prepare_environment_build_images.sh | mkdir -p ${{ matrix.images }} | rsync -av --progress . ${{ matrix.images }} --exclude workspaces | make ${{ matrix.images }} ignore_test=true cekit_option="--work-dir ." | make ${{ matrix.images }} ignore_build=true cekit_option="--work-dir ."'
  > ```

- **matrix-variables** (optional): `key:${{ flowvariable1 }}[,key2:${{ flowvariable2 }},matrix.variable:${{ matrix.variable }}]` define it in case you use matrix variables in your with parameters.

  > Example:
  >
  > ```
  > build-command: 'mkdir -p ${{ matrix.images }} | rsync -av --progress . ${{ matrix.os }}'
  > matrix-variables: "matrix.images:${{ matrix.images }}, matrix.os:${{ matrix.os }}"
  > ```

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

**Project A**

```
name: Build Chain

on: [pull_request]

jobs:
  build-chain-openjdk8:
    runs-on: ubuntu-latest
    name: Pull Request openjdk8
    steps:
    - name: Set up JDK 1.8
      uses: actions/setup-java@v1
      with:
        java-version: 1.8
    - name: Build Chain
      id: build-chain
      uses: kiegroup/github-action-build-chain
      with:
        child-dependencies: 'projectC,projectD'
        build-command: 'mvn whatever goals'
        build-command-upstream: 'mvn whatever goals'
        workflow-file-name: "whatever_flow.yml"
```

**Project B**

```
name: Build Chain

on: [pull_request]

jobs:
  build-chain-openjdk8:
    runs-on: ubuntu-latest
    name: Pull Request openjdk8
    steps:
    - name: Set up JDK 1.8
      uses: actions/setup-java@v1
      with:
        java-version: 1.8
    - name: Build Chain
      id: build-chain
      uses: kiegroup/github-action-build-chain
      with:
        child-dependencies: 'projectD'
        build-command: 'mvn whatever goals'
        build-command-upstream: 'mvn whatever goals'
        workflow-file-name: "whatever_flow.yml"
```

**Project C**

```
name: Build Chain

on: [pull_request]

jobs:
  build-chain-openjdk8:
    runs-on: ubuntu-latest
    name: Pull Request openjdk8
    steps:
    - name: Set up JDK 1.8
      uses: actions/setup-java@v1
      with:
        java-version: 1.8
    - name: Build Chain
      id: build-chain
      uses: kiegroup/github-action-build-chain
      with:
        parent-dependencies: 'projectD'
        build-command: 'mvn whatever goals'
        build-command-upstream: 'mvn whatever goals'
        workflow-file-name: "whatever_flow.yml"
```

**Project D**

```
name: Build Chain

on: [pull_request]

jobs:
  build-chain-openjdk8:
    runs-on: ubuntu-latest
    name: Pull Request openjdk8
    steps:
    - name: Set up JDK 1.8
      uses: actions/setup-java@v1
      with:
        java-version: 1.8
    - name: Build Chain
      id: build-chain
      uses: kiegroup/github-action-build-chain
      with:
        parent-dependencies: 'projectA,projectB'
        child-dependencies: 'projectE'
        build-command: 'mvn whatever goals'
        build-command-upstream: 'mvn whatever goals'
        workflow-file-name: "whatever_flow.yml"
```

**Project E**

```
name: Build Chain

on: [pull_request]

jobs:
  build-chain-openjdk8:
    runs-on: ubuntu-latest
    name: Pull Request openjdk8
    steps:
    - name: Set up JDK 1.8
      uses: actions/setup-java@v1
      with:
        java-version: 1.8
    - name: Build Chain
      id: build-chain
      uses: kiegroup/github-action-build-chain
      with:
        parent-dependencies: 'projectD'
        build-command: 'mvn whatever goals'
        build-command-upstream: 'mvn whatever goals'
        workflow-file-name: "whatever_flow.yml"
```

## Docker build

You can build the `github-action-build-chain` image locally with just executing docker command:

```
docker build .
```

In case you want to build it for a different openjdk version you just specify a `--build-arg OPENJDK_VERSION` argument:

```
docker build --build-arg OPENJDK_VERSION=11 .
```

## Testing

### Unit testing

- **TEST_GITHUB_TOKEN** env variable is needed.

### Integration testing

In order to execute integration testing you just run `env GITHUB_TOKEN=%TOKEN% URL=%GITHUB_EVENT_URL% workflow-file-name=%WORKFLOW_FILE_NAME% GITHUB_JOB='%GITHUB_JOB%' yarn it` where:

- %TOKEN%: is your personal token, like `1e2ca1ac1252121d83fbe69ab3c4dd92bcb1ae32`.
- %GITHUB_EVENT_URL%: the url to your event to test, like `https://github.com/kiegroup/kogito-images/pull/220`.
- %WORKFLOW_FILE_NAME%: the workflow file name located in `.github/workflows` folder, like `build_images.yml`.
- %GITHUB_JOB%: the job id from the `%WORKFLOW_FILE_NAME%` to execute.

So the final command would look like
`env GITHUB_TOKEN=3e6ce1ac1772121d83fbe69ab3c4dd92dad1ae40 URL=https://github.com/kiegroup/lienzo-core/pull/3 'parent-dependencies=lienzo-core,lienzo-tests' 'child-dependencies=appformer' yarn it`.

## Github limitations

### workflow-file-name

You are probably wondering why the input field `workflow-file-name` even exists. Why don't we take the filename directly from the job and keep the same name for all the flow files in the chain?. Well, we can in case the `name` is not defined in the flow, then the file name information can be taken from `GITHUB_WORKFLOW` environment variable but in case the name is set, `GITHUB_WORKFLOW` becomes the name and there's no other way to get filename from the tool.
This is a github action limitation already reported as a suggestion to provide file name from the flow triggering the job.

### inputs usage in runs.image from action.yml

> Just in case you are interested in adapting this code or in case you want to create your own tool.

It's not possible to use expressions like `image: "docker://kie-group:github-action-build-chain:{{ inputs.build-chain-build-system }}"`. This way it would be easy to dynamically select image to run with a simple `with` input from flow yml file and we could skip errors like [matrix in uses](#matrix-in-uses).
Just because of this we have to maintain different Dockerfile definitions in different branches and to tag every branch for every version we release like `python3-cekit-v1`.
