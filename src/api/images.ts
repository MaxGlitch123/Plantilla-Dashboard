// src/api/images.ts

import apiClient from './apiClient';

export const uploadProductImage = async (
  entityId: number,
  file: File,
  entityType: 'manufacturado' | 'insumo'
): Promise<void> => {
  const formData = new FormData();
  formData.append('entityId', entityId.toString());
  formData.append('entityType', entityType); // 👈 ahora es dinámico
  formData.append('file', file);

  await apiClient.post('/images/uploadToEntity', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const fetchImagesByEntity = async (
  entityId: number,
  entityType: 'insumo' | 'manufacturado'
): Promise<{ id: number; name: string; url: string }[]> => {
  const res = await apiClient.get('/images/byEntity', {
    params: { entityId, entityType },
  });
  return res.data;
};

export const deleteImage = async (publicId: string, uuid: string) => {
  const form = new URLSearchParams();
  form.append('publicId', publicId);
  form.append('uuid', uuid);

  await apiClient.post('/images/deleteImg', form, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};
