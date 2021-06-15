# Changelog

# V2.6 (next release)

## Enhancements:

- `@kie/build-chain-configuration-reader` upgraded to `2.2.0`
- definition version moved to 2.1
- targetExpression mapping
- branch flow from GA

## Bugs:
- windows error on joining folder https://github.com/kiegroup/github-action-build-chain/issues/153

# V2.5

## Enhancements:

- `custom-command-treatment` CLI option
- `@kie/build-chain-configuration-reader` upgraded to `2.0.4`
- error mapping branches solved
- allow to read definition files from private repositories
- pre/post sections

# V2.4

## Enhancements:

- `starting-project` input added
- env variables treated from commands
- export command treated
- token not mandatory

## Bugs:

- Error treating export commands like `export DROOLS_VERSION=mvn org.apache.maven.plugins:maven-help-plugin:evaluate -Dexpression=project.version | grep ^7` will execute `export DROOLS_VERSION=mvn org.apache.maven.plugins:maven-help-plugin:evaluate -Dexpression=project.version | grep ^7 -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B`. Fixed.

# V2.3

## Enhancements:

- token added to git commands to avoid private repositories problem from CLI execution
- clone option added

# V2.2

## Enhancements:

- command line ready
- full downstream flow added either for CLI and github action
- single flow added either for CLI and github action
- @kie/build-chain-configuration-reader dependency upgraded to ^2.0.2
- branch flow added for CLI
- skip build mechanism
- configuration file version <2.0 is no longer supported
- checkout mechanism improved

# V2.1

[Link](https://github.com/kiegroup/github-action-build-chain/releases/tag/v2.1)

## Enhancements:

- @kie/build-chain-configuration-reader dependency upgraded to ^0.0.6

# V2.0

[Link](https://github.com/kiegroup/github-action-build-chain/releases/tag/v2.0)

## Enhancements:

- artifacts in case of failure
- centralized flow definition file
- definition-file input added
- rest of inputs removed since they are not needed anymore
- default configuration for every project
- before and after commands added

# V1.4

[Link](https://github.com/kiegroup/github-action-build-chain/releases/tag/v1.4)

## Enhancements:

- archive-artifacts-dependencies
- checkout info summary

# V1.3

[Link](https://github.com/kiegroup/github-action-build-chain/releases/tag/v1.3)

## Bugs:

- `Cannot read property 'artifactItems' of undefined` error fixed

# V1.2

[Link](https://github.com/kiegroup/github-action-build-chain/releases/tag/v1.2)

## Bugs:

- Mapping error solved

# V1.1

[Link](https://github.com/kiegroup/github-action-build-chain/releases/tag/v1.1)

- Just contributors added

# V1.0

[Link](https://github.com/kiegroup/github-action-build-chain/releases/tag/v1.0)

Github action build chain is a tool for github actions to build multiple projects from different repositories in a single action. This tool is trying to solve the problem when a project depends on another project (most probably from the same organization) and one change can/should be performed in different repositories. How can we assure one specific pull request will work with the latest changes from/in the dependant/dependency projects and it won't break something? This is what we call cross-repo pull requests and build-chain is the way we have to solve it.

- archive artifacts mechanism
- pull request flow
- cross-repo checkout
