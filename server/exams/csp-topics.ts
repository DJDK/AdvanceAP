export const cspBigIdeas = [
  'Creative Development',
  'Data',
  'Algorithms and Programming',
  'Computer Systems and Networks',
  'Impact of Computing',
]

const topicNames = [
  ['Collaboration', 'Program Function and Purpose', 'Program Design and Development', 'Identifying and Correcting Errors'],
  ['Binary Numbers', 'Data Compression', 'Extracting Information from Data', 'Using Programs with Data'],
  [
    'Variables and Assignments', 'Data Abstraction', 'Mathematical Expressions', 'Strings',
    'Boolean Expressions', 'Conditionals', 'Nested Conditionals', 'Iteration',
    'Developing Algorithms', 'Lists', 'Binary Search', 'Calling Procedures', 'Developing Procedures',
    'Libraries', 'Random Values', 'Simulations', 'Algorithmic Efficiency', 'Undecidable Problems',
  ],
  ['The Internet', 'Fault Tolerance', 'Parallel and Distributed Computing'],
  ['Beneficial and Harmful Effects', 'Digital Divide', 'Computing Bias', 'Crowdsourcing', 'Legal and Ethical Concerns', 'Safe Computing'],
]

export const cspTopics = new Map(topicNames.flatMap((names, idea) => names.map((name, index) => {
  const code = `${idea + 1}.${index + 1}`
  return [`${code} ${name}`, { code, name, bigIdea: cspBigIdeas[idea] }]
})))

export function cspTopicLabel(code: string) {
  const label = [...cspTopics].find(([, topic]) => topic.code === code)?.[0]
  if (!label) throw new Error(`Unknown AP CSP topic ${code}`)
  return label
}
