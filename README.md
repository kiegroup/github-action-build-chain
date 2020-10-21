# Github Action Build Chain

Github action build chain is a tool for github actions to build multiple projects from different repositories in a single action.
This tool is trying to solve the problem when a project depends on another project (most probably from the same organization) and one change can/should be performed in different repositories. How can we assure one specific pull request will work with the latest changes from/in the dependant/dependency projects and it won't break something? This is what we call **cross-repo pull requests** and **build-chain** is the way we have to solve it.

Let's consider you have a project hierarchy like:

![Project hierarchy](/docs/project-hierarchy.png)

and you want to upstream/downstream build whatever project from this hierarchy, **Github Action Build Chain** provides you the mechanism to easily do it.
You can check [Usage example](#usage-example).

Just defining the **build chain** flow in every project you want to trigger, the tool will get build information from `dependency-file` input and will execute every command from every project in a single github action.

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

- **definition-file** (mandatory): `path to the file in filesystem | URL to the file`

  > Example:
  >
  > ```
  > definition-file: './folder/whatever_definition_file.yaml'
  > definition-file: 'http://yourdomain.com/definition-file.yaml'
  > definition-file: 'https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/master/.ci/pull-request-config.yaml'
  > definition-file: 'https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/${BRANCH}/.ci/pull-request-config.yaml'
  > definition-file: 'https://raw.githubusercontent.com/${GROUP}/droolsjbpm-build-bootstrap/${BRANCH}/.ci/pull-request-config.yaml'
  > definition-file: 'https://raw.githubusercontent.com/${GROUP}/${PROJECT_NAME}/${BRANCH}/.ci/pull-request-config.yaml'
  > ```

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
    path2/output2/bin2/@sucess
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

It is possible to execute build-chain flow anywhere you want (just remember your machine would need to meet requirements to execute commands). In order to execute it locally (wherever) you just run `env GITHUB_TOKEN=%TOKEN% URL=%GITHUB_EVENT_URL% definition-file=%DEFINITION_FILE% yarn it` where:

- %TOKEN%: is your personal token, like `1e2ca1ac1252121d83fbe69ab3c4dd92bcb1ae32`.
- %GITHUB_EVENT_URL%: the url to your event to test, like `https://github.com/kiegroup/kogito-images/pull/220`.
- %DEFINITION_FILE%: The workflow definition file path, it can be a path in the filesystem or a URL to the file.

So the final command would look like
`env GITHUB_TOKEN=3e6ce1ac1772121d83fbe69ab3c4dd92dad1ae40 URL=https://github.com/kiegroup/lienzo-core/pull/3 definition-file=https://raw.githubusercontent.com/kiegroup/droolsjbpm-build-bootstrap/master/.ci/pull-request-config.yaml yarn it` or `npm run it` in case you prefer to use npm.

## Development

### build-chain-configuration-reader dependency

The definition files are read thanks to [build-chain-configuration-reader](https://github.com/kiegroup/build-chain-configuration-reader) library so in case you want to modify something from there it's easier if you just [npm link](https://docs.npmjs.com/cli/link) it:

- clone repo and browse to the folder
- `npm/yarn install` it
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
