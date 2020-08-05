# Github Action Build Chain

## How to add it to your project(s)

// TODO by https://issues.redhat.com/browse/BXMSPROD-913

## Docker build

You can build the `github-action-build-chain` image on your just executing

```
docker build .
```

In case you want to build it for a different openjdk version you just specify a `--build-arg OPENJDK_VERSION` argument

```
docker build --build-arg OPENJDK_VERSION=11 .
```

## Testing

### Unit testing

- **TEST_GITHUB_TOKEN** env variable is needed

### Integration testing

In order to execute integration testing you just run `env GITHUB_TOKEN=%TOKEN% URL=%GITHUB_EVENT_URL% ['parent-dependencies=%PARENT_DEPENDENCIES%'] ['child-dependencies=%CHILD_DEPENDENCIES%'] yarn it` where:

- %TOKEN%: is your personal token, like `1e2ca1ac1252121d83fbe69ab3c4dd92bcb1ae32`
- %GITHUB_EVENT_URL%: the url to your event to test, like `https://github.com/kiegroup/lienzo-core/pull/3`
- %PARENT_DEPENDENCIES%: the OPTIONAL comma separated parent project list
- %CHILD_DEPENDENCIES%: the OPTIONAL comma separated child project list

So the final command would look like `env GITHUB_TOKEN=3e6ce1ac1772121d83fbe69ab3c4dd92dad1ae40 URL=https://github.com/kiegroup/lienzo-core/pull/3 'parent-dependencies=lienzo-core,lienzo-tests' 'child-dependencies=appformer' yarn it`
