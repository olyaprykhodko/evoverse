const translations: Record<string, string> = {
  'Invalid file name': "Недійсне ім'я файлу",
  'Invalid file format. Please choose .pdf, .png, .jpeg, .txt, or .json extension':
    'Недійсний формат. Оберіть .pdf, .png, .jpeg, .txt або .json',
  'Invalid file size': 'Недійсний розмір файлу',
  'Insufficient storage': 'Недостатньо місця у сховищі',
  'File with this name already exists': "Файл з таким ім'ям вже існує",
  'File exceeds storage size': 'Файл перевищує розмір сховища',
  'Upload failed': 'Помилка завантаження',
  'File successfully uploaded': 'Файл успішно завантажено',
  'Loading file': 'Завантаження файлу',
  'File does not exist': 'Файл не існує',
  'Failed to delete': 'Не вдалось видалити файл',
  'File successfully deleted': 'Файл успішно видалено',
  'Storage cleared': 'Сховище очищено',
  'Files list retreived': 'Список файлів отримано',
};

export function translateMessage(msg: string | undefined | null): string {
  if (!msg) return 'Невідома помилка';

  if (translations[msg]) return translations[msg];

  if (msg.startsWith('File type does not match declared format')) {
    return 'Тип файлу не відповідає дозволеному формату';
  }

  return msg;
}
