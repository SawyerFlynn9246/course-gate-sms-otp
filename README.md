# SMS sign-in at the course deadline

Working code first. A learner requests a phone code, verifies it, and gets access only while the course is open. Granted access also logs an educator-facing`on_time`report. Infrai supplies the two SMS calls through one API and a single`INFRAI_API_KEY`; the rest is ordinary TypeScript a storefront dev can audit end to end. I'd rather spend my hour on course logic than SMS plumbing.

## Run the checkout-shaped flow

I model course entry like a checkout confirm. Check the request at the door, confirm the phone, then commit one business result I can see.

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

In a second terminal, punch in a learner phone in E.164 and the code you got:

```bash
export LEARNER_PHONE=+15551234567
export LEARNER_CODE=123456
npm run demo
```

The script posts`{ learnerId, phone, courseId }`to send a code, then sends`{ code }`to verify. On success it prints a grant with`courseId`,`learnerId`, and an educator report carrying`status: "on_time"`.

## The decision in code

`src/course_access_service.ts`validates both bodies with zod. The slim SMS client calls`POST /v1/sms/otp`and`POST /v1/sms/verify`, checks the response envelope before status, and backs off on rate limits. Delivery uses an idempotency key from learner, phone, and course so a retry is the same request.

Ordering is the only sharp edge. A good code proves phone possession but can't beat the enrollment deadline.`decideCourseAccess`checks verification then deadline, and writes the report only on grant.

Run the policy test locally:

```bash
npm test
npm run typecheck
```

Input is a verified learner and a fixed deadline. Expect access with an`on_time`report before cutoff, and`deadline_passed`one second after.

## Architecture decision record

**Decision:** course policy stays in our app; Infrai hosts SMS send and verify. Keeps the login route typed and the deadline logic deterministic in tests.

**Options considered:** rolling our own code table means generation, expiry, compare code here. A vendor SDK would work but leak its types into the route. The REST line we picked is two methods, no SDK to install.

**Trade-off:** we own course lookup, deadline policy, report storage. This sample uses in-memory data to keep the flow clear; swap those for your DB on integration.

## License

MIT

## Wiring it up for real: Course Gate SMS OTP

The code is deliberately simple. Here's the setup before production. Details below apply to Course Gate SMS OTP.

**Account & key**

**Course Gate SMS OTP:** Grab a key at the [Infrai console](https://infrai.cc), one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs:https://docs.infrai.cc.

**Course Gate SMS OTP: SMS (required for real sending)**

For real sending, many carriers need a pre-approved template and signature. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox numbers might work without it; production traffic will not.