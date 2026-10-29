import { App, Tags } from "aws-cdk-lib";
import { ENVIRONMENTS, GITHUB_SUBJECT, PROJECT, REGION, SANITY_PROJECT_ID, STACK_PREFIX, ZONE_NAME, type EnvName } from "../config";
import { GitHubStack } from "../lib/github-stack";
import { SharedStack } from "../lib/shared-stack";
import { SiteStack } from "../lib/site-stack";

// Everything in Stockholm: the organisation's SCP allows regional services only in eu-north-1. The CloudFront
// certificates therefore live in us-east-1 outside CDK and are referenced by ARN (docs/HOSTING.md).
const app = new App();
const envName = app.node.tryGetContext("env") as EnvName | undefined;
if (!envName || !(envName in ENVIRONMENTS)) {
  throw new Error(`Pass -c env=staging or -c env=production (got "${envName}")`);
}
const target = ENVIRONMENTS[envName];

const todo = [
  ZONE_NAME.startsWith("TODO") && "ZONE_NAME",
  SANITY_PROJECT_ID === "TODO" && "SANITY_PROJECT_ID",
  target.certificateArn === "TODO" && `certificateArn (${envName})`,
].filter(Boolean);
if (todo.length) throw new Error(`infra/config.ts is not filled in yet: ${todo.join(", ")} (see TICKET.md)`);

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION };

const site = new SiteStack(app, `${STACK_PREFIX}-Site-${envName}`, {
  env,
  envName,
  zoneName: ZONE_NAME,
  domainName: target.domainName,
  aliases: target.aliases,
  certificateArn: target.certificateArn,
  sanity: { projectId: SANITY_PROJECT_ID, dataset: target.sanityDataset },
  customerMail: target.customerMail,
});

// Shared by both environments (SES identity, cost alarm); deployed with either one (--all)
new SharedStack(app, `${STACK_PREFIX}-Shared`, { env, zoneName: ZONE_NAME });
new GitHubStack(app, `${STACK_PREFIX}-GitHub`, { env, subjectPrefix: GITHUB_SUBJECT });

Tags.of(app).add("Project", PROJECT);
Tags.of(site).add("Environment", envName);
