import { SkillCheck } from './profile.jsx'

function accuracy(topic) {
  return topic.correct / (topic.correct + topic.incorrect)
}

export function TopicFeedback({ topics, incomplete }) {
  const priorities = topics.filter(topic => topic.incorrect > 0)
    .sort((a, b) => accuracy(a) - accuracy(b) || b.incorrect - a.incorrect)
  const checked = topics.filter(topic => topic.mastered).length
  const completed = topics.some(topic => topic.correct > 0 || topic.incorrect > 0)

  return (
    <section className="topic-feedback" aria-labelledby="topic-feedback-heading">
      <h2 id="topic-feedback-heading">Where to focus next</h2>
      {checked > 0 && <p className="skill-status"><SkillCheck label="All correct" /> {checked} {checked === 1 ? 'skill' : 'skills'} with every question correct</p>}
      {priorities.length > 0 ? (
        <>
          <p>Start with the topics where you answered the lowest share of questions correctly.</p>
          <ul className="topic-priorities">
            {priorities.slice(0, 3).map(topic => (
              <li key={topic.topicId ?? topic.code ?? topic.name}>
                <div>
                  <strong>{topic.code && `${topic.code} `}{topic.name}</strong>
                  {topic.bigIdea && <span>{topic.bigIdea}</span>}
                </div>
                <span>{topic.correct} of {topic.correct + topic.incorrect} answered correctly</span>
              </li>
            ))}
          </ul>
          {topics.some(topic => topic.correct + topic.incorrect + topic.incomplete === 1)
            && <p className="note">Some topics had only one question. Use these results to choose what to practice next.</p>}
        </>
      ) : incomplete > 0
        ? <p>{completed ? 'You answered every completed question correctly.' : 'Complete some questions to get topic recommendations.'} Check the breakdown for incomplete questions.</p>
        : <p>You answered every question correctly on this attempt.</p>}
      {incomplete > 0 && <p className="note">{incomplete} {incomplete === 1 ? 'question was' : 'questions were'} unanswered or incomplete. They count toward the raw score and are shown separately here.</p>}
      <details className="topic-breakdown">
        <summary>View all tested topics</summary>
        <ul className="topic-priorities">
          {topics.map(topic => (
            <li key={topic.topicId ?? topic.code ?? topic.name}>
              <div><strong>{topic.code && `${topic.code} `}{topic.name}</strong>
                {topic.bigIdea && <span>{topic.bigIdea}</span>}</div>
              <span className="skill-status">
                {topic.mastered && <SkillCheck />}
                {topic.correct} correct · {topic.incorrect} missed{topic.incomplete > 0 && ` · ${topic.incomplete} incomplete`}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
