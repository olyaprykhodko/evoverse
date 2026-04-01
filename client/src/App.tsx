import { useState, useEffect, useRef } from 'react';
import fetchFiles, { AppFile } from './api/fetchFiles';
import handleUploadFile from './api/handleUploadFile';
import handleDeleteFile from './api/handleDeleteFile';
import handleView from './utils/handleView';
import { Progress } from './api/getUploadStatus';
import getUploadStatus from './api/getUploadStatus';
import formatSize from './utils/formatSize';
import formatDate from './utils/formatDate';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import Message from './components/Message';
import FilesList from './components/FilesList';
import ClearButton from './components/ClearButton';
import handleDeleteAllFiles from './api/handleDeleteAllFiles';

const api = process.env.API_URL || 'http://localhost:3500';

export default function App() {
  const [files, setFiles] = useState<AppFile[] | []>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<NodeJS.Timeout | null>(null);

  const pollStatus = async (id: string, total: number) => {
    getUploadStatus(
      id,
      total,
      uploadRef,
      setProgress,
      setUploading,
      setSuccess,
      setError,
      setFiles,
      (setFiles, setError) => fetchFiles(setFiles, setError, api),
      api,
    );
  };

  useEffect(() => {
    fetchFiles(setFiles, setError, api);
  }, []);

  const progressValue = progress
    ? Math.min(100, Math.round((progress.received / progress.total) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans p-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Header />

        <UploadForm
          uploading={uploading}
          inputRef={fileInputRef as any}
          handleUpload={(e) =>
            handleUploadFile(
              e,
              setError,
              setSuccess,
              setUploading,
              pollStatus,
              fileInputRef,
              api,
            )
          }
          progress={progress}
          progressValue={progressValue}
          formatSize={formatSize}
        />

        {error && (
          <Message event="error" message={error} setStatus={setError} />
        )}

        {success && (
          <Message event="success" message={success} setStatus={setSuccess} />
        )}

        <FilesList
          files={files}
          setFiles={setFiles}
          setError={setError}
          api={api}
          handleView={(id) => handleView(api, id)}
          handleDelete={(id) =>
            handleDeleteFile(
              id,
              setError,
              setSuccess,
              setFiles,
              (setFiles, setError) => fetchFiles(setFiles, setError, api),
              api,
            )
          }
          formatSize={formatSize}
          formatDate={formatDate}
          fetchFiles={fetchFiles}
        />

        {files.length > 0 && (
          <div className="flex justify-end mt-4">
            <ClearButton
              onConfirm={() =>
                handleDeleteAllFiles(
                  setError,
                  setSuccess,
                  setFiles,
                  fetchFiles,
                  api,
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
