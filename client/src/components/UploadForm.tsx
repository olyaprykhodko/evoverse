import { RefObject } from 'react';

interface UploadFormProps {
  uploading: boolean;
  progress: number;
  inputRef: RefObject<HTMLInputElement> | null;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadForm({
  uploading,
  progress,
  inputRef,
  handleUpload,
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
          accept=".pdf,.png,.jpeg,.jpg,.gif,.webp,.txt,.csv,.json,.mp3,.mp4,.zip"
          onChange={handleUpload}
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-2">
            <p className="text-[#58a6ff] text-sm">
              Завантаження... {progress}%
            </p>
            <div className="w-full h-2 rounded bg-gray-300 overflow-hidden">
              <div
                className="h-full rounded bg-[#58a6ff] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
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
              pdf · png · jpeg · gif · webp · txt · csv · json · mp3 · mp4 · zip
            </p>
          </div>
        )}
      </div>
    </>
  );
}
