import apiClient from './apiClient';
import { Customer } from '../types/customer';

export const fetchCustomers = async (): Promise<Customer[]> => {
  const response = await apiClient.get('/clientes');
  return response.data;
};
