import { useState, useEffect } from 'react';
import { Card as AntCard, Button as AntButton, Modal, Form, Input } from 'antd';
import apiClient from '../api/apiClient';
import Layout from '../components/layout/Layout';

interface UnitMeasure {
  id?: number;
  denominacion: string;
}

const UnitMeasurePage = () => {
  const [unitMeasures, setUnitMeasures] = useState<UnitMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Cargar unidades de medida
  const fetchUnitMeasures = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/unidadmedida');
      setUnitMeasures(response.data);
    } catch (error) {
      console.error('Error al cargar unidades de medida:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitMeasures();
  }, []);

  // Manejar creación/edición de unidad de medida
  const handleSubmit = async (values: UnitMeasure) => {
    try {
      if (editingId) {
        await apiClient.put(`/unidadmedida/${editingId}`, values);
      } else {
        await apiClient.post('/unidadmedida', values);
      }
      fetchUnitMeasures();
      setModalVisible(false);
      form.resetFields();
      setEditingId(null);
    } catch (error) {
      console.error('Error al guardar unidad de medida:', error);
    }
  };

  // Eliminar unidad de medida
  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/unidadmedida/${id}`);
      fetchUnitMeasures();
    } catch (error) {
      console.error('Error al eliminar unidad de medida:', error);
    }
  };

  // Editar unidad de medida
  const handleEdit = (unit: UnitMeasure) => {
    form.setFieldsValue(unit);
    setEditingId(unit.id || null);
    setModalVisible(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Unidades de Medida</h1>
          <AntButton
            type="primary"
            className="bg-green-600"
            onClick={() => {
              form.resetFields();
              setEditingId(null);
              setModalVisible(true);
            }}
          >
            Nueva Unidad de Medida
          </AntButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p>Cargando...</p>
          ) : unitMeasures.length === 0 ? (
            <p>No hay unidades de medida disponibles.</p>
          ) : (
            unitMeasures.map((unit) => (
              <AntCard key={unit.id} className="shadow-md">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{unit.denominacion}</h3>
                  <div className="space-x-2">
                    <AntButton 
                      onClick={() => handleEdit(unit)}
                      type="default"
                    >
                      Editar
                    </AntButton>
                    <AntButton 
                      danger
                      onClick={() => handleDelete(unit.id!)}
                    >
                      Eliminar
                    </AntButton>
                  </div>
                </div>
              </AntCard>
            ))
          )}
        </div>

        <Modal
          title={editingId ? "Editar Unidad de Medida" : "Nueva Unidad de Medida"}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="denominacion"
              label="Nombre"
              rules={[{ required: true, message: 'Por favor ingresa un nombre' }]}
            >
              <Input placeholder="Ejemplo: Kilogramos, Litros, etc." />
            </Form.Item>

            <div className="flex justify-end space-x-2">
              <AntButton onClick={() => setModalVisible(false)}>
                Cancelar
              </AntButton>
              <AntButton type="primary" htmlType="submit" className="bg-blue-600">
                Guardar
              </AntButton>
            </div>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
};

export default UnitMeasurePage;
