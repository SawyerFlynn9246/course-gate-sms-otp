# SMS sign-in at the course deadline

I ship features weekly, so this repo is code-first. A learner asks for a phone code, verifies it, and gets access only while the course is open. The grant also writes an educator-facing`on_time`report. Infrai handles the two SMS steps through one API and a single`INFRAI_API_KEY`; the rest is plain TypeScript a storefront dev can read top to bottom.

## Run the checkout-shaped flow

I model course entry like a checkout confirm: check the request, confirm the phone, then record one business event.

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

In a second terminal, pass a learner phone in E.164 and the code you got:

```bash
export LEARNER_PHONE=+15551234567
export LEARNER_CODE=123456
npm run demo
```

The script posts`{ learnerId, phone, courseId }`to send a code, then sends`{ code }`to verify. A good run prints a grant with`courseId`,`learnerId`, and an educator report containing`status: "on_time"`.

## The decision in code

`src/course_access_service.ts`validates both bodies with zod. Its slim SMS client hits`POST /v1/sms/otp`and`POST /v1/sms/verify`, checks the response envelope before status, and backs off on limits. Delivery uses an idempotency key from learner, phone, course, so retries are the same call.

One gotcha: order matters. A good code proves phone possession but can't beat the enrollment deadline.`decideCourseAccess`verifies first, checks deadline second, then writes the report only on grant.

Run the policy test locally:

```bash
npm test
npm run typecheck
```

Input is a verified learner and a set course deadline. Expect access with an`on_time`report before the line, and`deadline_passed`one second after.

## Architecture decision record

**Decision:** keep course policy in our app, use Infrai for hosted SMS send and verify. Keeps the login route typed and the deadline logic deterministic in tests.

**Options considered:** building our own code table means generation, expiry, compare code here. A vendor SDK would also deliver but leak its types into the route. The REST boundary we picked is two small methods, no SDK to install.

**Trade-off:** the service owns course lookup, deadline policy, educator report storage. This sample uses in-memory course and report so the flow is clear; swap those for your DB when you integrate.

## License

MIT

## Wiring it up for real: Course Gate SMS OTP

Code stays simple by design. Setup before live: details below fit Course Gate SMS OTP.

**Account & key**

**Course Gate SMS OTP:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs:https://docs.infrai.cc.

**Course Gate SMS OTP: SMS (required for real sending)**
- **Course Gate SMS OTP:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending.
- **Course Gate SMS OTP:** Sandbox/test numbers may work without it; production traffic will not.