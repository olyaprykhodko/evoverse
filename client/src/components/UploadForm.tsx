import { RefObject } from 'react';
import { Progress } from '../api/getUploadStatus';

interface UploadFormProps {
  uploading: boolean;
  inputRef: RefObject<HTMLInputElement> | null;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  progress: Progress | null;
  progressValue: number;
  formatSize: (bytes: number) => string;
}

export default function UploadForm({
  uploading,
  inputRef,
  handleUpload,
  progress,
  progressValue,
  formatSize,
}: UploadFormProps) {
  return (
    <>
      <div
        onClick={() => !uploading && inputRef?.current?.click()}
        className={`
          relative border-2 border-dashed rounded-md p-6 mb-6 text-center cursor-pointer
          transition-all duration-200 bg-hazel-200
          ${
            uploading
              ? 'border-[#30363d] opacity-70 cursor-not-allowed'
              : 'border-background-600 hover:border-background-600 hover:bg-hazel-300'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpeg,.jpg,.txt,.json"
          onChange={handleUpload}
          disabled={uploading}
        />

        {uploading && progress ? (
          <div className="space-y-3">
            <p className="text-[#58a6ff] text-sm">Завантаження...</p>
            <div className="w-full bg-[#21262d] rounded h-2">
              <div
                className="bg-[#238636] h-2 rounded transition-all duration-300"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <p className="text-[#8b949e] text-xs">
              {formatSize(progress.received)} / {formatSize(progress.total)} ·{' '}
              {progressValue}%
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              className="mt-2 px-4 py-1.5 bg-moss-300 border border-background-600 rounded text-stack-800 text-sm font-medium hover:bg-moss-400  hover:border-background-700 transition"
              disabled={uploading}
            >
              Завантажити файл
            </button>

            <p className="text-stack-800 text-xs">
              pdf · png · jpeg · txt · json
            </p>
          </div>
        )}
      </div>
    </>
  );
}
