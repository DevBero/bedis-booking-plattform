// "Kalender": the next days side by side, bookings and blocks per day in time order. Read-only overview; a tap
// opens the appointment in the normal editor. Live updates through the Sanity listener.
import { CalendarIcon } from "@sanity/icons/Calendar";
import { ChevronLeftIcon } from "@sanity/icons/ChevronLeft";
import { ChevronRightIcon } from "@sanity/icons/ChevronRight";
import { Badge, Box, Button, Card, Flex, Grid, Spinner, Stack, Text } from "@sanity/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { definePlugin, useClient } from "sanity";
import { IntentLink } from "sanity/router";

const DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const HEAD = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

interface Entry {
  _id: string;
  _type: "booking" | "block";
  start: string;
  end: string;
  label: string;
  service?: string;
  phone?: string;
  status?: string;
}

const QUERY = `*[
  ((_type == "booking" && status != "cancelled") || _type == "block")
  && !(_id in path("drafts.**"))
  && dateTime(start) >= dateTime($from) && dateTime(start) < dateTime($to)
] | order(start asc) {
  _id, _type, start, status, phone,
  "end": coalesce(end, string(dateTime(start) + coalesce(service->duration, 30) * 60)),
  "label": coalesce(customerName, reason, "Blockzeit"),
  "service": service->name
}`;

function startOfDay(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function CalendarView() {
  const client = useClient({ apiVersion: "2025-02-19" });
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const from = useMemo(() => startOfDay(offset), [offset]);
  const to = useMemo(() => new Date(from.getTime() + DAYS * DAY_MS + 2 * 60 * 60 * 1000), [from]);

  const load = useCallback(() => {
    client.fetch<Entry[]>(QUERY, { from: from.toISOString(), to: to.toISOString() }).then(setEntries, () => setEntries([]));
  }, [client, from, to]);

  useEffect(() => {
    setEntries(null);
    load();
    const sub = client.listen(`*[_type in ["booking", "block"]]`, {}, { visibility: "query" }).subscribe(() => load());
    return () => sub.unsubscribe();
  }, [client, load]);

  const days = Array.from({ length: DAYS }, (_, i) => startOfDay(offset + i));
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  return (
    <Box padding={[3, 4]} style={{ overflow: "auto", height: "100%" }}>
      <Flex align="center" gap={2} marginBottom={4} wrap="wrap">
        <Button icon={ChevronLeftIcon} mode="ghost" onClick={() => setOffset((o) => o - DAYS)} aria-label="Vorherige Woche" />
        <Button text="Heute" mode="ghost" onClick={() => setOffset(0)} />
        <Button icon={ChevronRightIcon} mode="ghost" onClick={() => setOffset((o) => o + DAYS)} aria-label="Nächste Woche" />
        <Text size={2} weight="semibold">
          {HEAD.format(days[0])} – {HEAD.format(days[DAYS - 1])}
        </Text>
        {entries === null && <Spinner muted />}
      </Flex>
      <Grid gridTemplateColumns={[1, 2, 4, 7]} gap={3}>
        {days.map((day) => {
          const list = (entries ?? []).filter((e) => sameDay(new Date(e.start), day));
          const today = sameDay(day, new Date());
          return (
            <Card key={day.toISOString()} padding={3} radius={2} tone={today ? "primary" : "default"} border>
              <Stack gap={3}>
                <Text size={1} weight="semibold">
                  {HEAD.format(day)}
                </Text>
                {list.length === 0 && (
                  <Text size={1} muted>
                    Keine Termine
                  </Text>
                )}
                {list.map((e) => (
                  <Card
                    key={e._id}
                    as={IntentLink}
                    intent="edit"
                    params={{ id: e._id, type: e._type }}
                    padding={2}
                    radius={2}
                    tone={e._type === "block" ? "caution" : e.status === "noshow" ? "critical" : "positive"}
                    style={{ textDecoration: "none" }}
                  >
                    <Stack gap={2}>
                      <Text size={1} weight="semibold">
                        {TIME.format(new Date(e.start))}–{TIME.format(new Date(e.end))}
                      </Text>
                      <Text size={1}>{e.label}</Text>
                      {e.service && (
                        <Text size={0} muted>
                          {e.service}
                        </Text>
                      )}
                      {e.status === "noshow" && <Badge tone="critical">nicht erschienen</Badge>}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Card>
          );
        })}
      </Grid>
    </Box>
  );
}

export const calendarTool = definePlugin({
  name: "salon-calendar",
  tools: [{ name: "kalender", title: "Kalender", icon: CalendarIcon, component: CalendarView }],
});
