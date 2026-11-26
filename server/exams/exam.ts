import { createHash } from 'node:crypto'

import type { Answers, Question, ScorableQuestion, TopicDetails, TopicPerformance, TopicScores } from '../types.js'
import { cspBigIdeas, cspTopicLabel, cspTopics } from './csp-topics.js'

function questions(rows: [string, string, string, number[]][], passage: string | null = null) {
  return rows.map(([code, prompt, options, correct]) => ({
    topic: cspTopicLabel(code),
    prompt,
    options: options.split('|'),
    correct,
    passage,
  }))
}

const ordinary = questions([
  ['1.4', 'A library app counts toward a reading goal only after a user marks a book finished. Which test is most useful for detecting a bug that counts books too early?', 'Check whether two finished books count twice|Check whether adding a new unfinished book changes the goal total|Check whether the app title appears on a small screen|Check whether the logout button returns to sign-in', [1]],
  ['1.1', 'Two teammates are building a game. One writes movement code while the other designs levels. Which agreement most directly helps them work independently?', 'Both teammates use identical monitors|Both teammates write exactly the same number of lines|They agree on how the movement code receives level and collision information|They avoid sharing early versions', [2]],
  ['1.4', 'A stopwatch shows 0.0 when opened, then should count upward only when Start is tapped. Which observation reveals a logic error?', 'The program fails to parse because an expression is incomplete|The app cannot install because storage is full|A comment misspells stopwatch|The display starts counting before Start is tapped', [3]],
  ['1.3', 'A bus app team wants to find out whether its route search works for first-time riders. Which approach provides the most direct evidence?', 'Ask first-time riders to find a route while the team observes|Count the number of functions in the app|Survey only the developers who wrote the search code|Measure how many colors the app uses', [0]],
  ['1.4', 'A registration form accepts ages 13 through 17 inclusive. Which test set best checks both acceptance boundaries?', '14, 15, 16, 17|12, 13, 17, 18|0, 5, 30, 60|13, 14, 16, 17', [1]],
  ['3.13', 'Two independently developed pages call the same procedure to validate a ZIP code. What is the main maintenance benefit?', 'The caller no longer needs an input value|The program never needs testing|A change to the validation rule can be implemented in one procedure|The program is guaranteed to run faster', [2]],
  ['1.3', 'A team has a prototype that finds nearby bike racks. Feedback says users cannot tell whether racks are covered. Which step best reflects iterative design?', 'Finalize the current design and collect feedback after release only|Remove the location feature because it already works|Change the database engine without consulting users|Add coverage information and test whether it addresses the feedback', [3]],
  ['2.1', 'What is the value of binary 10110 in decimal?', '22|18|20|26', [0]],
  ['2.1', 'A status field stores one of 16 distinct states using a fixed-width binary code. What is the minimum field width?', '2 bits|4 bits|8 bits|16 bits', [1]],
  ['2.2', 'Which conversion is an example of lossy compression?', 'Packaging text files into an archive that restores every character|Encoding repeated spaces with a count that can be reversed|Reducing a photo’s resolution by discarding pixel detail|Replacing a word with a shorter code and storing the full dictionary', [2]],
  ['2.1', 'A device uses unsigned 4-bit integers. If it retains only the lowest four bits of each sum, what value does it store for 14 + 5?', '15|19|5|3', [3]],
  ['2.3', 'A wildlife photo file stores its capture date and GPS coordinates in addition to pixel values. What are the date and coordinates in this context?', 'Metadata|A compression algorithm|A checksum for each pixel|An analog signal', [0]],
  ['2.1', 'An audio recorder doubles how often it samples sound and keeps every other recording setting the same. What happens to uncompressed storage for a clip of the same duration?', 'It stays the same|It approximately doubles|It approximately halves|It quadruples', [1]],
  ['2.3', 'A spreadsheet has one row per bus trip with route, scheduled departure, and actual departure. What additional field is needed to compare the average delay on weekdays and weekends?', 'Bus color|Driver initials|Service date|Total number of spreadsheet rows', [2]],
  ['2.3', 'A survey about transit satisfaction collects responses only through QR codes posted on buses. Which group is least likely to be represented?', 'Frequent riders with smartphones|Riders who noticed a posted QR code|Bus drivers who ride as passengers|People who avoid riding the bus', [3]],
  ['2.1', 'A temperature sensor records readings to the nearest whole degree. Why can two different actual temperatures produce the same recorded value?', 'The representation rounds a range of real values to one recorded value|The sensor applies lossless compression|Numeric data cannot be represented with bits|The sampling interval must be zero', [0]],
  ['2.4', 'Two stores provide transaction files with a separate column for store ID. Which operation most directly produces total revenue by store?', 'Sort all sales by amount and keep the first row|Group transactions by store ID and sum each group’s sale amounts|Count the number of distinct sale amounts|Convert every store ID to a binary value', [1]],
  ['2.1', 'Every character in a toy encoding uses exactly 8 bits. How many distinct characters can it represent?', '8|16|256|512', [2]],
  ['2.3', 'An air quality chart shows similar daily patterns at two sites. Which fact provides the strongest reason to investigate before concluding the sites have identical air quality?', 'Both charts display weekday labels|The charts cover the same month|Both data sets include daily values|One site reports hourly peaks and the other reports hourly averages', [3]],
  ['3.1', 'What value is displayed?\n\nx ← 4\ny ← x\nx ← x + 3\nDISPLAY(y)', '4|3|7|11', [0]],
  ['3.5', 'Which condition is true exactly when age is at least 13 and less than 18?', 'age ≥ 13 OR age < 18|age ≥ 13 AND age < 18|age > 13 AND age ≤ 18|NOT (age ≥ 13 AND age < 18)', [1]],
  ['3.9', 'What is displayed?\n\ntotal ← 0\nFOR EACH number IN [3, 5, 2, 4]\n{\n  IF (number MOD 2 = 0)\n  {\n    total ← total + number\n  }\n}\nDISPLAY(total)', '2|4|6|14', [2]],
  ['3.10', 'In the AP pseudocode convention, a list starts at index 1. What is displayed?\n\nitems ← ["pen", "pad", "cup"]\nINSERT(items, 2, "pin")\nDISPLAY(items[3])', 'pen|pin|cup|pad', [3]],
  ['3.11', 'Which change allows binary search to be used correctly on a list of names?', 'Sort the names by the same order used for comparisons|Remove all names with more than five letters|Duplicate all names|Shuffle the array before each comparison', [0]],
  ['3.8', 'What is displayed?\n\nn ← 1\nREPEAT 3 TIMES\n{\n  n ← 2 * n + 1\n}\nDISPLAY(n)', '7|15|8|13', [1]],
  ['3.13', 'A procedure reuses a list of prices in multiple parts of a program. Which abstraction makes its calling code easiest to reuse on a new list?', 'Hard-code the original prices inside the procedure|Print every intermediate value|Pass the price list as a parameter|Require each caller to copy the procedure body', [2]],
  ['3.15', 'RANDOM(1, 6) returns an equally likely integer from 1 through 6. Which condition is true with probability 1/3?', 'RANDOM(1, 6) ≤ 3|RANDOM(1, 6) > 1|RANDOM(1, 6) = 6|RANDOM(1, 6) ≤ 2', [3]],
  ['3.12', 'What is displayed?\n\nPROCEDURE doublePlus(value)\n{\n  RETURN(2 * value + 1)\n}\nDISPLAY(doublePlus(doublePlus(2)))', '11|9|10|12', [0]],
  ['3.17', 'An algorithm tests every pair of distinct elements in a list exactly once. Which description best matches how its work grows as the list gets large?', 'It grows logarithmically|It grows quadratically|It stays constant|It grows linearly', [1]],
  ['3.8', 'What is displayed?\n\nx ← 10\nREPEAT UNTIL (x < 4)\n{\n  x ← x - 3\n}\nDISPLAY(x)', '7|4|1|−2', [2]],
  ['3.9', 'In a list of daily rainfall measurements, which algorithm finds the number of days with rainfall over 10 mm?', 'Add all readings and divide the sum by 10|Count the readings greater than or equal to 10|Find the maximum reading and subtract 10|Start a counter at 0 and increment it once per reading greater than 10', [3]],
  ['3.16', 'A fire evacuation simulation treats every hallway as equally wide, but some are much narrower. What is a likely consequence?', 'The model may overestimate how many people can move through narrow hallways|The model automatically determines the true width of each hallway|The model is guaranteed to underestimate travel time in all hallways|The model cannot produce any output', [0]],
  ['3.5', 'Which expression is equivalent to NOT (isClosed OR isFull)?', 'NOT isClosed OR NOT isFull|NOT isClosed AND NOT isFull|isClosed AND isFull|isClosed OR isFull', [1]],
  ['3.17', 'A route planner picks the nearest unvisited stop at every step. Why might it use this algorithm?', 'Choosing the nearest stop proves the whole route is shortest|The algorithm always tests every possible route|It can find a usable route quickly even if some other route is shorter|The algorithm finds a shortest route only when distances are unmeasured', [2]],
  ['3.10', 'What is displayed?\n\na ← [9, 3, 7, 1]\nREMOVE(a, 2)\nAPPEND(a, 5)\nDISPLAY(a[2] + a[4])', '8|10|14|12', [3]],
  ['3.12', 'What does this procedure return for a nonempty list?\n\nPROCEDURE check(values)\n{\n  FOR EACH v IN values\n  {\n    IF (v < 0)\n    {\n      RETURN(true)\n    }\n  }\n  RETURN(false)\n}', 'Whether at least one value is negative|Whether all values are negative|The index of the first negative value|Whether the last value is negative', [0]],
  ['3.11', 'For a list of 1,024 sorted distinct values, which method typically requires the fewest comparisons to locate an arbitrary target in the worst case?', 'Compare the target with each value from left to right|Repeatedly compare with the middle of the remaining search range|Start at the end and check each value backward|Compare the first two elements and then search all remaining elements in order', [1]],
  ['1.4', 'The program should display integers 1 through 5, but displays 2 through 6. Which single change fixes it?\n\ni ← 1\nREPEAT 5 TIMES\n{\n  i ← i + 1\n  DISPLAY(i)\n}', 'Repeat 4 times instead of 5|Change the initial value to 2|Change the initial value to 0|Increase i by 2 instead of 1', [2]],
  ['3.18', 'A researcher wants a program that can determine whether any arbitrary program halts on any arbitrary input. Which statement is correct?', 'Any modern computer can solve it with enough memory|Parallel hardware makes it decidable|Testing a program on 1,000 random inputs decides the problem|No single algorithm is guaranteed to correctly decide all such cases', [3]],
  ['4.1', 'What most directly allows one computer to send packets to another computer across the Internet?', 'An IP address identifies the destination for routing|An HTML title identifies the computer|A file extension specifies the path through every router|A display resolution is translated to a host name', [0]],
  ['4.1', 'What service typically looks up the IP address associated with a domain name?', 'HTTP|DNS|HTML|Bluetooth', [1]],
  ['4.2', 'Why can the Internet often keep delivering packets when a connection between two routers fails?', 'Every packet is required to visit those two routers|All packets travel through a single central computer|Routing can use an alternative path when one exists|The IP address of every destination is automatically removed', [2]],
  ['4.3', 'Two independent tasks take 10 seconds each on separate processors, and a final step must run for 5 seconds after both are finished. Ignoring overhead, how long does the parallel workflow take?', '5 seconds|10 seconds|25 seconds|15 seconds', [3]],
  ['4.1', 'A connection can carry up to 100 megabits per second. What property does the 100 megabits per second describe?', 'Bandwidth|Latency|Number of routers traversed|Length of an IP address', [0]],
  ['5.6', 'What is a reason to use HTTPS when submitting a password to a website?', 'It eliminates the need for password storage|It encrypts the request in transit and provides server authentication through certificate validation|It makes the server unable to learn the submitted password|It prevents the connection from ever timing out', [1]],
  ['4.1', 'A protocol includes sequence numbers on packets. What can a receiver use the numbers for?', 'Determining who designed the original website|Increasing the physical transmission speed|Reconstructing data in the intended order|Converting the packet contents to a different programming language', [2]],
  ['4.3', 'Which example describes distributed computing?', 'One tablet doubles its display brightness|A single processor executes each instruction one at a time|A laptop displays a cached image while offline|Independent computers analyze different segments of a sky survey and combine their findings', [3]],
  ['5.2', 'A school loan program provides home Internet hotspots to students who lack broadband. Which issue does the program directly address?', 'The digital divide|Lossless compression|Routing table convergence|Integer overflow', [0]],
  ['5.3', 'A company trains a voice assistant mostly on recordings from adults in one region. Which outcome should the company specifically evaluate?', 'Whether the program uses variables|Whether recognition accuracy is lower for children or people with different accents|Whether the recordings contain binary data|Whether the system requires power', [1]],
  ['5.5', 'A developer wants to incorporate an image marked with a license requiring attribution. Which action meets that condition?', 'Remove all license information and publish the image|Change the file name and omit credits|Credit the creator in the manner specified by the license|Use the image only in a file with no extension', [2]],
  ['5.6', 'An email appears to be from a school and asks a student to follow an unfamiliar link and immediately enter a password. Which response best reduces the chance of disclosing credentials to an impersonator?', 'Reply with the password to avoid opening the link|Enter the password, then change it later|Forward the message to classmates to see whether they will enter credentials|Open the school portal using a trusted bookmark and check for the request there', [3]],
  ['5.6', 'An attendance app needs to count visits to a public event. Which design best follows data minimization?', 'Collect total entry counts without collecting names or contact details|Collect each visitor’s full address and date of birth|Store copies of every visitor’s ID indefinitely|Require access to each visitor’s entire contact list', [0]],
  ['5.4', 'What distinguishes crowdsourcing from a survey run solely by a project team?', 'The work can only use a private network|A broad group of contributors provides work or information for the project|Only the project team may submit data|The data must be stored on one person’s computer', [1]],
  ['5.1', 'A museum adds captions to videos in an exhibit. Which outcome is most directly supported by that change?', 'The video files become impossible to copy|The museum no longer needs to consider accessibility|Visitors who cannot hear the audio can follow the narration|Every visitor downloads the videos faster', [2]],
  ['5.6', 'A wearable records precise locations over several months. What risk can persist even if the company removes names before sharing these traces?', 'Location values will stop representing any places|The shared data cannot be processed by computers|Everyone in the data can always be identified with equal certainty|Repeated trips to a home or workplace may reveal someone’s identity', [3]],
  ['5.6', 'An account requires a password and a one-time code from an authenticator app. What is the advantage?', 'A stolen password alone is generally insufficient to sign in|The service can safely publish every password|The authenticator prevents all software defects|The account no longer needs an identity check', [0]],
  ['5.3', 'A grocery app recommends items solely from past sales. Why might new products rarely appear in recommendations?', 'Sales records are always illegal to analyze|Items without a sales history have little evidence under that rule|Computers cannot store data about products introduced after installation|The items must use a different binary alphabet', [1]],
])

const passage = 'A city installs battery-powered sensors in public rain gardens. Each sensor sends a moisture reading, timestamp, battery level, and garden identifier every 15 minutes. A public dashboard shows the latest reading per garden. A maintenance service sends an alert after three consecutive readings fall below a threshold. City staff temporarily added five sensors in one neighborhood during a pilot, while two other neighborhoods had none. Several sensors share a gateway that forwards their messages to the maintenance service.'

const passageQuestions = questions([
  ['1.2', 'What is the primary purpose of the maintenance service?', 'To publish the home addresses of nearby residents|To replace every sensor battery on a fixed schedule|To identify gardens that may require watering|To ensure that all gardens have identical soil', [2]],
  ['2.3', 'Which conclusion is least supported by the data collected during the pilot?', 'A monitored sensor’s reported battery level changed|Some gardens had readings that could be plotted over time|Several readings in a row from a monitored garden were below a threshold|The monitored gardens represent moisture conditions in every neighborhood', [3]],
  ['5.6', 'A vendor asks to add the precise location history of staff phones to the public dashboard. Which argument is strongest for declining that request?', 'Staff movements are unnecessary for reporting garden moisture and could expose private routines|Precise location data can never be stored digitally|A public dashboard cannot present more than one type of number|City staff already have access to rain gardens', [0]],
  ['2.3', 'The gateway fails, and the dashboard continues showing each garden’s last reading. Which change would help residents recognize potentially stale data?', 'Hide the garden identifiers|Display the time of the last received reading next to each value|Replace low readings with zeros by default|Rename every sensor with the same label', [1]],
  ['5.1', 'If pavement near a sensor makes it dry out faster than the rest of its garden, what is a plausible unintended effect?', 'The alert system stops accepting timestamps|Other neighborhoods necessarily receive more sensors|The city may water that garden more often than the whole garden needs|Residents are unable to access the Internet at all', [2]],
], passage)

const multiSelect = questions([
  ['1.4', 'A calculator procedure should return 0 for an empty basket and sum the price of every item otherwise. Which TWO tests directly check those requirements?', 'Call it with two differently priced items and check their sum|Change the app’s theme color|Call it with an empty basket and verify that the result is 0|Confirm that a comment mentions prices', [0, 2]],
  ['5.6', 'A researcher plans to release a data set of individual library checkouts. Which TWO changes most directly reduce the risk of linking a record to a specific patron?', 'Sort rows by checkout time|Remove patron identifiers|Convert checkout dates to another text format with the same precision|Aggregate checkouts by week and branch and publish only the counts', [1, 3]],
  ['3.5', 'Which TWO expressions are true when x = 6?', 'x MOD 3 = 0|x < 4 OR x > 8|x ≥ 6 AND x ≤ 7|NOT (x = 6)', [0, 2]],
  ['3.9', 'A list contains at least one number. Which TWO initial values allow a procedure that replaces its candidate whenever it sees a larger item to find the maximum for every possible input list?', '0|The first item in the list|1|The smallest item in the list', [1, 3]],
  ['3.9', 'Which TWO changes preserve the result of summing all even integers in a list?', 'Reverse the list before summing|Exclude even numbers less than zero|Skip elements equal to zero|Sum only the distinct even values', [0, 2]],
  ['4.2', 'Which TWO changes can make a website more resilient to infrastructure failures?', 'Store all copies of the site on one physical disk|Maintain serving capacity in different locations|Disable failover so traffic uses one machine|Use more than one upstream network provider', [1, 3]],
  ['5.2', 'Which TWO changes improve access to a city’s online application process for people with limited Internet connectivity?', 'Offer a lightweight version that works on low-bandwidth links|Require every applicant to upload a long high-definition video|Provide public access terminals where applicants can complete the form|Require every user to download a large application package before reading the form', [0, 2]],
  ['5.3', 'An online marketplace is reviewing a rating algorithm for potential bias. Which TWO actions would most directly support that review?', 'Increase button sizes on the checkout page|Compare error rates across relevant groups where that analysis can be done responsibly|Delete all records of disputed ratings|Audit whether training data underrepresents some groups', [1, 3]],
])

function orderKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function mixQuestions<T extends { prompt: string }>(items: T[]) {
  return items.map(question => ({ question, key: orderKey(question.prompt) }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(({ question }) => question)
}

export const examId = 'csp-section-i-form-1'
export const bank = [...mixQuestions(ordinary), ...passageQuestions, ...mixQuestions(multiSelect)]
  .map((question, index) => {
    const choices = question.options.map((label, originalIndex) => ({
      label,
      correct: question.correct.includes(originalIndex),
      key: orderKey(question.prompt + label),
    })).sort((left, right) => left.key.localeCompare(right.key))
    return {
      ...question,
      id: `q${index + 1}`,
      options: choices.map(choice => choice.label),
      correct: choices.flatMap((choice, option) => choice.correct ? [option] : []),
      select: question.correct.length,
    }
  })
const originalQuestions = new Map(bank.map(question => [question.prompt, question]))

export function tagLegacyCspQuestions(questions: Question[]) {
  return questions.map(question => {
    const original = originalQuestions.get(question.prompt)
    if (!question.topic || !cspBigIdeas.includes(question.topic) || !original
      || JSON.stringify(original.options) !== JSON.stringify(question.options)
      || JSON.stringify(original.correct) !== JSON.stringify(question.correct)) return question
    return { ...question, topic: original.topic }
  })
}

function correctSelection(question: ScorableQuestion, selected: number[]) {
  return selected.length === question.select && question.correct.every(option => selected.includes(option))
}

function questionTopics(question: ScorableQuestion): TopicDetails[] {
  if (question.topicDetails) return question.topicDetails
  if (question.topicIds) return question.topicIds.map(id => ({ id }))
  return (question.topics ?? (question.topic ? [question.topic] : [])).map(label => ({
    label,
    ...(cspTopics.get(label) ?? { name: label }),
  }))
}

export function topicFeedback(answers: Answers, questions: ScorableQuestion[]) {
  const rows = new Map<string, TopicPerformance>()
  for (const question of questions) {
    const selected = answers[question.id] ?? []
    const outcome = selected.length < question.select ? 'incomplete'
      : correctSelection(question, selected) ? 'correct' : 'incorrect'
    for (const { id, label, code, name, bigIdea } of questionTopics(question)) {
      const key = id ?? label
      if (key === undefined) continue
      const topic = rows.get(key) ?? {
        ...(id && { topicId: id }),
        ...(code && { code }),
        ...(name && { name }),
        ...(bigIdea && { bigIdea }),
        correct: 0, incorrect: 0, incomplete: 0,
      }
      topic[outcome] += 1
      rows.set(key, topic)
    }
  }
  return [...rows.values()].map(topic => ({
    ...topic, mastered: topic.incorrect === 0 && topic.incomplete === 0,
  })).sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '', 'en', { numeric: true })
    || (a.name ?? '').localeCompare(b.name ?? ''))
}

export function studentQuestions(questions: Question[]) {
  return questions.map(({ id, prompt, options, select, passage }) => ({
    id, prompt, options, select, passage,
  }))
}

export const publicQuestions = studentQuestions(bank)

export function grade(answers: Answers, questions: ScorableQuestion[] = bank) {
  const topics = new Map<string, TopicScores[string]>()
  let rawScore = 0
  for (const question of questions) {
    const selected = answers[question.id] ?? []
    const correct = correctSelection(question, selected)
    if (correct) rawScore += 1
    for (const { label } of questionTopics(question)) {
      if (label === undefined) continue
      const topic = topics.get(label) ?? { correct: 0, total: 0 }
      topic.total += 1
      if (correct) topic.correct += 1
      topics.set(label, topic)
    }
  }
  const percent = rawScore / questions.length
  const estimatedScore = 5 - [0.8, 0.65, 0.5, 0.35].filter(cutoff => percent < cutoff).length
  return { rawScore, total: questions.length, estimatedScore, topics: Object.fromEntries(topics) }
}
