const translations: Record<string, string> = {
  'Invalid file name': "Недійсне ім'я файлу",
  'Invalid file format. Please choose .pdf, .png, .jpeg, .txt, or .json extension':
    'Недійсний формат. Оберіть .pdf, .png, .jpeg, .gif, .webp, .txt, .csv, .json, .mp3, .mp4 або .zip',
  'Invalid file size': 'Недійсний розмір файлу',
  'Insufficient storage': 'Недостатньо місця у сховищі',
  'Storage limit exceeded': 'Перевищено ліміт сховища',
  'File with this name already exists': "Файл з таким ім'ям вже існує",
  'File exceeds storage size': 'Файл перевищує розмір сховища',
  'File content does not match declared type':
    'Вміст файлу не відповідає вказаному типу',
  'Upload failed': 'Помилка завантаження',
  'File successfully uploaded': 'Файл успішно завантажено',
  'Loading file': 'Завантаження файлу',
  'File does not exist': 'Файл не існує',
  'Failed to delete': 'Не вдалось видалити файл',
  'File successfully deleted': 'Файл успішно видалено',
  'Storage cleared': 'Сховище очищено',
  'Files list retreived': 'Список файлів отримано',
  'Storage limit updated': 'Ліміт сховища оновлено',
};

export function translateMessage(msg: string | undefined | null): string {
  if (!msg) return 'Невідома помилка';

  if (translations[msg]) return translations[msg];

  // Pattern: "File type .ext is not allowed"
  if (msg.startsWith('File type .')) {
    return `Формат файлу не підтримується`;
  }

  if (msg.startsWith('File content does not match')) {
    return 'Вміст файлу не відповідає вказаному типу';
  }

  return msg;
}
