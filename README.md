comtaler@Daniel-Surface-Pro-7:~/code/ap-test$ docker run -d --name ap-practice-mongo \
  -p 127.0.0.1:27017:27017 \
  -v ap-practice-mongo-data:/data/db \
  mongodb/mongodb-community-server:8.0-ubi8
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
# AP Practice

A local React and Vite frontend, a NestJS 11 REST API on Node.js and TypeScript 7.0, and a MongoDB attempt store. Students sign in through Auth0 Universal Login.

The first form simulates the full AP Computer Science Principles multiple-choice section. It has 70 original questions, including a five-question reading set and eight questions that require two selections. The default time is 120 minutes. The official exam also includes a separate Create performance task and written responses. [College Board exam format](https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam)

The catalog also includes **AP Computer Science A — Timed Sample**, with 12 original Java questions and a 26-minute limit. Each question maps to one or more specific topics from the four units. A question contributes to each linked skill and earns at most one raw-score point. It is available to all signed-in users and can be edited or archived in Admin. [College Board AP CSA course framework](https://apcentral.collegeboard.org/courses/ap-computer-science-a)

## Prerequisites

- Node.js 22.12 or later and npm.
- An Auth0 tenant.
- MongoDB Community Server or MongoDB Atlas. Docker is one option for running Community Server locally.

## Configure Auth0

1. In the Auth0 dashboard, go to **Applications → Applications** and create a **Single Page Web Application**. Copy its **Domain** and **Client ID**.
2. In the application's settings, add `http://localhost:5173` to **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**. Save the settings. Use this exact origin when opening the app.
3. Go to **Applications → APIs** and create an API. For **Identifier**, use `https://ap-practice-api` or your own identifier. Select **RS256** for signing. Copy the identifier exactly.
4. In the SPA settings, enable the **Refresh Token** grant and **Refresh Token Rotation**. For the API you created, enable **Allow Offline Access**. Sign in again after saving these settings so Auth0 can issue a refresh token.
5. Enable a user connection for the SPA. For email and password testing, enable the tenant's database connection for the application and either sign up through Universal Login or create a user in **User Management → Users**.

The SPA uses the public client ID. The API validates bearer access tokens against your tenant and API audience. [Auth0 React guide](https://developer.auth0.com/resources/guides/spa/react/basic-authentication) · [Auth0 Express guide](https://developer.auth0.com/resources/guides/api/express/basic-authorization)

The app restores sessions in the same browser tab with an Auth0 refresh token. If the token is unavailable or expired, sign in again through Universal Login. [Auth0 refresh-token setup](https://support.auth0.com/center/s/article/How-to-Use-Refresh-Tokens-in-a-SPA)

## Start MongoDB

With Docker running, start a local MongoDB container bound to loopback. The named volume retains data when the container stops.

```sh
docker run -d --name ap-practice-mongo \
  -p 127.0.0.1:27017:27017 \
  -v ap-practice-mongo-data:/data/db \
  mongodb/mongodb-community-server:8.0-ubi8
```

After the first run, restart it with `docker start ap-practice-mongo` if it is stopped. If MongoDB already runs locally, use its connection URI. For Atlas, create a database user with read/write access to the app database, allow your client IP in the Atlas network settings, then copy the driver connection string into `MONGODB_URI`. The server creates its collection and indexes on startup. [MongoDB Community with Docker](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-community-with-docker/) · [MongoDB Atlas connection setup](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)

## Run locally

From the project root:

```sh
npm install
cp .env.example .env
```

Edit `.env` as follows.

| Setting | Value |
| --- | --- |
| `VITE_AUTH0_DOMAIN` | Auth0 domain without `https://` or a trailing slash |
| `VITE_AUTH0_CLIENT_ID` | The Auth0 SPA's client ID |
| `VITE_AUTH0_AUDIENCE` | The exact identifier from the Auth0 API |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` for the container, or your MongoDB connection string |
| `MONGODB_DATABASE` | Database name, defaults to `ap_practice` |
| `API_PORT` | Local API port, defaults to `3001` |
| `EXAM_DURATION_SECONDS` | Default duration for the original exam until edited in Admin. Set it to `60` for a quick timer test |
| `ADMIN_AUTH0_SUB` | Optional Auth0 User ID for the first app administrator |

Keep `.env` local. Only the Auth0 settings use the frontend's `VITE_` prefix.

Run the API and frontend in separate terminals from the project root.

```sh
npm run api
```

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend proxies `/api` requests to Express. To try the compiled app, run `npm run build`, start the API, and open `http://localhost:3001`. Register that origin in the same three Auth0 fields first if you use the compiled app.

## Try the student flow

1. Sign in, then select a course or search the entire catalog by title, course, or description. Start an exam, answer a question, and wait for the save indicator to clear. Reload and resume to see the saved answer.
2. Visit questions 58–62 for the reading set and questions 63–70 for two-selection questions.
3. Use **Review and submit** to finish manually. Check the raw and estimated scores, then return to the dashboard to view the saved result.
4. For the timeout path, set `EXAM_DURATION_SECONDS=60`, restart the API, and start a **new** attempt. Let it expire. You can also close the tab after saving an answer, then reopen it after the deadline and view the result in Recent attempts.
5. Sign in as a different Auth0 user and check that the previous user's attempts are absent.

Run `npm run typecheck` to check the server and `npm test` for the bank and scoring tests. `npm run api` compiles the server before starting it. `npm run build` compiles both the server and the frontend. The public health endpoint at `/api/health` checks the database connection.

## Server structure

`server/main.ts` starts NestJS with the Express adapter. `server/app.module.ts` assembles the `auth`, `accounts`, `admin`, `catalog`, `exams`, and `database` modules. The database module owns MongoDB, seeds the catalog, and upgrades older records on startup. The exams service handles scoring and background submission. Existing environment variables and API URLs are used by the NestJS server.

## Scoring and stored data

Each question is worth one point. Two-selection questions require both correct choices. The practice estimate uses fixed raw percentage cutoffs of 80%, 65%, 50%, and 35% for scores 5, 4, 3, and 2 respectively. Lower scores receive a 1. These thresholds are a local heuristic. The estimate uses multiple-choice performance only.

MongoDB stores attempts, saved selections, submission timestamps, scores, and per-topic correct and total counts. Student API responses contain the raw and estimated scores. Admins can view topic counts in the student’s results. The server enforces deadlines and finalizes expired attempts periodically, including attempts whose browser tabs are closed. After downtime it catches up on startup.

Students can open **Profile** to see each course’s skills. A skill is checked when the student got every question for it right on the most recent submitted attempt that tested it. A later attempt can change skills it covers. Unanswered and partially answered questions prevent a checkmark for that skill. A test’s results show the checks earned on that attempt.

AP CSP results include a focus summary ranked by accuracy on completed answers. Unanswered and partially selected questions count as zero toward the raw score and appear separately in the topic breakdown. Only topics sampled by the test are shown. The built-in bank maps each question to one primary topic in the five-big-idea framework used for this form. [College Board AP CSP Course at a Glance](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-at-a-glance.pdf)

MongoDB seeds the 42 AP courses in the `courses` collection from College Board’s 2026–27 catalog. Tests store a `courseId`, and the app looks up the display name in the collection. Restart the API to migrate existing tests. Custom course labels are retained as legacy entries. The student practice catalog shows courses with tests the student can access. [College Board AP Courses and Exams](https://apstudents.collegeboard.org/courses)

MongoDB stores shared course topics in the `courseTopics` collection. Test questions and saved attempt snapshots reference those records through a `topicIds` array. API startup seeds the AP CSP framework topics and the AP CSA framework topics, then upgrades older questions that stored an inline label or a single topic ID. The admin editor accepts one or more topic names (one per line) and reuses matching topics within the course.

The original question bank is in `server/exams/exam.ts` and is seeded into MongoDB at API startup. After seeding, use the admin editor to change the test. Attempts retain the questions and answer key they started with, so edits and archiving preserve in-progress attempts and prior results.

## Set up the first administrator

1. Sign in once with the account you want to make an administrator. In the Auth0 dashboard, open **User Management → Users**, select that account, and copy its exact **User ID**. It typically starts with a provider prefix such as `auth0|` or `google-oauth2|`.
2. Set `ADMIN_AUTH0_SUB` in `.env` to that value and restart the API. Refresh the frontend after the restart.
3. Select **Admin** in the header or open [http://localhost:5173/admin](http://localhost:5173/admin).

Roles and account status are stored in MongoDB and checked on every protected API request. Users are registered in the app on their first authenticated visit. Existing exam takers also appear in the list. This list covers app accounts. Auth0 manages identity, sign-in, and password resets. The app uses the verified Auth0 User ID as a fallback if profile information is unavailable.

- **Users** lets admins view active progress, scores, and topic breakdowns, update account status or role, and assign or unassign tests. Disabling a user blocks their access to the app. The configured bootstrap admin’s role and active status are protected.
- **Tests** lets admins select a course from the catalog and edit timing, availability, questions, and answer keys. Older tests without a course are grouped under **Uncategorized**. New tests default to assignment-only. Archiving removes a test from the catalog while preserving attempts and results. Students can still finish attempts they have started.

