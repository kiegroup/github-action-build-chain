# Github Action Build Chain

## Testing

### Integration testing
In order to execute integration testing you just run `GITHUB_TOKEN=%TOKEN% URL=%GITHUB_EVENT_URL% yarn it` where:
* %TOKEN%: is your personal token, like `1e2ca1ac1252121d83fbe69ab3c4dd92bcb1ae32` 
* %GITHUB_EVENT_URL%: the url to your event to test, like `https://github.com/Ginxo/lienzo-core/pull/3`

So the final command would look like `GITHUB_TOKEN=1e2ca1ac1252121d83fbe69ab3c4dd92bcb1ae32 URL=https://github.com/Ginxo/lienzo-core/pull/3 yarn it`