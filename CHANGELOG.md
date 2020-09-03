# Changelog

# V1.5 (next release)

Link

## Enhancements:

- To be able to define a dependency with a different flow file name
- To be able to define a dependency with a different job identifier

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
