// Update BASE_URL to your machine's IP when running on a physical device
// e.g. 'http://192.168.1.100:3001/api'
const BASE_URL = 'http://localhost:3001/api';

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(BASE_URL + path, {
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Notes
  getNotes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notes${qs ? '?' + qs : ''}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleComplete: (id) => request(`/notes/${id}/complete`, { method: 'PATCH' }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () => request('/tags'),
  createTag: (data) => request('/tags', { method: 'POST', body: JSON.stringify(data) }),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),

  // Attachments
  uploadAttachment: (noteId, file) => {
    const fd = new FormData();
    fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType });
    return request(`/attachments/${noteId}`, { method: 'POST', body: fd });
  },
  deleteAttachment: (id) => request(`/attachments/${id}`, { method: 'DELETE' }),
  getFileUrl: (filename) => BASE_URL.replace('/api', '') + '/uploads/' + filename,
};
