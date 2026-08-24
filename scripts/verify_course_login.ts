export {};

const baseUrl = process.env.COURSE_SERVICE_URL ?? "http://localhost:3000";
const phone = process.env.LEARNER_PHONE;
const code = process.env.LEARNER_CODE;

if (!phone || !code) throw new Error("LEARNER_PHONE and LEARNER_CODE are required");

const learner = { learnerId: "learner-42", phone, courseId: "checkout-math" };
const started = await fetch(`${baseUrl}/login/code`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(learner),
});
console.log("Code requested:", await started.json());

const verified = await fetch(`${baseUrl}/login/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ...learner, code }),
});
console.log("Course access:", await verified.json());
