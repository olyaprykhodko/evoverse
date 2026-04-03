import { useState, useEffect, useRef } from 'react';
import fetchFiles, { AppFile, StorageInfo } from './api/fetchFiles';
import handleUploadFile from './api/handleUploadFile';
import handleDeleteFile from './api/handleDeleteFile';
import handleView from './utils/handleView';
import formatSize from './utils/formatSize';
import formatDate from './utils/formatDate';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchFiles(setFiles, setError, api, setStorageInfo);
  }, []);

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
              fileInputRef,
              api,
              () => fetchFiles(setFiles, setError, api, setStorageInfo),
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
