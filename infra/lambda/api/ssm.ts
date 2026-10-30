// Secrets from SSM Parameter Store (SecureString), fetched once per Lambda instance. A failed fetch is not cached,
// so a parameter created after the deploy is picked up on the next call.
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
const cache = new Map<string, Promise<string>>();

export function secret(name: string) {
  let value = cache.get(name);
  if (!value) {
    value = ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true })).then((r) => r.Parameter!.Value!);
    value.catch(() => cache.delete(name));
    cache.set(name, value);
  }
  return value;
}
