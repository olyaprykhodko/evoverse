import { useState } from 'react';

interface ClearButtonProps {
  onConfirm: () => void;
}

export default function ClearButton({ onConfirm }: ClearButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium px-3 py-1 border border-background-600 rounded bg-transparent text-warning-600 hover:text-red-500 hover:border-warning-400 transition"
      >
        Очистити сховище
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white border border-[#30363d] rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-background-700 font-semibold text-base mb-2">
              Очистити сховище
            </h2>
            <p className="text-background-600 text-sm mb-6">
              Усі файли будуть видалені назавжди
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-4 py-1.5 border border-[#30363d] rounded bg-transparent text-background-500 hover:text-background-800 transition"
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                className="text-sm font-medium px-3 py-1 border border-warning-600 rounded bg-transparent text-red-700 hover:text-warning-50 hover:bg-red-700 transition"
              >
                Видалити все
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
