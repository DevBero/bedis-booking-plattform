import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { Effect, PolicyStatement, Role, WebIdentityPrincipal } from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

interface GitHubStackProps extends StackProps {
  // OIDC subject prefix of the repository allowed to deploy. GitHub uses the immutable form with owner and
  // repository IDs (repos/<owner>/<repo>/actions/oidc/customization/sub), which survives renames.
  subjectPrefix: string;
}

// OIDC trust for GitHub Actions (docs/HOSTING.md Schritt 5): the workflow gets short-lived credentials
// for the role bedi-github-deploy, no access keys are stored in GitHub.
export class GitHubStack extends Stack {
  constructor(scope: Construct, id: string, props: GitHubStackProps) {
    super(scope, id, props);
    const account = Stack.of(this).account;

    // The beyou account already has the GitHub OIDC provider (stack BeyouWeb-GitHub); an account allows only one
    // per URL, so it is referenced, not created. The role name must not clash with that stack's github-deploy.
    const providerArn = `arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com`;

    const role = new Role(this, "DeployRole", {
      roleName: "bedi-github-deploy",
      description: `GitHub Actions deploys for ${props.subjectPrefix}`,
      assumedBy: new WebIdentityPrincipal(providerArn, {
        StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        StringLike: { "token.actions.githubusercontent.com:sub": `${props.subjectPrefix}:*` },
      }),
    });

    // cdk deploy runs through the bootstrap roles, which hold the actual CloudFormation permissions
    role.addToPolicy(new PolicyStatement({ actions: ["sts:AssumeRole"], resources: [`arn:aws:iam::${account}:role/cdk-*`] }));
    // deploy-site.sh: read stack outputs, upload, invalidate
    role.addToPolicy(new PolicyStatement({ actions: ["cloudformation:DescribeStacks"], resources: [`arn:aws:cloudformation:*:${account}:stack/Bedi-*/*`] }));
    role.addToPolicy(
      new PolicyStatement({
        actions: ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [`arn:aws:s3:::bedi-*-site-${account}`, `arn:aws:s3:::bedi-*-site-${account}/*`],
      }),
    );
    role.addToPolicy(new PolicyStatement({ effect: Effect.ALLOW, actions: ["cloudfront:CreateInvalidation"], resources: [`arn:aws:cloudfront::${account}:distribution/*`] }));

    // GitHub → Settings → Environments → variable AWS_DEPLOY_ROLE_ARN
    new CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
