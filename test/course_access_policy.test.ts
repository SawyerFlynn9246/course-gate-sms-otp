import assert from "node:assert/strict";
import test from "node:test";
import { decideCourseAccess, type Course } from "../src/course_access_policy";

const course: Course = {
  courseId: "checkout-math",
  title: "Checkout Math Lab",
  deadline: new Date("2026-09-01T12:00:00.000Z"),
  educatorEmail: "teacher@example.edu",
};

test("verified learner receives access before the deadline and creates an on-time report", () => {
  const decision = decideCourseAccess(
    course,
    "learner-42",
    true,
    new Date("2026-08-17T09:00:00.000Z"),
  );

  assert.equal(decision.granted, true);
  if (decision.granted) {
    assert.equal(decision.report.status, "on_time");
    assert.equal(decision.report.learnerId, "learner-42");
  }
});

test("a verified code does not reopen a course after its deadline", () => {
  const decision = decideCourseAccess(
    course,
    "learner-42",
    true,
    new Date("2026-09-01T12:00:01.000Z"),
  );
  assert.deepEqual(decision, { granted: false, reason: "deadline_passed" });
});
