import "reflect-metadata";
import { CLIRunner } from "@bc/bin/runners/cli-runner";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { FlowType } from "@bc/domain/inputs";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { Resume } from "@bc/service/tools/resume";
import fs from "fs-extra";
import { PlatformType } from "@kie/build-chain-configuration-reader";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { FlowService } from "@bc/service/flow/flow-service";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { CLIConfiguration } from "@bc/service/config/cli-configuration";
import path from "path";

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
jest.spyOn(global.console, "log");

let resume: Resume;
beforeEach(() => {
  resume = new Resume();
});

test("execute", async () => {
  jest.spyOn(fs, "readFileSync").mockReturnValue(
    JSON.stringify({
      configurationService: {
        configuration: {
          _gitEventData: {
            base: {
              repo: {
                full_name: "test"
              }
            }
          },
          _gitConfiguration: {},
          _sourceProject: {},
          _targetProject: {},
          _parsedInputs: {
            CLISubCommand: FlowType.BRANCH,
          },
          _defaultPlatform: PlatformType.GITLAB,
        },
        _nodeChain: [{ project: "test" }],
        _definitionFile: {
          version: 2.3,
          build: [],
        },
      },
      checkoutService: [
        {
          node: { project: "test" },
          checkoutInfo: { merge: false },
          checkedOut: true,
        },
      ],
      flowService: [
        [
          {
            node: {
              project: "test",
            },
            executeCommandResults: [
              {
                command: "false",
                result: ExecutionResult.OK,
                errorMessage: "",
              },
            ],
          },
          {
            node: {
              project: "test",
            },
            executeCommandResults: [
              {
                command: "false",
                result: ExecutionResult.OK,
                errorMessage: "",
              },
            ],
          },
          {
            node: {
              project: "test",
            },
            executeCommandResults: [
              {
                command: "false",
                result: ExecutionResult.OK,
                errorMessage: "",
              },
            ],
          },
        ],
      ],
    })
  );

  jest.spyOn(CLIConfiguration.prototype, "loadToken").mockImplementation(() => undefined);

  const cliSpy = jest
    .spyOn(CLIRunner.prototype, "execute")
    .mockImplementation(async () => undefined);

  delete process.env["GITHUB_REPOSITORY"];

  await resume.execute();

  expect(cliSpy).toHaveBeenCalledTimes(1);

  const configService = Container.get(ConfigurationService);
  expect(configService.init()).resolves.toBe(undefined);
  // test whether deserialization worked
  expect(configService.getFlowType()).toBe(FlowType.BRANCH);
  expect(configService.getRootFolder()).toBe(process.cwd());

  const checkoutService = Container.get(CheckoutService);
  expect(checkoutService.checkoutDefinitionTree()).resolves.toMatchObject([
    {
      node: { project: "test" },
      checkoutInfo: { merge: false, repoDir: path.join(process.cwd(), "test") },
    }
  ]);

  const flowService = Container.get(FlowService);
  expect(flowService.run()).resolves.toMatchObject({
    executionResult: [
      [
        {
          node: {
            project: "test",
          },
          executeCommandResults: [
            {
              command: "false",
              result: ExecutionResult.OK,
              errorMessage: "",
            },
          ],
        },
        {
          node: {
            project: "test",
          },
          executeCommandResults: [
            {
              command: "false",
              result: ExecutionResult.OK,
              errorMessage: "",
            },
          ],
        },
        {
          node: {
            project: "test",
          },
          executeCommandResults: [
            {
              command: "false",
              result: ExecutionResult.OK,
              errorMessage: "",
            },
          ],
        },
      ],
    ],
  });

  const args = Container.get(CLIArguments);
  expect(args.getCommand().parse()).toBe(undefined);
});
