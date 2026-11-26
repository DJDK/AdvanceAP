import { csaCourseId } from '../catalog/courses.js'
import { csaTopicLabel, csaUnits } from './csa-topics.js'

const items: [string[], string, string[], number][] = [
  [['1.3', '1.4'], `What is printed?

int minutes = 17;
double hours = minutes / 60;
System.out.println(hours);`,
  ['17.0', '0.0', '1.0', '0.2833333333333333'], 1],

  [['1.14', '1.15'], `What is printed?

String label = "notebook";
System.out.println(label.substring(2, 5) + label.indexOf("book"));`,
  ['teb3', 'teb4', 'tebo4', 'ote4'], 1],

  [['1.6', '2.3', '2.8', '2.9'], `What is printed?

int total = 0;
for (int n = 1; n <= 7; n += 2) {
    if (n % 3 != 0) {
        total += n;
    }
}
System.out.println(total);`,
  ['13', '12', '9', '16'], 0],

  [['2.5'], `A parking permit is valid when the permit has been paid for and either the vehicle is electric or the time is after 6 p.m. Which expression matches that rule?`,
  ['paid && (electric || afterSix)', 'paid && electric && afterSix', '(paid && electric) || afterSix', 'paid || (electric && afterSix)'], 0],

  [['1.6', '2.7'], `What is printed?

int n = 20;
int count = 0;
while (n > 3) {
    n /= 2;
    count++;
}
System.out.println(count + " " + n);`,
  ['3 3', '4 1', '2 5', '3 2'], 3],

  [['2.8', '2.11'], `How many times does the program print an asterisk?

for (int row = 1; row <= 4; row++) {
    for (int col = 0; col < row; col++) {
        System.out.print("*");
    }
}`,
  ['16', '6', '12', '10'], 3],

  [['3.3', '3.7', '3.8'], `A BankAccount constructor receives initialBalance. Each account must store its own balance, and outside code should access the balance through public methods. Which field declaration meets both requirements?`,
  ['public int balance;', 'public static int balance;', 'private int balance;', 'private static int balance;'], 2],

  [['1.13', '1.14', '3.4'], `What is printed when the following code runs outside the class?

class Counter {
    private int value;

    public Counter(int start) {
        value = start;
    }

    public void advance() {
        value += 2;
    }

    public int getValue() {
        return value;
    }
}

// In another class:
Counter first = new Counter(5);
Counter second = first;
second.advance();
System.out.println(first.getValue());`,
  ['5', '7', '9', '2'], 1],

  [['4.3', '4.4', '4.5'], `What is printed?

int[] values = {2, 4, 6, 8};
for (int i = 1; i < values.length; i++) {
    values[i] += values[i - 1];
}
System.out.println(values[3]);`,
  ['18', '10', '20', '14'], 2],

  [['4.8'], `Assume ArrayList has been imported. What is printed?

ArrayList<String> words = new ArrayList<String>();
words.add("sun");
words.add("moon");
words.add(1, "star");
words.remove(0);
System.out.println(words.get(1));`,
  ['moon', 'sun', 'star', 'The get call throws an exception.'], 0],

  [['4.11', '4.12'], `What is printed?

int[][] grid = {{2, 4, 6}, {1, 3, 5}};
int sum = 0;
for (int r = 0; r < grid.length; r++) {
    sum += grid[r][r + 1];
}
System.out.println(sum);`,
  ['8', '9', '11', '5'], 1],

  [['2.12', '4.14'], `An ArrayList<String> named names is sorted in ascending order using String.compareTo. Which strategy can determine whether a target is present using the fewest comparisons in the worst case?`,
  [
    'Check the first element, then scan the remaining elements in order.',
    'Start at the last element and scan backward until the target is found or all candidates are exhausted.',
    'Compare the target with every element at an even index, then check the elements at odd indices.',
    'Compare with the middle element and repeatedly discard the half that cannot contain the target.',
  ], 3],
]

export const csaSample = {
  _id: 'csa-timed-sample-1',
  title: 'AP Computer Science A — Timed Sample',
  courseId: csaCourseId,
  description: 'Practice Java with 12 multiple-choice questions on objects and methods, selection and iteration, class creation, and data collections.',
  duration: 26 * 60,
  access: 'open' as const,
  questions: items.map(([codes, prompt, options, answer], index) => ({
    id: `q${index + 1}`,
    topics: codes.map(csaTopicLabel),
    prompt,
    options,
    correct: [answer],
    select: 1,
    passage: null,
  })),
}


// Unit labels used by the sample before questions were tagged with individual skills.
const legacyUnits = [0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3]
export const legacyCsaQuestions = new Map(csaSample.questions.map((question, index) => [
  question.prompt, { ...question, unit: csaUnits[legacyUnits[index]] },
]))
