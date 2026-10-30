// Everything that ties the code to the salon's accounts. Values marked TODO come from the manual steps in
// TICKET.md / docs/HOSTING.md; until they are filled in, cdk synth/deploy stops with a clear message.
export const PROJECT = "bedi";
export const STACK_PREFIX = "Bedi";
export const REGION = "eu-north-1";

// Hosted in the beyou account next to the be-you.pro website: the records go straight into its existing zone.
// Only one environment (production); everything else in that zone belongs to other projects, so never touch it.
export const ZONE_NAME = "be-you.pro";
export const DOMAIN = "bedis-hairsalon.be-you.pro";

// Sanity project "Bedis-hairsalon" (sanity.io/manage). Only the dataset "production", private.
export const SANITY_PROJECT_ID = "zpfep43i";

// TODO(BD-204): GitHub OIDC subject in the immutable form repo:<owner>@<ownerId>/<repo>@<repoId>
// DevBero (125164459) / bedis-booking-plattform (1438327248), read via `gh api repos/DevBero/bedis-booking-plattform`
export const GITHUB_SUBJECT = "repo:DevBero@125164459/bedis-booking-plattform@1438327248";

export const ENVIRONMENTS = {
  production: {
    domainName: DOMAIN,
    aliases: [] as string[],
    // TODO(BD-202): ACM certificate in us-east-1 for bedis-hairsalon.be-you.pro
    certificateArn: "TODO",
    sanityDataset: "production",
  },
} as const;

export type EnvName = keyof typeof ENVIRONMENTS;

// Days after the appointment until a booking is deleted (docs/TECH.md §8). TODO(BD-603): agree with the owner.
export const RETENTION_DAYS = 30;
