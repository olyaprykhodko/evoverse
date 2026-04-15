export default function formatDate(date: string) {
  if (!date) return '—';
  return new Date(date).toLocaleString('uk-UA');
}
