import { z } from "zod";

export const ManualLocationUpdateSchema = z.object({
  courierId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
