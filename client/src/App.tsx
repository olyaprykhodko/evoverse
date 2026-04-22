import { useState, useEffect, useRef, useCallback } from 'react';

import { StorageInfo, AppFile } from './types/files';
import { Auth, SafeUser } from './types/users';
import {
  fetchFiles,
  handleUploadFile,
  getUploadStatus,
  handleDeleteFile,
  handleDeleteAllFiles,
} from './api/files-api';

import handleView from './utils/handleView';
import formatSize from './utils/formatSize';
import formatDate from './utils/formatDate';

import Header from './components/Header';
import UploadForm from './components/UploadForm';
import Message from './components/Message';
import FilesList from './components/FilesList';
import ClearButton from './components/ClearButton';
import AuthForm from './components/AuthForm';
import UserInfo from './components/UserInfo';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';

import { translateMessage } from './utils/translateMessage';

const api = process.env.REACT_APP_API_URL ?? 'http://localhost:3100';

export default function App() {
  const [auth, setAuth] = useState<Auth | null>(() => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [user, setUser] = useState<SafeUser | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [files, setFiles] = useState<AppFile[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminView, setAdminView] = useState(false);
  const [profileView, setProfileView] = useState(false);
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
    localStorage.removeItem('auth');
    localStorage.removeItem('user');
    setFiles([]);
    setStorageInfo(null);
    setUploadingFileId(null);
    setError(null);
    setSuccess(null);
    setAdminView(false);
    setProfileView(false);
  };

  const handleUserUpdate = (updated: SafeUser, updatedAuth: Auth) => {
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    if (updatedAuth !== auth) {
      setAuth(updatedAuth);
      localStorage.setItem('auth', JSON.stringify(updatedAuth));
    }
  };

  if (!auth || !user) {
    return (
      <AuthForm
        api={api}
        onAuth={(a, u) => {
          setAuth(a);
          setUser(u);
          localStorage.setItem('auth', JSON.stringify(a));
          localStorage.setItem('user', JSON.stringify(u));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans p-0">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Header />

        <UserInfo
          user={user}
          auth={auth}
          api={api}
          blocked={user.blocked}
          onLogout={handleLogout}
          adminView={adminView}
          onToggleAdmin={() => {
            setAdminView(!adminView);
            setProfileView(false);
          }}
          profileView={profileView}
          onToggleProfile={() => {
            setProfileView(!profileView);
            setAdminView(false);
          }}
        />

        {adminView && user.role === 'admin' ? (
          <AdminPanel auth={auth} api={api} />
        ) : profileView ? (
          <UserProfile
            user={user}
            auth={auth}
            api={api}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
          />
        ) : user.blocked ? (
          <div className="text-center py-16 border border-warning-600 rounded-md bg-red-50">
            <p className="text-warning-600 font-semibold text-lg mb-2">
              Акаунт заблоковано
            </p>
            <p className="text-background-700 text-sm">
              Зверніться до підтримки: admin@filestorage.com.
            </p>
          </div>
        ) : (
          <>
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
              <Message
                event="success"
                message={success}
                setStatus={setSuccess}
              />
            )}

            <FilesList
              files={files}
              storageInfo={storageInfo}
              api={api}
              auth={auth}
              handleView={(id) => handleView(api, id, auth)}
              handleDelete={(id) =>
                handleDeleteFile(
                  id,
                  auth,
                  setError,
                  setSuccess,
                  refreshFiles,
                  api,
                )
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
          </>
        )}
      </div>
    </div>
  );
}
