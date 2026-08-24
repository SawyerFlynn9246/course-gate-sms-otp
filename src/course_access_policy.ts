export type Course = {
  courseId: string;
  title: string;
  deadline: Date;
  educatorEmail: string;
};

export type AccessDecision =
  | { granted: true; courseId: string; learnerId: string; report: EducatorReport }
  | { granted: false; reason: "code_rejected" | "deadline_passed" };

export type EducatorReport = {
  courseId: string;
  learnerId: string;
  loginRecordedAt: string;
  deadline: string;
  status: "on_time";
};

export function decideCourseAccess(
  course: Course,
  learnerId: string,
  verified: boolean,
  now: Date,
): AccessDecision {
  if (!verified) return { granted: false, reason: "code_rejected" };
  if (now.getTime() > course.deadline.getTime()) {
    return { granted: false, reason: "deadline_passed" };
  }

  return {
    granted: true,
    courseId: course.courseId,
    learnerId,
    report: {
      courseId: course.courseId,
      learnerId,
      loginRecordedAt: now.toISOString(),
      deadline: course.deadline.toISOString(),
      status: "on_time",
    },
  };
}
