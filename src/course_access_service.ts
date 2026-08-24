import express from "express";
import { z } from "zod";
import { decideCourseAccess, type Course, type EducatorReport } from "./course_access_policy";
import { InfraiError, InfraiSmsClient } from "./infrai_sms";

const startBody = z.object({
  learnerId: z.string().min(1),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  courseId: z.string().min(1),
});

const verifyBody = startBody.extend({
  code: z.string().regex(/^\d{4,8}$/),
});

const courses = new Map<string, Course>([
  ["checkout-math", {
    courseId: "checkout-math",
    title: "Checkout Math Lab",
    deadline: new Date("2027-06-30T23:59:59.000Z"),
    educatorEmail: "teacher@example.edu",
  }],
]);

const educatorReports: EducatorReport[] = [];

function clientErrorStatus(error: InfraiError): number {
  return error.status >= 400 && error.status < 500 ? error.status : 502;
}

export function createCourseAccessService(client: InfraiSmsClient, now: () => Date = () => new Date()) {
  const service = express();
  service.use(express.json());

  service.post("/login/code", async (request, response) => {
    const parsed = startBody.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: "invalid_request" });
    const course = courses.get(parsed.data.courseId);
    if (!course) return response.status(404).json({ error: "course_not_found" });

    try {
      const key = `${parsed.data.courseId}:${parsed.data.learnerId}:${parsed.data.phone}`;
      const delivery = await client.sms.otp({ to: parsed.data.phone }, key);
      return response.status(202).json({ challengeId: delivery.id, course: course.title });
    } catch (error) {
      if (error instanceof InfraiError) {
        return response.status(clientErrorStatus(error)).json({ error: error.code });
      }
      return response.status(502).json({ error: "sms_transport_error" });
    }
  });

  service.post("/login/verify", async (request, response) => {
    const parsed = verifyBody.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: "invalid_request" });
    const course = courses.get(parsed.data.courseId);
    if (!course) return response.status(404).json({ error: "course_not_found" });

    try {
      const result = await client.sms.verify({ to: parsed.data.phone, code: parsed.data.code });
      const decision = decideCourseAccess(course, parsed.data.learnerId, result.verified, now());
      if (!decision.granted) return response.status(403).json(decision);
      educatorReports.push(decision.report);
      return response.json(decision);
    } catch (error) {
      if (error instanceof InfraiError) {
        return response.status(clientErrorStatus(error)).json({ error: error.code });
      }
      return response.status(502).json({ error: "sms_transport_error" });
    }
  });

  service.get("/educator/reports", (_request, response) => response.json(educatorReports));
  return service;
}

if (process.env.NODE_ENV !== "test") {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const port = Number(process.env.PORT ?? 3000);
  createCourseAccessService(new InfraiSmsClient(apiKey)).listen(port, () => {
    console.log(`Course access service listening on http://localhost:${port}`);
  });
}
