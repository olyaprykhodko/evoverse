interface MessageProps {
  event: 'error' | 'success';
  message: string;
  setStatus: (status: null) => void;
}

export default function Message({ event, message, setStatus }: MessageProps) {
  return (
    <div
      className={`mb-4 px-4 py-3 border rounded-md text-sm flex items-center justify-between ${
        event === 'error'
          ? ' border-warning-50 bg-warning-600 text-warning-50'
          : ' bg-moss-300 border border-background-600 rounded text-stack-800 text-sm font-medium hover:bg-moss-400  hover:border-background-700 transition'
      }`}
    >
      <span className="flex items-center gap-2">
        {event === 'error' ? '' : '✔️'} {message}
      </span>
      <button
        onClick={() => setStatus(null)}
        className="ml-4 text-gray-600 px-2 py-1 rounded transition"
        aria-label="Закрити"
      >
        ×
      </button>
    </div>
  );
}
