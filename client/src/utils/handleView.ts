export default function handleView(api: string, id: string) {
  window.open(`${api}/files/${id}`, '_blank');
}
