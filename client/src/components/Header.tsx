export default function Header() {
  return (
    <header className="mb-8 border-b border-[#21262d] pb-4">
      <h1 className="text-2xl font-semibold tracking-tight ">
        <span className="text-primary-500">File</span>
        <span className="text-primary-700">Storage</span>
      </h1>
      <p className="text-background-700 text-m mt-1">
        Cховище файлів з лімітом до 3 MB
      </p>
    </header>
  );
}
