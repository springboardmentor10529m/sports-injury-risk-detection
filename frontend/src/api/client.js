const BASE_URL = 'http://localhost:8000';

const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  baseUrl: BASE_URL,
  
  async get(path) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'An error occurred');
    }
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'An error occurred');
    }
    return res.json();
  },

  async put(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'An error occurred');
    }
    return res.json();
  },

  async delete(path) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'An error occurred');
    }
    return res.json();
  },

  async uploadVideo(formData, onProgress) {
    const token = localStorage.getItem('token');
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/api/videos/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || 'Upload failed'));
          } catch (e) {
            reject(new Error('Upload failed'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }
};
