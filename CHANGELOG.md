# Changelog

# V2.3

## Enhancements:

- command line ready

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
