// shared/src/utils/date.ts
export function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function unixToISO(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

export function formatDate(unix: number, format: string = 'YYYY-MM-DD', timezone: string = 'Asia/Seoul'): string {
  const date = new Date(unix * 1000);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  };
  if (format === 'YYYY-MM-DD HH:mm') {
    options.hour = '2-digit'; options.minute = '2-digit'; options.hour12 = false;
  }
  const formatter = new Intl.DateTimeFormat('ko-KR', options);
  const parts = formatter.formatToParts(date);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value || '';
  if (format === 'YYYY-MM-DD') return `${get('year')}-${get('month')}-${get('day')}`;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

export function timeAgo(unix: number): string {
  const seconds = Math.floor(Date.now() / 1000) - unix;
  const intervals = [
    { label: '년', seconds: 31536000 }, { label: '개월', seconds: 2592000 },
    { label: '주', seconds: 604800 }, { label: '일', seconds: 86400 },
    { label: '시간', seconds: 3600 }, { label: '분', seconds: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count >= 1) return `${count}${i.label} 전`;
  }
  return '방금 전';
}
