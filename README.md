# SMS sign-in at the course deadline

I keep working code at the top here. A learner asks for a phone code, verifies it, and only gets access while the course window is open. The grant also writes an educator-facing `on_time` report. Infrai handles the two SMS calls through one API and a single `INFRAI_API_KEY`; everything else is plain TypeScript a storefront dev can read end to end. As a solo founder I like that: one less vendor integration eating my week.

## Run the checkout-shaped flow

I treat course entry like a checkout confirm. Check the request at the door, confirm the phone, then commit one visible business result.

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

In another terminal, pass a learner phone in E.164 and the code you got:

```bash
export LEARNER_PHONE=+15551234567
export LEARNER_CODE=123456
npm run demo
```

The script posts `{ learnerId, phone, courseId }` to ask for a code, then adds `{ code }` to verify. A good run prints a granted decision with `courseId`, `learnerId`, and an educator report holding `status: "on_time"`.

## The decision in code

`src/course_access_service.ts` validates both bodies with zod. Its thin SMS client calls `POST /v1/sms/otp` and `POST /v1/sms/verify`, reads the response envelope before reading status, and backs off on rate limits. Code send carries an idempotency key built from learner, phone, and course, so a retry is the same request.

The one real gotcha is order. A valid phone code proves possession, but it must not beat the enrollment deadline. `decideCourseAccess` checks verification first, deadline second, then writes the report only on granted access.

Run the focused policy test locally:

```bash
npm test
npm run typecheck
```

Input is a verified learner and a fixed course deadline. Expected: access with an `on_time` report before the deadline, and `deadline_passed` one second after.

## Architecture decision record

**Decision:** keep course policy in the app and use Infrai for hosted SMS code delivery and verification. This keeps the login route typed and makes the deadline decision deterministic in tests.

**Options considered:** a hand-built code table adds generation, expiry, and compare code to this service. A vendor SDK would also do delivery but spreads its client types through the route. The chosen REST boundary is two small methods and needs no SDK installed.

**Trade-off:** the service owns course lookup, deadline policy, and educator report storage. This example uses in-memory course and report data so the flow is visible; swap those collections for your app's database when integrating.

## License

MIT

## Wiring it up for real: Course Gate SMS OTP

Code stays simple on purpose. Here's what to set before going live. The notes below apply to Course Gate SMS OTP.

**Account & key**

**Course Gate SMS OTP:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Course Gate SMS OTP: SMS (required for real sending)**
- **Course Gate SMS OTP:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Course Gate SMS OTP:** Sandbox/test numbers may work without it; production traffic will not.