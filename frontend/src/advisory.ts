export function cleanAdvisoryText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/__/g, '')
        .replace(/^(jambo|hello|hi|dear farmer)[,!.\s]+/i, '')
        .replace(/^\s*(\d+)\)\s+/, '$1. '),
    )
    .filter((line, index, lines) => {
      if (/^here (is|are)\b/i.test(line)) return false
      return line !== '' || lines[index - 1] !== ''
    })
    .join('\n')
    .trim()
}

export function parseAdvisorySections(value: string) {
  const cleaned = cleanAdvisoryText(value)
  const fallback = [{ title: 'Advisory', number: '1', label: 'Advisory', body: cleaned }]
  const matches = [...cleaned.matchAll(/(?:^|\n)(\d\.\s+[^\n]+)\n?/g)]

  if (!matches.length) return fallback

  const sections = matches.map((match, index) => {
    const start = (match.index ?? 0) + (match[0].startsWith('\n') ? 1 : 0)
    const bodyStart = start + match[1].length
    const nextStart = matches[index + 1]?.index ?? cleaned.length
    return {
      title: match[1],
      number: match[1].match(/^(\d+)\./)?.[1] ?? String(index + 1),
      label: match[1].replace(/^\d+\.\s*/, ''),
      body: cleaned.slice(bodyStart, nextStart).trim(),
    }
  })

  return sections.length ? sections : fallback
}
