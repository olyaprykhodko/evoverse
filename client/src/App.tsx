import { useState, useEffect, useRef, useCallback } from 'react';
import fetchFiles, { AppFile, StorageInfo, Auth } from './api/fetchFiles';
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
import AuthForm from './components/AuthForm';
import UserInfo from './components/UserInfo';
import { SafeUser } from './api/userApi';
import getUploadStatus from './api/getUploadStatus';
import { translateMessage } from './utils/translateMessage';

const api = process.env.REACT_APP_API_URL || 'http://localhost:3500';

export default function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshFiles = useCallback(() => {
    if (!auth) return;
    fetchFiles(auth, setFiles, setError, api, setStorageInfo);
  }, [auth]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    if (!uploadingFileId || !auth) return;

    pollRef.current = setInterval(async () => {
      const status = await getUploadStatus(uploadingFileId, auth, api);
      if (!status) return;

      if (status.status === 'done') {
        if (pollRef.current) clearInterval(pollRef.current);
        setUploadingFileId(null);
        setUploading(false);
        setUploadProgress(0);
        setSuccess('Файл успішно завантажено!');
        refreshFiles();
      } else if (status.status === 'error') {
        if (pollRef.current) clearInterval(pollRef.current);
        setUploadingFileId(null);
        setUploading(false);
        setUploadProgress(0);
        setError(translateMessage(status.error ?? 'Помилка обробки файлу'));
      }
    }, 500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [uploadingFileId, auth, refreshFiles]);

  const handleLogout = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setAuth(null);
    setUser(null);
    setFiles([]);
    setStorageInfo(null);
    setUploadingFileId(null);
    setError(null);
    setSuccess(null);
  };

  if (!auth || !user) {
    return (
      <AuthForm
        api={api}
        onAuth={(a, u) => {
          setAuth(a);
          setUser(u);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans p-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Header />

        <UserInfo user={user} auth={auth} api={api} onLogout={handleLogout} />

        <UploadForm
          uploading={uploading}
          progress={uploadProgress}
          inputRef={fileInputRef as any}
          handleUpload={(e) =>
            handleUploadFile(
              e,
              auth,
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
          storageInfo={storageInfo}
          api={api}
          auth={auth}
          handleView={(id) => handleView(api, id, auth)}
          handleDelete={(id) =>
            handleDeleteFile(id, auth, setError, setSuccess, refreshFiles, api)
          }
          formatSize={formatSize}
          formatDate={formatDate}
          refreshFiles={refreshFiles}
        />

        {files.length > 0 && (
          <div className="flex justify-end mt-4">
            <ClearButton
              onConfirm={() =>
                handleDeleteAllFiles(
                  auth,
                  setError,
                  setSuccess,
                  setFiles,
                  refreshFiles,
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
