const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(isoString: string | null): string {
  if (!isoString) {
    return '暂无记录'
  }

  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return '时间格式异常'
  }

  return dateTimeFormatter.format(date)
}
