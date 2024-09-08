import { z } from "zod";

const flutterEventSchema = z.object({
  event: z.string(),
  params: z.record(z.unknown()),
});

const flutterEventArraySchema = z.array(flutterEventSchema);

export type FlutterEventArray = z.infer<typeof flutterEventArraySchema>;

export function parseFlutterEvents(stdoutData: string): FlutterEventArray | null {
  try {
    return flutterEventArraySchema.parse(JSON.parse(stdoutData));
  } catch (error) {
    return null;
  }
}
