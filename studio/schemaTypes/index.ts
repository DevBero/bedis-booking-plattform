import { block } from "./block";
import { booking } from "./booking";
import { closure } from "./closure";
import { openingHours } from "./openingHours";
import { service } from "./service";
import { settings } from "./settings";

export const SINGLETONS = ["settings", "openingHours"];

export const schemaTypes = [booking, block, service, openingHours, closure, settings];
