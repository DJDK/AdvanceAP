export const csaUnits = [
  'Using Objects and Methods',
  'Selection and Iteration',
  'Class Creation',
  'Data Collections',
]

const unitTopics = [
  [
    'Introduction to Algorithms, Programming, and Compilers', 'Variables and Data Types',
    'Expressions and Output', 'Assignment Statements and Input', 'Casting and Range of Variables',
    'Compound Assignment Operators', 'Application Program Interface (API) and Libraries',
    'Documentation with Comments', 'Method Signatures', 'Calling Class Methods', 'Math Class',
    'Objects: Instances of Classes', 'Object Creation and Storage (Instantiation)',
    'Calling Instance Methods', 'String Manipulation',
  ],
  [
    'Algorithms with Selection and Repetition', 'Boolean Expressions', 'if Statements',
    'Nested if Statements', 'Compound Boolean Expressions', 'Comparing Boolean Expressions',
    'while Loops', 'for Loops', 'Implementing Selection and Iteration Algorithms',
    'Implementing String Algorithms', 'Nested Iteration', 'Informal Run-Time Analysis',
  ],
  [
    'Abstraction and Program Design', 'Impact of Program Design', 'Anatomy of a Class', 'Constructors',
    'Methods: How to Write Them', 'Methods: Passing and Returning References of an Object',
    'Class Variables and Methods', 'Scope and Access', 'this Keyword',
  ],
  [
    'Ethical and Social Issues Around Data Collection', 'Introduction to Using Data Sets',
    'Array Creation and Access', 'Array Traversals', 'Implementing Array Algorithms', 'Using Text Files',
    'Wrapper Classes', 'ArrayList Methods', 'ArrayList Traversals', 'Implementing ArrayList Algorithms',
    '2D Array Creation and Access', '2D Array Traversals', 'Implementing 2D Array Algorithms',
    'Searching Algorithms', 'Sorting Algorithms', 'Recursion', 'Recursive Searching and Sorting',
  ],
]

const byCode = new Map(unitTopics.flatMap((topics, unit) => topics.map((name, index) => {
  const code = `${unit + 1}.${index + 1}`
  return [code, { code, name, bigIdea: csaUnits[unit] }]
})))

export const csaTopics = new Map([...byCode].map(([code, topic]) => [`${code} ${topic.name}`, topic]))

export function csaTopicLabel(code: string) {
  const topic = byCode.get(code)
  if (!topic) throw new Error(`Unknown AP CSA topic ${code}`)
  return `${code} ${topic.name}`
}
