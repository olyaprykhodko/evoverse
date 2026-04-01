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
        className="text-xs px-3 py-1 border border-[#30363d] rounded bg-transparent text-[#f85149] hover:bg-[#21262d] hover:border-[#da3633] transition"
      >
        Очистити сховище
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-[#c9d1d9] font-semibold text-base mb-2">
              Підтвердити видалення
            </h2>
            <p className="text-[#8b949e] text-sm mb-6">
              Усі файли будуть видалені назавжди. Цю дію не можна скасувати.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-4 py-1.5 border border-[#30363d] rounded bg-transparent text-[#c9d1d9] hover:bg-[#21262d] transition"
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                className="text-sm px-4 py-1.5 border border-[#da3633] rounded bg-transparent text-[#f85149] hover:bg-[#21262d] transition"
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
