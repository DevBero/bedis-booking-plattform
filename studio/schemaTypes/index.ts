import { booking } from "./booking";
import { service } from "./service";
import { settings } from "./settings";
import { shift } from "./shift";

export const SINGLETONS = ["settings"];

export const schemaTypes = [shift, booking, service, settings];
