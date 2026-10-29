// Everything that ties the code to the salon's accounts. Values marked TODO come from the manual steps in
// TICKET.md / docs/HOSTING.md; until they are filled in, cdk synth/deploy stops with a clear message.
export const PROJECT = "bedi";
export const STACK_PREFIX = "Bedi";
export const REGION = "eu-north-1";

// TODO(BD-201): domain of the salon, hosted zone in Route 53 of the project account
export const ZONE_NAME = "TODO-domain.de";

// TODO(BD-301): Sanity project ID (sanity.io/manage). Datasets "staging" and "production", both private.
export const SANITY_PROJECT_ID = "TODO";

// TODO(BD-204): GitHub OIDC subject in the immutable form repo:<owner>@<ownerId>/<repo>@<repoId>
// DevBero (125164459) / bedis-booking-plattform (1438327248), read via `gh api repos/DevBero/bedis-booking-plattform`
export const GITHUB_SUBJECT = "repo:DevBero@125164459/bedis-booking-plattform@1438327248";

// Developer mail: DMARC reports and fallback inbox while Studio → Einstellungen has no address yet
export const DEV_EMAIL = "berat.mov@gmail.com";

export const ENVIRONMENTS = {
  staging: {
    domainName: `staging.${ZONE_NAME}`,
    aliases: [] as string[],
    // TODO(BD-202): ACM certificate in us-east-1 for staging.<domain>
    certificateArn: "TODO",
    sanityDataset: "staging",
    // Confirmation mails to customers need SES production access (BD-701)
    customerMail: false,
  },
  production: {
    domainName: ZONE_NAME,
    aliases: [`www.${ZONE_NAME}`],
    // TODO(BD-202): ACM certificate in us-east-1 for <domain> and www.<domain>
    certificateArn: "TODO",
    sanityDataset: "production",
    customerMail: false,
  },
} as const;

export type EnvName = keyof typeof ENVIRONMENTS;

// Days after the appointment until a booking is deleted (docs/TECH.md §8). TODO(BD-603): agree with the owner.
export const RETENTION_DAYS = 30;
