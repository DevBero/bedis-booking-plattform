import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  HttpVersion,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { FunctionUrlOrigin, S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, CfnPermission, FunctionUrlAuthType, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { AaaaRecord, ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { PROJECT, RETENTION_DAYS } from "../config";

interface SiteStackProps extends StackProps {
  envName: string;
  zoneName: string;
  domainName: string;
  aliases: readonly string[];
  certificateArn: string;
  sanity: { projectId: string; dataset: string };
  telegramChatId: string;
}

// Booking page: own files only. The Next.js static export bootstraps with inline scripts; the page talks to its
// own /api/ ('self') and nothing else (no fonts, no tracking from third parties).
const SITE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Sanity Studio under /admin: talks to the Sanity API (HTTP + websocket for live updates), shows images from the
// Sanity CDN and login avatars (Google, GitHub, Gravatar). styled-components injects styles at runtime. The built
// index.html loads Sanity's bridge script (core.sanity-cdn.com) and the Inter font (studio-static.sanity.io).
function studioCsp(projectId: string) {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://core.sanity-cdn.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.sanity.io https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.gravatar.com",
    "font-src 'self' data: https://studio-static.sanity.io",
    `connect-src 'self' https://core.sanity-cdn.com https://${projectId}.api.sanity.io wss://${projectId}.api.sanity.io https://${projectId}.apicdn.sanity.io https://api.sanity.io https://cdn.sanity.io`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://api.sanity.io",
    "object-src 'none'",
  ].join("; ");
}

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);
    const { account, region } = Stack.of(this);
    const zone = HostedZone.fromLookup(this, "Zone", { domainName: props.zoneName });

    const bucket = new Bucket(this, "SiteBucket", {
      bucketName: `${PROJECT}-${props.envName}-site-${account}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // www -> apex; /admin/... is a single-page app with its own routing; /pfad -> /pfad/ -> /pfad/index.html
    const edgeRouter = new CloudFrontFunction(this, "EdgeRouter", {
      runtime: FunctionRuntime.JS_2_0,
      code: FunctionCode.fromInline(`
var CANONICAL_HOST = ${JSON.stringify(props.domainName)};

function redirect(location) {
  return { statusCode: 301, statusDescription: "Moved Permanently", headers: { location: { value: location } } };
}

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : CANONICAL_HOST;
  var uri = request.uri;
  var last = uri.split("/").pop();

  if (host !== CANONICAL_HOST) return redirect("https://" + CANONICAL_HOST + uri);
  if (uri === "/admin") return redirect("/admin/");
  if (uri.indexOf("/admin/") === 0) {
    if (last.indexOf(".") === -1) request.uri = "/admin/index.html";
    return request;
  }
  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (last.indexOf(".") === -1) {
    return redirect(uri + "/");
  }
  return request;
}
`),
    });

    const securityHeaders = (csp: string) => ({
      strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
      contentSecurityPolicy: { contentSecurityPolicy: csp, override: true },
      contentTypeOptions: { override: true },
      frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
      referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
    });
    // Internal tool: nothing on this domain may show up in search engines, also not files robots.txt cannot cover
    const noindex = { customHeaders: [{ header: "X-Robots-Tag", value: "noindex, nofollow", override: true }] };
    const siteHeaders = new ResponseHeadersPolicy(this, "SecurityHeaders", { securityHeadersBehavior: securityHeaders(SITE_CSP), customHeadersBehavior: noindex });
    const studioHeaders = new ResponseHeadersPolicy(this, "StudioHeaders", {
      securityHeadersBehavior: securityHeaders(studioCsp(props.sanity.projectId)),
      customHeadersBehavior: noindex,
    });

    // Rate limits, challenges, slot locks and monthly counters (infra/lambda/api/guard.ts); everything expires
    const table = new Table(this, "ApiTable", {
      partitionKey: { name: "pk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expires",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const tokenParam = `/${PROJECT}/sanity/token`;
    const api = new NodejsFunction(this, "Api", {
      entry: "infra/lambda/api/index.ts",
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(15),
      logGroup: new LogGroup(this, "ApiLogs", { retention: RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY }),
      environment: {
        TABLE_NAME: table.tableName,
        SANITY_PROJECT_ID: props.sanity.projectId,
        SANITY_DATASET: props.sanity.dataset,
        SANITY_TOKEN_PARAM: tokenParam,
        TELEGRAM_CHAT_ID: props.telegramChatId,
        TELEGRAM_TOKEN_PARAM: `/${PROJECT}/telegram/token`,
        RETENTION_DAYS: String(RETENTION_DAYS),
        // Salt for the IP hashes of the rate limit; not a secret, only keeps raw IPs out of the table
        IP_SALT: `${props.envName}-${account}`,
      },
      bundling: { minify: true, target: "node22" },
    });
    table.grantReadWriteData(api);
    api.addToRolePolicy(
      new PolicyStatement({ actions: ["ssm:GetParameter", "ssm:GetParameters"], resources: [`arn:aws:ssm:${region}:${account}:parameter/${PROJECT}/*`] }),
    );
    const apiUrl = api.addFunctionUrl({ authType: FunctionUrlAuthType.AWS_IAM });

    // Daily cleanup of old bookings and shifts (same function, event source aws.events), 03:00 UTC
    new Rule(this, "DailyCleanup", { schedule: Schedule.cron({ minute: "0", hour: "3" }), targets: [new LambdaFunction(api)] });

    const s3Origin = S3BucketOrigin.withOriginAccessControl(bucket);
    const distribution = new Distribution(this, "Distribution", {
      domainNames: [props.domainName, ...props.aliases],
      certificate: Certificate.fromCertificateArn(this, "Certificate", props.certificateArn),
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: HttpVersion.HTTP2_AND_3,
      // Europe and North America edge locations only, enough for a local salon and cheaper
      priceClass: PriceClass.PRICE_CLASS_100,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
        responseHeadersPolicy: siteHeaders,
        functionAssociations: [{ function: edgeRouter, eventType: FunctionEventType.VIEWER_REQUEST }],
      },
      additionalBehaviors: {
        "/admin/*": {
          origin: s3Origin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          compress: true,
          responseHeadersPolicy: studioHeaders,
          functionAssociations: [{ function: edgeRouter, eventType: FunctionEventType.VIEWER_REQUEST }],
        },
        "/api/*": {
          origin: FunctionUrlOrigin.withOriginAccessControl(apiUrl),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          // All viewer headers incl. CloudFront-Viewer-Address (the visitor IP for the rate limit), not Host
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: siteHeaders,
        },
      },
      // A private bucket answers 403 for missing files, so both map to the real 404 page
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 404,
        responsePagePath: "/404.html",
        ttl: Duration.minutes(5),
      })),
    });

    // Function URLs need lambda:InvokeFunction next to the lambda:InvokeFunctionUrl that the origin adds
    new CfnPermission(this, "ApiInvokeFromCloudFront", {
      action: "lambda:InvokeFunction",
      functionName: api.functionArn,
      principal: "cloudfront.amazonaws.com",
      sourceArn: `arn:aws:cloudfront::${account}:distribution/${distribution.distributionId}`,
    });

    const target = RecordTarget.fromAlias(new CloudFrontTarget(distribution));
    for (const name of [props.domainName, ...props.aliases]) {
      const recordId = name.replace(/\./g, "-");
      new ARecord(this, `A-${recordId}`, { zone, recordName: name, target });
      new AaaaRecord(this, `AAAA-${recordId}`, { zone, recordName: name, target });
    }

    // Read by scripts/deploy-site.sh
    new CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new CfnOutput(this, "DistributionId", { value: distribution.distributionId });
    new CfnOutput(this, "SiteUrl", { value: `https://${props.domainName}` });
  }
}
