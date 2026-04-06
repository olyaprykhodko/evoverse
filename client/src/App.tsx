import { useState, useEffect, useRef, useCallback } from 'react';
import fetchFiles, { AppFile, StorageInfo } from './api/fetchFiles';
import handleUploadFile from './api/handleUploadFile';
import handleDeleteFile from './api/handleDeleteFile';
import handleView from './utils/handleView';
import formatSize from './utils/formatSize';
import formatDate from './utils/formatDate';
import getUploadStatus from './api/getUploadStatus';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import Message from './components/Message';
import FilesList from './components/FilesList';
import ClearButton from './components/ClearButton';
import handleDeleteAllFiles from './api/handleDeleteAllFiles';

const api = process.env.REACT_APP_API_URL || 'http://localhost:3500';

export default function App() {
  const [files, setFiles] = useState<AppFile[] | []>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshFiles = useCallback(() => {
    fetchFiles(setFiles, setError, api, setStorageInfo);
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    if (!uploadingFileId) return;

    pollRef.current = setInterval(async () => {
      try {
        const status = await getUploadStatus(api, uploadingFileId);
        if (status.status === 'done') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setUploadingFileId(null);
          setUploading(false);
          setUploadProgress(0);
          setSuccess('Файл успішно завантажено!');
          refreshFiles();
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else if (status.status === 'error') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setUploadingFileId(null);
          setUploading(false);
          setUploadProgress(0);
          setError('Помилка при обробці файлу на сервері');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setUploadingFileId(null);
        setUploading(false);
        setUploadProgress(0);
      }
    }, 300);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [uploadingFileId, refreshFiles]);

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans p-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Header />

        <UploadForm
          uploading={uploading}
          progress={uploadProgress}
          inputRef={fileInputRef as any}
          handleUpload={(e) =>
            handleUploadFile(
              e,
              setError,
              setSuccess,
              setUploading,
              fileInputRef,
              api,
              refreshFiles,
              setUploadProgress,
              setUploadingFileId,
            )
          }
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
          storageInfo={storageInfo}
          setStorageInfo={setStorageInfo}
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
