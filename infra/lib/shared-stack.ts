import { Stack, type StackProps } from "aws-cdk-lib";
import { HostedZone, TxtRecord } from "aws-cdk-lib/aws-route53";
import { EmailIdentity, Identity } from "aws-cdk-lib/aws-ses";
import type { Construct } from "constructs";

interface SharedStackProps extends StackProps {
  zoneName: string;
}

// Resources both environments use: the SES identity of the domain (DKIM records go into Route 53 automatically),
// and a DMARC record. The cost alarm is not here: AWS::Budgets::Budget is unavailable in eu-north-1, so
// scripts/budget.sh creates it through the (global) Budgets API.
export class SharedStack extends Stack {
  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, props);
    const zone = HostedZone.fromLookup(this, "Zone", { domainName: props.zoneName });
    new EmailIdentity(this, "MailIdentity", { identity: Identity.publicHostedZone(zone) });

    // Monitoring only (p=none) until the mail setup of the salon is settled; tighten to quarantine later
    new TxtRecord(this, "Dmarc", { zone, recordName: `_dmarc.${props.zoneName}`, values: ["v=DMARC1; p=none"] });
  }
}
